import { useFileUrl } from '@/hooks/use-file-url';

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  storedUrl: string | null | undefined;
  fallback?: React.ReactNode;
}

/**
 * Renders an image fetched through the authenticated file proxy.
 * Shows `fallback` while loading or if the URL is null.
 */
export default function AuthImage({ storedUrl, fallback, ...imgProps }: Props) {
  const blobUrl = useFileUrl(storedUrl);

  if (!storedUrl || !blobUrl) {
    return <>{fallback ?? null}</>;
  }

  return <img src={blobUrl} {...imgProps} />;
}
