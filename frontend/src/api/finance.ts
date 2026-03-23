import api from './client';

export interface FinanceSummary {
  total_expected: number;
  total_collected: number;
  total_pending: number;
  total_remaining: number;
  total_scholarships: number;
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

export interface MonthlyPayment {
  month: string;
  collected: number;
  pending: number;
  count: number;
}

export interface GroupBreakdown {
  id: string;
  name: string;
  expected: number;
  collected: number;
  pending: number;
  remaining: number;
  scholarships: number;
  studentCount: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  total: number;
  count: number;
}

export async function getMonthlyPayments(): Promise<MonthlyPayment[]> {
  const { data } = await api.get('/finance/monthly-payments');
  return data;
}

export async function getGroupBreakdown(): Promise<GroupBreakdown[]> {
  const { data } = await api.get('/finance/group-breakdown');
  return data;
}

export async function getPaymentMethodBreakdown(): Promise<PaymentMethodBreakdown[]> {
  const { data } = await api.get('/finance/payment-methods');
  return data;
}
