const rawBasePath = import.meta.env.BASE_URL ?? '/';

export const basePath =
  rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`;

export function withBasePath(path = '') {
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${basePath}${cleanPath}` : basePath;
}
