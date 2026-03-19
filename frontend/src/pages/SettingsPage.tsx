import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth';
import { Building, Mail, Phone, MapPin } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Informations et configuration de l'établissement."
      />

      <div className="max-w-2xl space-y-6">
        {/* School info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Informations de l'école</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">Nom de l'établissement</Label>
              <Input id="schoolName" defaultValue="École Formel" disabled={!isAdmin} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="address"
                  defaultValue="123 Rue de l'Éducation, Dakar"
                  className="pl-9 min-h-[80px]"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    defaultValue="+221 33 123 4567"
                    className="pl-9"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    defaultValue="contact@formel.school"
                    className="pl-9"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <>
                <Separator />
                <div className="flex justify-end">
                  <Button size="sm">Enregistrer les modifications</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
