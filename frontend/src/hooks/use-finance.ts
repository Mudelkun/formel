import { useQuery } from '@tanstack/react-query';
import { getFinanceSummary, getVersementFinance, getDashboardStats, getMonthlyPayments, getGroupBreakdown, getPaymentMethodBreakdown } from '@/api/finance';

const STALE_30S = 30 * 1000;
const STALE_1M = 60 * 1000;

export function useFinanceSummary(params: { classId?: string; classGroupId?: string } = {}) {
  return useQuery({
    queryKey: ['finance', 'summary', params],
    queryFn: () => getFinanceSummary(params),
    staleTime: STALE_1M,
  });
}

export function useVersementFinance(versementId: string) {
  return useQuery({
    queryKey: ['finance', 'versement', versementId],
    queryFn: () => getVersementFinance(versementId),
    enabled: !!versementId,
    staleTime: STALE_1M,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: getDashboardStats,
    staleTime: STALE_30S,
  });
}

export function useMonthlyPayments() {
  return useQuery({
    queryKey: ['finance', 'monthly-payments'],
    queryFn: getMonthlyPayments,
    staleTime: STALE_1M,
  });
}

export function useGroupBreakdown() {
  return useQuery({
    queryKey: ['finance', 'group-breakdown'],
    queryFn: getGroupBreakdown,
    staleTime: STALE_1M,
  });
}

export function usePaymentMethodBreakdown() {
  return useQuery({
    queryKey: ['finance', 'payment-methods'],
    queryFn: getPaymentMethodBreakdown,
    staleTime: STALE_1M,
  });
}
