import api from './client';

export interface FinanceSummary {
  total_expected: number;
  total_collected: number;
  total_pending: number;
  total_remaining: number;
  student_count: number;
}

export interface VersementFinance {
  versement_expected: number;
  total_collected: number;
  total_remaining: number;
  student_count: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  paymentsThisMonth: number;
  overdueVersements: number;
  recentPayments: { id: string; amount: string; paymentDate: string; studentFirstName: string; studentLastName: string; className: string }[];
  upcomingDueDates: { id: string; name: string; amount: string; dueDate: string; classGroupId: string }[];
}

export async function getFinanceSummary(params: { classId?: string; classGroupId?: string } = {}): Promise<FinanceSummary> {
  const { data } = await api.get('/finance/summary', { params });
  return data;
}

export async function getVersementFinance(versementId: string): Promise<VersementFinance> {
  const { data } = await api.get(`/finance/versement/${versementId}`);
  return data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/finance/dashboard');
  return data;
}
