import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createContactSchema, type CreateContactFormData } from '@/lib/validators/student';
import { useCreateContact, useUpdateContact } from '@/hooks/use-students';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Contact } from '@/types/student';

interface Props {
  studentId: string;
  contact?: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContactFormDialog({ studentId, contact, open, onOpenChange }: Props) {
  const createContact = useCreateContact(studentId);
  const updateContact = useUpdateContact(studentId);
  const isEditing = !!contact;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createContactSchema),
    values: contact
      ? {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone ?? '',
          relationship: contact.relationship,
          isPrimary: contact.isPrimary,
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          relationship: '',
          isPrimary: false,
        },
  });

  async function onSubmit(data: CreateContactFormData) {
    const cleaned = {
      ...data,
      phone: data.phone || undefined,
    };

    if (isEditing && contact) {
      await updateContact.mutateAsync({ contactId: contact.id, data: cleaned });
    } else {
      await createContact.mutateAsync(cleaned);
    }

    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le contact' : 'Ajouter un contact'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Mettez à jour les informations du contact.'
              : 'Ajoutez un contact pour cet élève.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-firstName">Prénom *</Label>
              <Input id="contact-firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-lastName">Nom *</Label>
              <Input id="contact-lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email *</Label>
            <Input id="contact-email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Téléphone</Label>
              <Input id="contact-phone" placeholder="Optionnel" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-relationship">Relation *</Label>
              <Input id="contact-relationship" placeholder="Parent, Tuteur..." {...register('relationship')} />
              {errors.relationship && (
                <p className="text-xs text-destructive">{errors.relationship.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="contact-isPrimary"
              {...register('isPrimary')}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="contact-isPrimary" className="text-sm font-normal">
              Contact principal
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
