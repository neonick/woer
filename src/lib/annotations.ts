import type { W3CAnnotation } from '@recogito/text-annotator';
import { supabase } from './supabase';

type AnnotationTarget = W3CAnnotation['target'];

type AnnotationRow = {
  id: string;
  page_slug: string;
  author_id: string;
  target: AnnotationTarget;
  body_text: string;
  quote: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
};

export type AnnotationAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export type StoredAnnotation = {
  id: string;
  pageSlug: string;
  authorId: string;
  target: AnnotationTarget;
  bodyText: string;
  quote: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  author: AnnotationAuthor | null;
};

export type CreateAnnotationInput = {
  id: string;
  pageSlug: string;
  authorId: string;
  target: AnnotationTarget;
  bodyText: string;
  quote?: string | null;
};

export type UpdateAnnotationInput = {
  target?: AnnotationTarget;
  bodyText?: string;
  quote?: string | null;
  resolved?: boolean;
};

const ANNOTATION_COLUMNS =
  'id, page_slug, author_id, target, body_text, quote, resolved, created_at, updated_at';

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeAuthor(row: ProfileRow | undefined) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isAdmin: row.is_admin,
  };
}

function normalizeAnnotation(row: AnnotationRow, author?: ProfileRow): StoredAnnotation {
  return {
    id: row.id,
    pageSlug: row.page_slug,
    authorId: row.author_id,
    target: row.target,
    bodyText: row.body_text,
    quote: row.quote,
    resolved: row.resolved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: normalizeAuthor(author),
  };
}

async function fetchProfiles(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, is_admin')
    .in('id', ids);

  if (error) {
    throw error;
  }

  return new Map((data as ProfileRow[]).map((profile) => [profile.id, profile]));
}

async function hydrateAnnotations(rows: AnnotationRow[]) {
  const authorMap = await fetchProfiles([...new Set(rows.map((row) => row.author_id))]);

  return rows.map((row) => normalizeAnnotation(row, authorMap.get(row.author_id)));
}

async function fetchAnnotationById(id: string) {
  const { data, error } = await supabase
    .from('annotations')
    .select(ANNOTATION_COLUMNS)
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  const [annotation] = await hydrateAnnotations([data as AnnotationRow]);

  return annotation;
}

export async function fetchPageAnnotations(pageSlug: string) {
  const { data, error } = await supabase
    .from('annotations')
    .select(ANNOTATION_COLUMNS)
    .eq('page_slug', pageSlug)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return hydrateAnnotations((data as AnnotationRow[]) ?? []);
}

export async function createPageAnnotation(input: CreateAnnotationInput) {
  const { error } = await supabase.from('annotations').insert({
    id: input.id,
    page_slug: input.pageSlug,
    author_id: input.authorId,
    target: input.target,
    body_text: input.bodyText,
    quote: input.quote ?? getTargetQuote(input.target),
  });

  if (error) {
    throw error;
  }

  return fetchAnnotationById(input.id);
}

export async function updatePageAnnotation(id: string, patch: UpdateAnnotationInput) {
  const nextValues: Record<string, AnnotationTarget | boolean | string | null> = {};

  if (patch.target !== undefined) {
    nextValues.target = patch.target;
  }

  if (patch.bodyText !== undefined) {
    nextValues.body_text = patch.bodyText;
  }

  if (patch.quote !== undefined) {
    nextValues.quote = patch.quote;
  }

  if (patch.resolved !== undefined) {
    nextValues.resolved = patch.resolved;
  }

  const { error } = await supabase.from('annotations').update(nextValues).eq('id', id);

  if (error) {
    throw error;
  }

  return fetchAnnotationById(id);
}

export async function deletePageAnnotation(id: string) {
  const { error } = await supabase.from('annotations').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export function getAnnotationBodyText(annotation: W3CAnnotation) {
  const bodies = asArray(annotation.body);
  const commentBody = bodies.find(
    (body) => typeof body === 'object' && body !== null && 'value' in body && typeof body.value === 'string',
  );

  return commentBody && 'value' in commentBody && typeof commentBody.value === 'string'
    ? commentBody.value.trim()
    : '';
}

export function getTargetQuote(target: AnnotationTarget) {
  for (const currentTarget of asArray(target)) {
    for (const selector of asArray(currentTarget.selector)) {
      if (
        typeof selector === 'object' &&
        selector !== null &&
        'type' in selector &&
        selector.type === 'TextQuoteSelector' &&
        'exact' in selector &&
        typeof selector.exact === 'string'
      ) {
        return selector.exact;
      }
    }
  }

  return null;
}

export function toW3CAnnotation(annotation: StoredAnnotation): W3CAnnotation {
  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id: annotation.id,
    type: 'Annotation',
    body: annotation.bodyText
      ? [
          {
            type: 'TextualBody',
            purpose: 'commenting',
            value: annotation.bodyText,
          },
        ]
      : [],
    creator: annotation.author
      ? {
          id: annotation.author.id,
          name: annotation.author.displayName,
        }
      : undefined,
    created: annotation.createdAt,
    modified: annotation.updatedAt,
    target: annotation.target,
  };
}

export type AnnotationReply = {
  id: string;
  annotationId: string;
  parentReplyId: string | null;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: AnnotationAuthor | null;
};

export type CreateReplyInput = {
  annotationId: string;
  parentReplyId?: string | null;
  authorId: string;
  body: string;
};

const REPLY_COLUMNS = 'id, annotation_id, parent_reply_id, author_id, body, created_at, updated_at';

function normalizeReply(row: any, author?: ProfileRow): AnnotationReply {
  return {
    id: row.id,
    annotationId: row.annotation_id,
    parentReplyId: row.parent_reply_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: normalizeAuthor(author),
  };
}

export async function fetchAnnotationReplies(annotationId: string) {
  const { data, error } = await supabase
    .from('annotation_replies')
    .select(REPLY_COLUMNS)
    .eq('annotation_id', annotationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = data as any[];
  const authorMap = await fetchProfiles([...new Set(rows.map((row) => row.author_id))]);

  return rows.map((row) => normalizeReply(row, authorMap.get(row.author_id)));
}

export async function createAnnotationReply(input: CreateReplyInput) {
  const { data, error } = await supabase
    .from('annotation_replies')
    .insert({
      annotation_id: input.annotationId,
      parent_reply_id: input.parentReplyId ?? null,
      author_id: input.authorId,
      body: input.body,
    })
    .select(REPLY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const [reply] = await Promise.all([
    (async () => {
      const authorMap = await fetchProfiles([data.author_id]);
      return normalizeReply(data, authorMap.get(data.author_id));
    })()
  ]);

  return reply;
}

export async function deleteAnnotationReply(id: string) {
  const { error } = await supabase.from('annotation_replies').delete().eq('id', id);
  if (error) throw error;
}
