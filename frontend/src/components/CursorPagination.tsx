import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CursorPaginationProps {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  totalCount: number;
  pageSize: number;
  /** 0-based page index in the cursor stack */
  pageIndex: number;
}

export default function CursorPagination({
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
  totalCount,
  pageSize,
  pageIndex,
}: CursorPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Page {pageIndex + 1} sur {totalPages}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPreviousPage}
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={onNext}
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
