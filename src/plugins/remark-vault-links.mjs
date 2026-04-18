import path from 'node:path';
import GithubSlugger from 'github-slugger';
import { SKIP, visit } from 'unist-util-visit';

const EXTERNAL_PROTOCOL = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;
const TBD_PATTERN = /\[TBD:\s*([^\]]+?)\s*\]/g;
const CHAR_PATTERN = /\{\{char:\s*([^}]+?)\s*\}\}/g;
const FACTION_PATTERN = /\{\{faction:\s*([^}]+?)\s*\}\}/g;

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') {
    return '/';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
}

function withBase(basePath, targetPath) {
  const cleanTarget = targetPath.replace(/^\/+/, '');
  if (basePath === '/') {
    return `/${cleanTarget}`;
  }

  return `${basePath}${cleanTarget}`;
}

function slugifyHash(hash) {
  if (!hash) {
    return '';
  }

  const slugger = new GithubSlugger();
  return slugger.slug(decodeURIComponent(hash).trim());
}

function rewriteMarkdownLink(url, basePath, publishedSlugs) {
  if (!url || EXTERNAL_PROTOCOL.test(url)) {
    return url;
  }

  const [rawPath, rawHash] = url.split('#');
  const cleanPath = rawPath.replace(/^\.?\//, '');
  if (!cleanPath.endsWith('.md')) {
    return url;
  }

  const fileName = path.posix.basename(cleanPath);
  const slug = fileName.slice(0, -3);
  if (!publishedSlugs.has(slug)) {
    return url;
  }

  const hash = rawHash ? `#${slugifyHash(rawHash)}` : '';
  return `${withBase(basePath, slug)}/${hash}`;
}

function rewriteImageLink(url, basePath) {
  if (!url || EXTERNAL_PROTOCOL.test(url)) {
    return url;
  }

  const cleanPath = url.replace(/^\.?\//, '');
  if (!cleanPath.startsWith('imgs/')) {
    return url;
  }

  return withBase(basePath, cleanPath);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceCustomMarkers(tree) {
  visit(tree, 'text', (node, index, parent) => {
    if (!parent || index === undefined) return;
    
    const hasTbd = node.value.includes('[TBD:');
    const hasChar = node.value.includes('{{char:');
    const hasFaction = node.value.includes('{{faction:');
    
    if (!hasTbd && !hasChar && !hasFaction) return;

    const nextChildren = [];
    let lastIndex = 0;
    
    // Combined regex for all markers
    const COMBINED_PATTERN = new RegExp(`(${TBD_PATTERN.source})|(${CHAR_PATTERN.source})|(${FACTION_PATTERN.source})`, 'g');

    for (const match of node.value.matchAll(COMBINED_PATTERN)) {
      const matchIndex = match.index ?? 0;
      if (matchIndex > lastIndex) {
        nextChildren.push({
          type: 'text',
          value: node.value.slice(lastIndex, matchIndex)
        });
      }

      if (match[1]) { // TBD
        nextChildren.push({
          type: 'html',
          value: `<span class="tbd" title="${escapeHtml(match[2].trim())}">в работе</span>`
        });
      } else if (match[3]) { // CHAR
        const id = match[4].trim();
        nextChildren.push({
          type: 'html',
          value: `<span data-character-link="${escapeHtml(id)}">@${escapeHtml(id)}</span>`
        });
      } else if (match[5]) { // FACTION
        const id = match[6].trim();
        nextChildren.push({
          type: 'html',
          value: `<span data-faction-link="${escapeHtml(id)}">#${escapeHtml(id)}</span>`
        });
      }

      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex === 0) return;

    if (lastIndex < node.value.length) {
      nextChildren.push({
        type: 'text',
        value: node.value.slice(lastIndex)
      });
    }

    parent.children.splice(index, 1, ...nextChildren);
    return [SKIP, index + nextChildren.length];
  });
}

export function remarkVaultLinks(options = {}) {
  const basePath = normalizeBasePath(options.basePath);
  const publishedSlugs = new Set(options.publishedSlugs ?? []);

  return (tree) => {
    visit(tree, 'link', (node) => {
      node.url = rewriteMarkdownLink(node.url, basePath, publishedSlugs);
    });

    visit(tree, 'image', (node) => {
      node.url = rewriteImageLink(node.url, basePath);
    });

    replaceCustomMarkers(tree);
  };
}
