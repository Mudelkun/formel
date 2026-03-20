import { useState, useEffect } from 'react';
import { useUsers, useUpdateUser } from '@/hooks/use-users';
import CreateUserDialog from '@/components/users/CreateUserDialog';
import EditUserDialog from '@/components/users/EditUserDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Users } from 'lucide-react';
import type { UserAccount } from '@/api/users';

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  secretary: 'Secrétaire',
  teacher: 'Enseignant',
  accountant: 'Comptable',
};

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 hover:bg-red-100',
  secretary: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  teacher: 'bg-green-100 text-green-700 hover:bg-green-100',
  accountant: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
};

export default function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [togglingUser, setTogglingUser] = useState<UserAccount | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const updateUser = useUpdateUser();

  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  const { data, isLoading } = useUsers({
    role: roleFilter || undefined,
    page,
    limit: 20,
  });

  const users = data?.data ?? [];
  const pagination = data?.pagination;

  function handleToggleActive() {
    if (!togglingUser) return;
    updateUser.mutate(
      { id: togglingUser.id, isActive: !togglingUser.isActive },
      { onSuccess: () => setTogglingUser(null) },
    );
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes utilisateurs et leurs rôles."
      >
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </PageHeader>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="secretary">Secrétaire</option>
              <option value="teacher">Enseignant</option>
              <option value="accountant">Comptable</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun utilisateur trouvé"
              description={
                roleFilter
                  ? 'Essayez de modifier votre filtre.'
                  : 'Commencez par ajouter un utilisateur.'
              }
            >
              {!roleFilter && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel utilisateur
                </Button>
              )}
            </EmptyState>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                            {u.name.charAt(0)}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${roleBadgeColors[u.role] ?? ''}`}>
                          {roleLabels[u.role] ?? u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge variant="default" className="text-xs">Actif</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingUser(u)}>
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setTogglingUser(u)}
                            >
                              {u.isActive ? 'Désactiver' : 'Activer'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}

      <ConfirmDialog
        open={!!togglingUser}
        onOpenChange={(open) => !open && setTogglingUser(null)}
        title={togglingUser?.isActive ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
        description={
          togglingUser?.isActive
            ? `Voulez-vous vraiment désactiver le compte de ${togglingUser?.name} ?`
            : `Voulez-vous réactiver le compte de ${togglingUser?.name} ?`
        }
        onConfirm={handleToggleActive}
        isLoading={updateUser.isPending}
        variant={togglingUser?.isActive ? 'destructive' : 'default'}
        confirmLabel={togglingUser?.isActive ? 'Désactiver' : 'Activer'}
      />
    </>
  );
}
