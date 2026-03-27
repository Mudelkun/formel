import api from '@/api/client';

/**
 * Extracts the R2 key from a stored file reference (full URL or key-only).
 */
function toKey(storedUrl: string): string {
  // Legacy full R2 URLs: strip the public URL prefix to get the key
  if (storedUrl.startsWith('https://pub-')) {
    const pathStart = storedUrl.indexOf('.r2.dev/');
    if (pathStart !== -1) {
      return storedUrl.substring(pathStart + '.r2.dev/'.length);
    }
  }

  // Already a proxy URL — extract the key
  if (storedUrl.startsWith('/api/files/')) {
    return storedUrl.substring('/api/files/'.length);
  }

  // Already a bare key
  return storedUrl;
}

/**
 * Returns the proxy path for a stored file reference.
 * Use this only where you also handle auth (e.g. useAuthenticatedFile hook).
 */
export function fileUrl(storedUrl: string | null | undefined): string {
  if (!storedUrl) return '';
  return `/api/files/${toKey(storedUrl)}`;
}

/**
 * Fetches a file through the authenticated API and returns a blob URL.
 * Use this for <img src>, <iframe src>, window.open, and <a href>.
 */
export async function fetchFileAsBlob(storedUrl: string): Promise<string> {
  const path = `/files/${toKey(storedUrl)}`;
  const response = await api.get(path, { responseType: 'blob' });
  return URL.createObjectURL(response.data);
}
