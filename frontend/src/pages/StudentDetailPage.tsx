import { Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  FileText,
  CreditCard,
  GraduationCap,
  Check,
  Clock,
} from 'lucide-react';

export default function StudentDetailPage() {

  return (
    <>
      {/* Back + header */}
      <div className="mb-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux élèves
        </Link>
      </div>

      <PageHeader title="Amadou Diallo" description="NIE-001 · CP · Inscrit depuis sept. 2025">
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Informations personnelles</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Prénom</p>
                  <p className="font-medium">Amadou</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nom</p>
                  <p className="font-medium">Diallo</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Genre</p>
                  <p className="font-medium">Masculin</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date de naissance</p>
                  <p className="font-medium">15/03/2015</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Adresse</p>
                  <p className="font-medium">123 Rue Principale, Dakar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment balance */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Solde des paiements</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['1er versement', '2ème versement', '3ème versement'].map((name, i) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">Échéance : —</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">— / —</p>
                      <Badge variant={i === 0 ? 'default' : 'secondary'} className="text-xs mt-1">
                        {i === 0 ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Frais de livres</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">— / —</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment history */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Historique des paiements</CardTitle>
                </div>
                <Button size="sm">Enregistrer un paiement</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { date: '15/10/2025', amount: '50 000 F', type: 'Scolarité', status: 'completed' },
                    { date: '20/11/2025', amount: '5 000 F', type: 'Livres', status: 'completed' },
                    { date: '10/01/2026', amount: '30 000 F', type: 'Scolarité', status: 'pending' },
                  ].map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{p.date}</TableCell>
                      <TableCell className="font-medium">{p.amount}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{p.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3 w-3" /> Confirmé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Clock className="h-3 w-3" /> En attente
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right column — Sidebar info */}
        <div className="space-y-6">
          {/* Photo + status */}
          <Card>
            <CardContent className="p-5 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground mb-3">
                AD
              </div>
              <p className="font-medium">Amadou Diallo</p>
              <p className="text-sm text-muted-foreground">CP · Primaire</p>
              <Badge className="mt-2">Actif</Badge>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Contacts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Ibrahim Diallo', rel: 'Père', phone: '+221 77 123 4567', primary: true },
                { name: 'Aminata Diallo', rel: 'Mère', phone: '+221 78 234 5678', primary: false },
              ].map((c, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    {c.primary && <Badge variant="outline" className="text-[10px] px-1.5">Principal</Badge>}
                  </div>
                  <p className="text-muted-foreground">{c.rel} · {c.phone}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Documents</CardTitle>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {['Certificat de naissance', 'Bulletin scolaire'].map((doc) => (
                <div key={doc} className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{doc}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enrollment info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Inscription</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Année scolaire</span>
                <span className="font-medium">2025-2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classe</span>
                <span className="font-medium">CP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Groupe</span>
                <span className="font-medium">Primaire</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bourse</span>
                <span className="font-medium">Aucune</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
