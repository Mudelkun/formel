import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { getNavigationForRole } from './navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { usePendingPaymentsCount } from '@/hooks/use-payments';

export default function MobileSidebar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const groups = getNavigationForRole(user.role);
  const canSeeBadge = user.role === 'admin' || user.role === 'secretary';
  const { data: pendingCount } = usePendingPaymentsCount(canSeeBadge);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-5 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <span className="text-base font-semibold tracking-tight">Formel</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                      )
                    }
                  >
                    <span className="relative shrink-0">
                      <item.icon className="h-4 w-4" />
                      {item.href === '/payments' && canSeeBadge && !!pendingCount && pendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold leading-none">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <Separator />
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-md px-2.5 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
