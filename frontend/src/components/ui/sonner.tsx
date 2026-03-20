import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-background text-foreground border-border shadow-lg',
          description: 'text-muted-foreground',
        },
      }}
    />
  );
}
