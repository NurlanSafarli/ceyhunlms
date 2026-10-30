// Pages is static; public requests can use the separately hosted PHP API.
export const apiOrigin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
export const staticOnly = import.meta.env.MODE === 'pages' && !apiOrigin;
export const apiUrl = (path: string) => `${apiOrigin}${path}`;
export const publicAssetUrl = (path: string) =>
  path.startsWith('/api/public/') ? apiUrl(path) : path;
