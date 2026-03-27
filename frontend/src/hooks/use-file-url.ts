import { useState, useEffect } from 'react';
import { fetchFileAsBlob } from '@/lib/fileUrl';

/**
 * Fetches a file through the authenticated API proxy and returns a blob URL.
 * Automatically revokes the blob URL on cleanup.
 */
export function useFileUrl(storedUrl: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storedUrl) {
      setBlobUrl(null);
      return;
    }

    let revoked = false;
    let url: string | null = null;

    fetchFileAsBlob(storedUrl)
      .then((blob) => {
        if (revoked) {
          URL.revokeObjectURL(blob);
          return;
        }
        url = blob;
        setBlobUrl(blob);
      })
      .catch(() => {
        if (!revoked) setBlobUrl(null);
      });

    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [storedUrl]);

  return blobUrl;
}
