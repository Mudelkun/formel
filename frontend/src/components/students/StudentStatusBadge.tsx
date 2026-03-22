import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  enrolled: { label: 'Inscrit', variant: 'default' },
  transferred: { label: 'Transféré', variant: 'secondary' },
  inactive: { label: 'Inactif', variant: 'destructive' },
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
