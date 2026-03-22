import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { useScholarships, useCreateScholarship, useDeleteScholarship, useStudentBalance, useUpdateStudent } from '@/hooks/use-students';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Award, Pencil, Loader2 } from 'lucide-react';
import type { StudentDetail } from '@/types/student';
import ScholarshipForm, { EMPTY_CONFIG, isConfigActive, type ScholarshipConfig } from './ScholarshipForm';
import { configToInputs, recordsToConfig } from '@/lib/scholarship-utils';

interface Props {
  student: StudentDetail;
}

export default function StudentScholarshipCard({ student }: Props) {
  const { user } = useAuth();
  const enrollmentId = student.currentEnrollment?.enrollmentId;
  const canManage = user?.role === 'admin';

  const { data: scholarships, isLoading } = useScholarships(enrollmentId);
  const { data: balance } = useStudentBalance(student.id);
  const updateStudent = useUpdateStudent(student.id);
  const createScholarship = useCreateScholarship();
  const deleteScholarship = useDeleteScholarship(enrollmentId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [config, setConfig] = useState<ScholarshipConfig>(EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);

  const versements = balance?.versements ?? [];

  function openDialog() {
    const vIds = versements.map((v) => v.id);
    setConfig(scholarships && scholarships.length > 0
      ? recordsToConfig(scholarships, vIds)
      : EMPTY_CONFIG
    );
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!enrollmentId) return;
    setSaving(true);
    try {
      // 1. Delete all existing scholarship records
      if (scholarships) {
        for (const s of scholarships) {
          await deleteScholarship.mutateAsync(s.id);
        }
      }
      // 2. Create new records from config
      const inputs = configToInputs(config, versements);
      for (const input of inputs) {
        await createScholarship.mutateAsync({ enrollmentId, data: input });
      }
      // 3. Sync scholarshipRecipient flag on the student record
      const hasScholarship = isConfigActive(config);
      if (student.scholarshipRecipient !== hasScholarship) {
        await updateStudent.mutateAsync({ scholarshipRecipient: hasScholarship });
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!enrollmentId) return null;

  // Derive a human-readable summary from current scholarships
  const summary = buildSummary(scholarships ?? []);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Bourses
            </CardTitle>
            {canManage && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={openDialog}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune bourse enregistrée.</p>
          ) : (
            <ul className="space-y-1">
              {summary.map((line, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer les bourses</DialogTitle>
            <DialogDescription>
              Configurez le type de bourse et les actions de paiement.
            </DialogDescription>
          </DialogHeader>

          <ScholarshipForm value={config} onChange={setConfig} versements={versements} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────

function buildSummary(records: { type: string; percentage: string | null; fixedAmount: string | null }[]): string[] {
  if (records.length === 0) return [];
  const lines: string[] = [];

  const partial = records.find((r) => r.type === 'partial');
  const bookAnnul = records.some((r) => r.type === 'book_annulation');
  const versAnnuls = records.filter((r) => r.type === 'versement_annulation');

  if (partial && Number(partial.percentage) >= 100 && bookAnnul) {
    lines.push('Bourse complète (100%) — scolarité et livres');
  } else if (partial && Number(partial.percentage) >= 100) {
    lines.push('Bourse scolarité (100%)');
  } else if (partial) {
    lines.push(`Bourse partielle — ${partial.percentage}%`);
  }

  if (versAnnuls.length > 0) {
    lines.push(`${versAnnuls.length} versement(s) annulé(s)`);
  }

  if (bookAnnul && !(partial && Number(partial.percentage) >= 100 && bookAnnul)) {
    lines.push('Paiement des livres supprimé');
  }

  return lines;
}
