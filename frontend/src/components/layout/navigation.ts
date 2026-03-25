import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  Layers,
  UserPlus,
  CalendarDays,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
  Mail,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      {
        label: 'Tableau de bord',
        href: '/',
        icon: LayoutDashboard,
        roles: ['admin', 'secretary', 'accountant'],
      },
    ],
  },
  {
    title: 'Gestion Scolaire',
    items: [
      {
        label: 'Élèves',
        href: '/students',
        icon: GraduationCap,
        roles: ['admin', 'secretary', 'teacher'],
      },
      {
        label: 'Classes',
        href: '/classes',
        icon: School,
        roles: ['admin', 'secretary', 'teacher'],
      },
      {
        label: 'Groupes de classes',
        href: '/class-groups',
        icon: Layers,
        roles: ['admin', 'secretary'],
      },
      {
        label: 'Inscriptions',
        href: '/enrollments',
        icon: UserPlus,
        roles: ['admin', 'secretary'],
      },
      {
        label: 'Années scolaires',
        href: '/school-years',
        icon: CalendarDays,
        roles: ['admin', 'secretary'],
      },
    ],
  },
  {
    title: 'Finances',
    items: [
      {
        label: 'Paiements',
        href: '/payments',
        icon: CreditCard,
        roles: ['admin', 'secretary'],
      },
      {
        label: 'Aperçu financier',
        href: '/finance',
        icon: BarChart3,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Messagerie',
        href: '/messaging',
        icon: Mail,
        roles: ['admin'],
      },
      {
        label: 'Utilisateurs',
        href: '/users',
        icon: Users,
        roles: ['admin'],
      },
      {
        label: 'Journal d\'audit',
        href: '/audit-logs',
        icon: FileText,
        roles: ['admin'],
      },
      {
        label: 'Paramètres',
        href: '/settings',
        icon: Settings,
        roles: ['admin'],
      },
    ],
  },
];

export function getNavigationForRole(role: string): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}
