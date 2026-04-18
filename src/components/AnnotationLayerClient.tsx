import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { TextAnnotator, User as RecogitoUser, W3CAnnotation } from '@recogito/text-annotator';
import '@recogito/text-annotator/text-annotator.css';
import {
  createPageAnnotation,
  deletePageAnnotation,
  fetchPageAnnotations,
  getAnnotationBodyText,
  getTargetQuote,
  toW3CAnnotation,
  type StoredAnnotation,
  updatePageAnnotation,
} from '../lib/annotations';
import { supabase } from '../lib/supabase';

type Props = {
  pageSlug: string;
};

type ViewerProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

const formatTimestamp = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function upsertAnnotation(items: StoredAnnotation[], nextItem: StoredAnnotation) {
  const nextItems = items.some((item) => item.id === nextItem.id)
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...items, nextItem];

  return nextItems.sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

async function loadViewerProfile(session: Session | null) {
  const user = session?.user;

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      data?.display_name ??
      user.user_metadata.full_name ??
      user.user_metadata.name ??
      user.email ??
      'Читатель',
    avatarUrl: data?.avatar_url ?? user.user_metadata.avatar_url ?? null,
    isAdmin: data?.is_admin ?? false,
  } satisfies ViewerProfile;
}

export default function AnnotationLayerClient({ pageSlug }: Props) {
  const annotatorRef = useRef<TextAnnotator<W3CAnnotation, W3CAnnotation> | null>(null);
  const annotationsRef = useRef<StoredAnnotation[]>([]);
  const draftRef = useRef<W3CAnnotation | null>(null);
  const viewerRef = useRef<ViewerProfile | null>(null);
  const metaRef = useRef<Record<string, { resolved: boolean }>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [annotations, setAnnotations] = useState<StoredAnnotation[]>([]);
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'view' | 'create' | 'edit'>('view');
  const [draftText, setDraftText] = useState('');
  const [annotatorReady, setAnnotatorReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [annotationsLoading, setAnnotationsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    annotationsRef.current = annotations;
    metaRef.current = Object.fromEntries(
      annotations.map((annotation) => [annotation.id, { resolved: annotation.resolved }]),
    );
    annotatorRef.current?.redraw();
  }, [annotations]);

  useEffect(() => {
    viewerRef.current = viewer;
  }, [viewer]);

  const clearDraft = useCallback((message?: string) => {
    const draft = draftRef.current;

    if (draft) {
      annotatorRef.current?.removeAnnotation(draft.id);
    }

    draftRef.current = null;
    setSelectedId(null);
    setEditorMode('view');
    setDraftText('');

    if (message) {
      setStatus(message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncViewer = async (session: Session | null) => {
      try {
        const nextViewer = await loadViewerProfile(session);

        if (cancelled) {
          return;
        }

        setViewer(nextViewer);

        if (!nextViewer) {
          clearDraft();
        }
      } catch (currentError) {
        if (!cancelled) {
          setError(currentError instanceof Error ? currentError.message : 'Не удалось получить профиль.');
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      void syncViewer(data.session ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthLoading(true);
      void syncViewer(session ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [clearDraft]);

  useEffect(() => {
    let cancelled = false;

    setAnnotationsLoading(true);
    setError(null);

    fetchPageAnnotations(pageSlug)
      .then((items) => {
        if (cancelled) {
          return;
        }

        setAnnotations(items);
      })
      .catch((currentError) => {
        if (!cancelled) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : 'Не удалось загрузить аннотации страницы.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAnnotationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pageSlug]);

  useEffect(() => {
    let cancelled = false;

    const initAnnotator = async () => {
      const container = document.getElementById('lore-content');

      if (!container) {
        setError('Не нашёл контейнер текста для аннотаций.');
        return;
      }

      const { createTextAnnotator, W3CTextFormat } = await import('@recogito/text-annotator');

      if (cancelled) {
        return;
      }

      const annotator = createTextAnnotator<W3CAnnotation, W3CAnnotation>(container, {
        adapter: W3CTextFormat(window.location.href),
        annotatingEnabled: false,
        selectionMode: 'shortest',
        userSelectAction: 'SELECT',
        style: (annotation, state) => {
          const current = metaRef.current[annotation.id];
          const isSelected = Boolean(state?.selected);

          if (current?.resolved) {
            return {
              fill: 'rgb(var(--accent-strong-rgb))',
              fillOpacity: isSelected ? 0.34 : 0.16,
              underlineColor: 'rgba(var(--accent-strong-rgb),0.85)',
              underlineOffset: 3,
              underlineThickness: isSelected ? 2 : 1,
            };
          }

          return {
            fill: 'rgb(var(--accent-rgb))',
            fillOpacity: isSelected ? 0.32 : 0.16,
            underlineColor: 'rgba(var(--accent-rgb),0.85)',
            underlineOffset: 3,
            underlineThickness: isSelected ? 2 : 1,
          };
        },
      });

      const handleCreateAnnotation = (annotation: W3CAnnotation) => {
        if (!viewerRef.current) {
          annotator.removeAnnotation(annotation.id);
          setStatus('Для нового комментария нужен вход через Google.');
          return;
        }

        const previousDraft = draftRef.current;

        if (previousDraft && previousDraft.id !== annotation.id) {
          annotator.removeAnnotation(previousDraft.id);
        }

        draftRef.current = annotation;
        setSelectedId(annotation.id);
        setEditorMode('create');
        setDraftText(getAnnotationBodyText(annotation));
        setError(null);
        setStatus('Фрагмент пойман. Теперь можно оставить комментарий.');

        window.requestAnimationFrame(() => {
          panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      };

      const handleSelectionChanged = (selected: W3CAnnotation[]) => {
        const nextSelected = selected[0];

        if (!nextSelected) {
          if (!draftRef.current) {
            setSelectedId(null);
            setEditorMode('view');
            setDraftText('');
          }

          return;
        }

        const currentDraft = draftRef.current;

        if (currentDraft && nextSelected.id !== currentDraft.id) {
          annotator.removeAnnotation(currentDraft.id);
          draftRef.current = null;
          setStatus('Черновик снят.');
        }

        const stored = annotationsRef.current.find((annotation) => annotation.id === nextSelected.id);

        setSelectedId(nextSelected.id);

        if (stored) {
          setEditorMode('view');
          setDraftText(stored.bodyText);
          setError(null);
        } else if (draftRef.current?.id === nextSelected.id) {
          setEditorMode('create');
        }
      };

      annotator.on('createAnnotation', handleCreateAnnotation);
      annotator.on('selectionChanged', handleSelectionChanged);

      annotatorRef.current = annotator;
      setAnnotatorReady(true);

      return () => {
        annotator.off('createAnnotation', handleCreateAnnotation);
        annotator.off('selectionChanged', handleSelectionChanged);
        annotator.destroy();
      };
    };

    let destroy: (() => void) | undefined;

    void initAnnotator().then((teardown) => {
      destroy = teardown;
    });

    return () => {
      cancelled = true;
      setAnnotatorReady(false);
      destroy?.();
      annotatorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!annotatorReady) {
      return;
    }

    const annotator = annotatorRef.current;

    if (!annotator) {
      return;
    }

    annotator.setAnnotations(annotations.map((annotation) => toW3CAnnotation(annotation)));
  }, [annotations, annotatorReady]);

  useEffect(() => {
    const annotator = annotatorRef.current;

    if (!annotator) {
      return;
    }

    const canAnnotate = Boolean(viewer) && !annotationsLoading;

    annotator.setAnnotatingEnabled(canAnnotate);

    if (viewer) {
      annotator.setUser({
        id: viewer.id,
        name: viewer.displayName,
        avatar: viewer.avatarUrl ?? undefined,
      } satisfies RecogitoUser);
    }
  }, [annotationsLoading, viewer]);

  useEffect(() => {
    const annotator = annotatorRef.current;

    if (!annotator) {
      return;
    }

    const hasDraft = draftRef.current?.id === selectedId;
    const hasStored = annotations.some((annotation) => annotation.id === selectedId);

    if (selectedId && (hasDraft || hasStored)) {
      annotator.setSelected(selectedId);
    } else if (!draftRef.current) {
      annotator.setSelected();
    }
  }, [annotations, selectedId]);

  useEffect(() => {
    if (editorMode === 'create' || editorMode === 'edit') {
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [editorMode]);

  const selectedAnnotation = useMemo(
    () => annotations.find((annotation) => annotation.id === selectedId) ?? null,
    [annotations, selectedId],
  );

  const draftAnnotation = draftRef.current?.id === selectedId ? draftRef.current : null;
  const activeQuote = draftAnnotation
    ? getTargetQuote(draftAnnotation.target)
    : selectedAnnotation?.quote ?? null;
  const canManageSelected =
    !!viewer &&
    !!selectedAnnotation &&
    (viewer.id === selectedAnnotation.authorId || viewer.isAdmin);

  const selectAnnotation = useCallback((annotationId: string) => {
    setSelectedId(annotationId);
    setEditorMode('view');
    setDraftText(annotationsRef.current.find((annotation) => annotation.id === annotationId)?.bodyText ?? '');
    annotatorRef.current?.setSelected(annotationId);
    annotatorRef.current?.scrollIntoView(annotationId);
  }, []);

  const handleStartEditing = useCallback(() => {
    if (!selectedAnnotation || !canManageSelected) {
      return;
    }

    setDraftText(selectedAnnotation.bodyText);
    setEditorMode('edit');
  }, [canManageSelected, selectedAnnotation]);

  const handleCancel = useCallback(() => {
    if (editorMode === 'create') {
      clearDraft('Черновик снят.');
      return;
    }

    setEditorMode('view');
    setDraftText(selectedAnnotation?.bodyText ?? '');
  }, [clearDraft, editorMode, selectedAnnotation]);

  const handleSave = useCallback(async () => {
    const bodyText = draftText.trim();

    if (!bodyText) {
      setError('Комментарий пустой.');
      return;
    }

    if (!viewer) {
      setError('Нужен вход через Google.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editorMode === 'create') {
        const draft = draftRef.current;

        if (!draft) {
          throw new Error('Черновик уже исчез.');
        }

        const created = await createPageAnnotation({
          id: draft.id,
          pageSlug,
          authorId: viewer.id,
          bodyText,
          target: draft.target,
          quote: getTargetQuote(draft.target),
        });

        setAnnotations((current) => upsertAnnotation(current, created));
        annotatorRef.current?.updateAnnotation(toW3CAnnotation(created));
        draftRef.current = null;
        setSelectedId(created.id);
        setEditorMode('view');
        setDraftText(created.bodyText);
        setStatus('Комментарий сохранён.');
        return;
      }

      if (editorMode === 'edit' && selectedAnnotation) {
        const updated = await updatePageAnnotation(selectedAnnotation.id, { bodyText });

        setAnnotations((current) => upsertAnnotation(current, updated));
        annotatorRef.current?.updateAnnotation(toW3CAnnotation(updated));
        setSelectedId(updated.id);
        setEditorMode('view');
        setDraftText(updated.bodyText);
        setStatus('Комментарий обновлён.');
      }
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : 'Не получилось сохранить комментарий.',
      );
    } finally {
      setSaving(false);
    }
  }, [draftText, editorMode, pageSlug, selectedAnnotation, viewer]);

  const handleDelete = useCallback(async () => {
    if (!selectedAnnotation || !canManageSelected) {
      return;
    }

    if (!window.confirm('Удалить этот комментарий?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deletePageAnnotation(selectedAnnotation.id);
      annotatorRef.current?.removeAnnotation(selectedAnnotation.id);
      setAnnotations((current) => current.filter((annotation) => annotation.id !== selectedAnnotation.id));
      setSelectedId(null);
      setEditorMode('view');
      setDraftText('');
      setStatus('Комментарий удалён.');
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : 'Не получилось удалить комментарий.',
      );
    } finally {
      setSaving(false);
    }
  }, [canManageSelected, selectedAnnotation]);

  const handleToggleResolved = useCallback(async () => {
    if (!selectedAnnotation || !canManageSelected) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updatePageAnnotation(selectedAnnotation.id, {
        resolved: !selectedAnnotation.resolved,
      });

      setAnnotations((current) => upsertAnnotation(current, updated));
      annotatorRef.current?.updateAnnotation(toW3CAnnotation(updated));
      setStatus(updated.resolved ? 'Пометил как закрытое.' : 'Снова открыл комментарий.');
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : 'Не получилось обновить статус.',
      );
    } finally {
      setSaving(false);
    }
  }, [canManageSelected, selectedAnnotation]);

  return (
    <div ref={panelRef} className="space-y-4">
      <div className="surface-panel p-3">
        {(status || error) && (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              error
                ? 'border-[color:rgba(var(--accent-strong-rgb),0.28)] bg-[color:rgba(var(--accent-strong-rgb),0.12)] text-[color:rgb(var(--accent-strong-rgb))]'
                : 'border-[color:rgba(var(--line-rgb),0.12)] bg-[color:rgba(var(--panel-rgb),0.76)] text-[color:rgba(var(--muted-rgb),0.98)]'
            }`}
          >
            {error ?? status}
          </div>
        )}

        {activeQuote && (
          <blockquote className={`${status || error ? 'mt-3' : ''} border-l-2 border-[color:rgba(var(--accent-rgb),0.45)] pl-3 text-sm leading-6 text-[color:rgba(var(--text-rgb),0.84)]`}>
            {activeQuote}
          </blockquote>
        )}

        {editorMode === 'create' || editorMode === 'edit' ? (
          <div className={`${activeQuote || status || error ? 'mt-3' : ''}`}>
            <label
              htmlFor="annotation-comment"
              className="mb-2 block text-xs text-[color:rgba(var(--muted-rgb),0.96)]"
            >
              Комментарий
            </label>
            <textarea
              id="annotation-comment"
              ref={textareaRef}
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={6}
              className="w-full rounded-md border border-[color:rgba(var(--line-rgb),0.14)] bg-[color:rgba(var(--bg-soft-rgb),0.7)] px-4 py-3 text-sm leading-7 text-[color:rgb(var(--text-rgb))] outline-none focus:border-[color:rgba(var(--accent-rgb),0.34)]"
              placeholder="Что здесь уточнить, проверить или докрутить?"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={handleSave} className="button-primary" disabled={saving}>
                {saving ? 'Сохраняю...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="button-secondary"
                disabled={saving}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : selectedAnnotation ? (
          <div className={`${activeQuote || status || error ? 'mt-3' : ''}`}>
            {selectedAnnotation.resolved && (
              <div className="mb-2">
                <span className="meta-chip text-[color:rgb(var(--accent-strong-rgb))]">решено</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:rgba(var(--muted-rgb),0.92)]">
              <span className="font-medium text-[color:rgb(var(--text-rgb))]">
                {selectedAnnotation.author?.displayName ?? 'Читатель'}
              </span>
              <span>{formatTimestamp.format(new Date(selectedAnnotation.createdAt))}</span>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:rgba(var(--text-rgb),0.92)]">
              {selectedAnnotation.bodyText}
            </p>

            {canManageSelected && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={handleStartEditing} className="button-primary">
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={handleToggleResolved}
                  className="button-secondary"
                  disabled={saving}
                >
                  {selectedAnnotation.resolved ? 'Открыть снова' : 'Решено'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="button-secondary"
                  disabled={saving}
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-[color:rgba(var(--accent-rgb),0.24)] bg-[color:rgba(var(--accent-rgb),0.1)] px-3 py-2.5 text-sm font-bold leading-6 text-[color:rgb(var(--text-rgb))]">
            {authLoading
              ? 'Проверяю доступ...'
              : viewer
                ? 'Выдели фрагмент в статье, чтобы открыть комментарий в этом сайдбаре.'
                : 'Войди через Google, потом выдели фрагмент в статье, чтобы открыть комментарий здесь.'}
          </div>
        )}
      </div>

      <div className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[color:rgba(var(--line-rgb),0.08)] px-4 py-4">
          <p className="text-sm font-medium text-[color:rgb(var(--text-rgb))]">
            Комментарии ({annotations.length})
          </p>
          {annotationsLoading && (
            <span className="text-xs text-[color:rgba(var(--muted-rgb),0.9)]">Загружаю...</span>
          )}
        </div>

        <div className="max-h-[24rem] overflow-y-auto p-4 xl:max-h-[calc(100vh-24rem)]">
          <div className="space-y-3">
            {annotations.length === 0 && !annotationsLoading ? (
              <div className="rounded-md border border-dashed border-[color:rgba(var(--line-rgb),0.14)] px-4 py-5 text-sm text-[color:rgba(var(--muted-rgb),0.92)]">
                Пока пусто. Первый комментарий можно оставить прямо по тексту.
              </div>
            ) : (
              annotations.map((annotation) => {
                const isSelected = annotation.id === selectedId;

                return (
                  <button
                    key={annotation.id}
                    type="button"
                    onClick={() => selectAnnotation(annotation.id)}
                    className={`w-full rounded-md border px-3 py-3 text-left ${
                      isSelected
                        ? 'border-[color:rgba(var(--accent-rgb),0.28)] bg-[color:rgba(var(--accent-rgb),0.12)]'
                        : 'border-[color:rgba(var(--line-rgb),0.12)] bg-[color:rgba(var(--panel-rgb),0.74)] hover:border-[color:rgba(var(--accent-rgb),0.22)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-[color:rgba(var(--muted-rgb),0.9)]">
                      <span>{annotation.author?.displayName ?? 'Читатель'}</span>
                      <span>{formatTimestamp.format(new Date(annotation.createdAt))}</span>
                    </div>
                    {annotation.quote && (
                      <p className="mt-2 line-clamp-3 text-xs leading-6 text-[color:rgba(var(--text-rgb),0.78)]">
                        {annotation.quote}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-[color:rgb(var(--text-rgb))]">
                      {annotation.bodyText}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {annotation.resolved && (
                        <span className="meta-chip text-[color:rgb(var(--accent-strong-rgb))]">
                          решено
                        </span>
                      )}
                      {annotation.authorId === viewer?.id && <span className="meta-chip">твой</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
