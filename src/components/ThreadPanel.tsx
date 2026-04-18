import { useEffect, useState, useRef } from 'react';
import {
  fetchAnnotationReplies,
  createAnnotationReply,
  deleteAnnotationReply,
  deletePageAnnotation,
  type AnnotationReply,
  type StoredAnnotation
} from '../lib/annotations';
import { supabase } from '../lib/supabase';

interface Props {
  annotationId: string;
  annotation?: StoredAnnotation;
  isNew?: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  onSaveInitial?: (text: string) => Promise<void>;
  isAdmin: boolean;
}

export default function ThreadPanel({ 
  annotationId, 
  annotation, 
  isNew, 
  onClose, 
  onDeleted, 
  onSaveInitial,
  isAdmin 
}: Props) {
  const [replies, setReplies] = useState<AnnotationReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    if (!isNew) {
      fetchAnnotationReplies(annotationId)
        .then(setReplies)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [annotationId, isNew]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, [isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReply.trim()) return;

    try {
      if (isNew && onSaveInitial) {
        await onSaveInitial(newReply.trim());
      } else {
        const reply = await createAnnotationReply({
          annotationId,
          authorId: user.id,
          body: newReply.trim()
        });
        setReplies([...replies, reply]);
      }
      setNewReply('');
    } catch (err) {
      console.error('Failed to submit:', err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[color:rgba(var(--panel-rgb),0.98)] border-l border-[color:rgba(var(--line-rgb),0.12)] shadow-2xl z-[9000] flex flex-col backdrop-blur-md">
      <div className="p-4 border-b border-[color:rgba(var(--line-rgb),0.08)] flex justify-between items-center">
        <h3 className="font-medium text-[color:rgb(var(--text-rgb))] text-sm">
          {isNew ? 'Новый комментарий' : 'Обсуждение'}
        </h3>
        <button onClick={onClose} className="text-[color:rgba(var(--muted-rgb),0.8)] hover:text-[color:rgb(var(--text-rgb))] p-1">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {annotation && !isNew && (
          <div className="pb-6 border-b border-[color:rgba(var(--line-rgb),0.06)] group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[color:rgba(var(--accent-rgb),1)]">
                {annotation.author?.displayName ?? 'Автор'}
              </span>
              {(isAdmin || (user && user.id === annotation.authorId)) && (
                <button
                  onClick={async () => {
                    if (confirm('Удалить аннотацию?')) {
                      await deletePageAnnotation(annotationId);
                      if (onDeleted) onDeleted();
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-300"
                >
                  Удалить всё
                </button>
              )}
            </div>
            <p className="text-sm font-medium text-[color:rgb(var(--text-rgb))] leading-relaxed">
              {annotation.bodyText}
            </p>
            {annotation.quote && (
              <p className="mt-2 text-[10px] italic text-[color:rgba(var(--muted-rgb),0.5)] border-l border-[color:rgba(var(--line-rgb),0.2)] pl-2">
                "{annotation.quote}"
              </p>
            )}
          </div>
        )}

        {!isNew && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-xs text-[color:rgba(var(--muted-rgb),0.6)]">Загрузка...</p>
            ) : replies.length === 0 ? (
              <p className="text-[10px] text-[color:rgba(var(--muted-rgb),0.4)] italic text-center py-2">
                Нет ответов
              </p>
            ) : (
              replies.map(reply => (
                <div key={reply.id} className="group flex flex-col gap-1 pl-4 border-l border-[color:rgba(var(--line-rgb),0.04)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:rgba(var(--muted-rgb),0.9)]">
                      {reply.author?.displayName ?? 'Аноним'}
                    </span>
                    {(isAdmin || (user && user.id === reply.authorId)) && (
                      <button
                        onClick={async () => {
                          await deleteAnnotationReply(reply.id);
                          setReplies(replies.filter(r => r.id !== reply.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-300"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[color:rgba(var(--text-rgb),0.9)] leading-relaxed">
                    {reply.body}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {isNew && (
          <div className="py-4 text-center">
            <p className="text-xs text-[color:rgba(var(--muted-rgb),0.7)] italic">
              Напишите комментарий, чтобы сохранить выделение.
            </p>
          </div>
        )}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="p-4 border-t border-[color:rgba(var(--line-rgb),0.08)] bg-[color:rgba(var(--bg-soft-rgb),0.4)]">
          <textarea
            ref={textareaRef}
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder={isNew ? "Ваш комментарий..." : "Ваш ответ..."}
            className="w-full bg-[color:rgba(var(--panel-strong-rgb),0.6)] border border-[color:rgba(var(--line-rgb),0.1)] rounded-md p-2 text-sm text-[color:rgb(var(--text-rgb))] focus:outline-none focus:border-[color:rgba(var(--accent-rgb),0.3)] min-h-[6rem] resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button type="submit" disabled={!newReply.trim()} className="flex-1 button-primary text-xs py-2 h-auto disabled:opacity-50">
              {isNew ? 'Сохранить' : 'Ответить'}
            </button>
            {isNew && (
              <button type="button" onClick={onClose} className="px-4 py-2 border border-[color:rgba(var(--line-rgb),0.1)] rounded-md text-xs">
                Отмена
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="p-4 border-t border-[color:rgba(var(--line-rgb),0.08)] text-center space-y-3">
          <p className="text-xs text-[color:rgba(var(--muted-rgb),0.8)]">Войдите, чтобы комментировать</p>
          <div className="text-xs opacity-50 italic">Выделение удалится при закрытии панели, если не войти.</div>
        </div>
      )}
    </div>
  );
}
