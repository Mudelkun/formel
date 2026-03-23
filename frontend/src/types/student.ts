export interface Student {
  id: string;
  nie: string | null;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  birthDate: string;
  address: string | null;
  scholarshipRecipient: boolean;
  status: 'active' | 'transfer' | 'expelled' | 'graduated';
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  className?: string | null;
  gradeLevel?: number | null;
  enrollmentStatus?: 'enrolled' | 'transferred' | 'inactive' | 'graduated';
  hasOverdue?: boolean;
}

export interface StudentDetail extends Student {
  contacts: Contact[];
  currentEnrollment: {
    enrollmentId: string;
    className: string;
    gradeLevel: number;
    enrollmentStatus: 'enrolled' | 'transferred' | 'inactive' | 'graduated';
  } | null;
}

export interface Contact {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  documentName: string;
  documentType: 'birth_certificate' | 'id_card' | 'transcript' | 'medical_record' | 'other';
  documentUrl: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface VersementDetail {
  id: string;
  number: number;
  name: string;
  amount: string;
  effectiveAmount: number;
  dueDate: string;
  amountPaid: number;
  amountRemaining: number;
  isPaidInFull: boolean;
  isOverdue: boolean;
}

export interface BalanceResponse {
  versements: VersementDetail[];
  books: {
    fee: number;
    effectiveFee: number;
    amountPaid: number;
    amountRemaining: number;
    surplus: number;
  };
  total: {
    tuition: number;
    scholarshipDiscount: number;
    amountDue: number;
    amountPaid: number;
    amountRemaining: number;
    tuitionSurplus: number;
    bookSurplus: number;
    surplus: number;
  };
  currentVersement: {
    number: number;
    name: string;
    amountRemaining: number;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    totalCount: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
  classGroupId: string;
  studentCount: number;
}

export interface SchoolYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CreateStudentInput {
  nie?: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  birthDate: string;
  address?: string;
  scholarshipRecipient?: boolean;
}

export interface UpdateStudentInput {
  nie?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female';
  birthDate?: string;
  address?: string | null;
  scholarshipRecipient?: boolean;
  status?: 'active' | 'transfer' | 'expelled' | 'graduated';
}

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  relationship: string;
  isPrimary?: boolean;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string;
  relationship?: string;
  isPrimary?: boolean;
}

export interface CreateEnrollmentInput {
  studentId: string;
  classId: string;
  schoolYearId: string;
}
