import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listAuditLogs } from '@/api/audit-logs';

export function useAuditLogs(filters: { action?: string; tableName?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['audit-logs', 'list', filters],
    queryFn: () => listAuditLogs(filters),
    placeholderData: keepPreviousData,
  });
}
