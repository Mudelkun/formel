import { useQuery } from '@tanstack/react-query';
import { getFinanceSummary, getVersementFinance, getDashboardStats } from '@/api/finance';

export function useFinanceSummary(params: { classId?: string; classGroupId?: string } = {}) {
  return useQuery({
    queryKey: ['finance', 'summary', params],
    queryFn: () => getFinanceSummary(params),
  });
}

export function useVersementFinance(versementId: string) {
  return useQuery({
    queryKey: ['finance', 'versement', versementId],
    queryFn: () => getVersementFinance(versementId),
    enabled: !!versementId,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: getDashboardStats,
  });
}
