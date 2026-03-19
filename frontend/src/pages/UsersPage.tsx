import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const mockUsers = [
  { id: '1', name: 'Admin Principal', email: 'admin@formel.school', role: 'admin', active: true },
  { id: '2', name: 'Secrétaire Marie', email: 'marie@formel.school', role: 'secretary', active: true },
  { id: '3', name: 'Prof. Jean', email: 'jean@formel.school', role: 'teacher', active: true },
  { id: '4', name: 'Comptable Awa', email: 'awa@formel.school', role: 'accountant', active: true },
  { id: '5', name: 'Prof. Ibrahima', email: 'ibrahima@formel.school', role: 'teacher', active: false },
];

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes utilisateurs et leurs rôles."
      >
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
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
              {mockUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${roleBadgeColors[u.role]}`}>
                      {roleLabels[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.active ? (
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
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          {u.active ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
