import { useVersementFinance } from '@/hooks/use-finance';
import { useCurrency } from '@/hooks/use-currency';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  versementId: string;
  versementName: string;
  dueDate: string;
}

export default function VersementFinanceRow({ versementId, versementName, dueDate }: Props) {
  const { data, isLoading } = useVersementFinance(versementId);
  const { formatAmount } = useCurrency();

  if (isLoading) {
    return (
      <TableRow>
        <TableCell className="font-medium">{versementName}</TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      </TableRow>
    );
  }

  if (!data) return null;

  const expected = data.versement_expected;
  const collected = data.total_collected;
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  const now = new Date();
  const due = new Date(dueDate);
  const isOverdue = due < now && rate < 100;
  const isUpcoming = due > now && collected === 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{versementName}</TableCell>
      <TableCell className="font-mono text-sm">{formatAmount(expected)}</TableCell>
      <TableCell className="font-mono text-sm">{formatAmount(collected)}</TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{rate}%</span>
        </div>
      </TableCell>
      <TableCell>
        {isOverdue ? (
          <Badge variant="destructive" className="text-xs">En retard</Badge>
        ) : isUpcoming ? (
          <Badge variant="secondary" className="text-xs">À venir</Badge>
        ) : (
          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/30">En cours</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
