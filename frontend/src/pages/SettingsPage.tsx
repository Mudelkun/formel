import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { Building, Mail, Phone, MapPin, Loader2 } from 'lucide-react';

const settingsSchema = z.object({
  schoolName: z.string().min(1, 'Nom requis'),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  currency: z.string().min(1, 'Devise requise'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      schoolName: '',
      address: '',
      phone: '',
      email: '',
      currency: 'HTG',
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        schoolName: settings.schoolName,
        address: settings.address ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        currency: settings.currency,
      });
    }
  }, [settings, reset]);

  async function onSubmit(data: SettingsFormData) {
    await updateSettings.mutateAsync({
      schoolName: data.schoolName,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      currency: data.currency,
    });
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Paramètres"
          description="Informations et configuration de l'établissement."
        />
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Informations et configuration de l'établissement."
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Informations de l'école</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">Nom de l'établissement</Label>
                <Input id="schoolName" {...register('schoolName')} disabled={!isAdmin} />
                {errors.schoolName && (
                  <p className="text-xs text-destructive">{errors.schoolName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    className="pl-9 min-h-[80px]"
                    disabled={!isAdmin}
                    {...register('address')}
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
                      className="pl-9"
                      disabled={!isAdmin}
                      {...register('phone')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      className="pl-9"
                      disabled={!isAdmin}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Input id="currency" {...register('currency')} disabled={!isAdmin} />
                {errors.currency && (
                  <p className="text-xs text-destructive">{errors.currency.message}</p>
                )}
              </div>

              {isAdmin && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
