import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Inscrit', variant: 'default' },
  transfer: { label: 'Transféré', variant: 'secondary' },
  expelled: { label: 'Expulsé', variant: 'destructive' },
  graduated: { label: 'Diplômé', variant: 'outline' },
};

export default function StudentStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
