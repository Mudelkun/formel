import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '@/context/auth';

const mockStudents = [
  { id: '1', nie: 'NIE-001', name: 'Amadou Diallo', gender: 'M', class: 'CP', status: 'active' },
  { id: '2', nie: 'NIE-002', name: 'Fatou Sow', gender: 'F', class: '6ème', status: 'active' },
  { id: '3', nie: 'NIE-003', name: 'Moussa Ba', gender: 'M', class: 'CM2', status: 'active' },
  { id: '4', nie: 'NIE-004', name: 'Aïssatou Ndiaye', gender: 'F', class: 'MS', status: 'active' },
  { id: '5', nie: 'NIE-005', name: 'Ousmane Fall', gender: 'M', class: '3ème', status: 'inactive' },
];

export default function StudentsPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'admin' || user?.role === 'secretary';

  return (
    <>
      <PageHeader
        title="Élèves"
        description="Gérez les dossiers de tous les élèves inscrits."
      >
        {canCreate && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel élève
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un élève..." className="pl-9" />
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                <SelectItem value="cp">CP</SelectItem>
                <SelectItem value="cm2">CM2</SelectItem>
                <SelectItem value="6eme">6ème</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIE</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead className="hidden sm:table-cell">Genre</TableHead>
                <TableHead className="hidden md:table-cell">Classe</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStudents.map((student) => (
                <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {student.nie}
                  </TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{student.gender}</TableCell>
                  <TableCell className="hidden md:table-cell">{student.class}</TableCell>
                  <TableCell>
                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {student.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Voir
                    </Button>
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
