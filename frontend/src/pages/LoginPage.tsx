import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/auth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const verifySchema = z.object({
  code: z
    .string()
    .length(6, 'Le code doit contenir 6 chiffres')
    .regex(/^\d{6}$/, 'Le code doit contenir uniquement des chiffres'),
});

type LoginForm = z.infer<typeof loginSchema>;
type VerifyForm = z.infer<typeof verifySchema>;

export default function LoginPage() {
  const { login, verifyDevice, cancelVerification, pendingVerification } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });

  async function onLoginSubmit(data: LoginForm) {
    setError('');
    try {
      await login(data.email, data.password);
      if (!pendingVerification) {
        navigate('/');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  }

  async function onVerifySubmit(data: VerifyForm) {
    setError('');
    try {
      await verifyDevice(data.code);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Code invalide ou expiré. Veuillez réessayer.');
      }
    }
  }

  if (pendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Vérification de l'appareil
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Un code à 6 chiffres a été envoyé à l'adresse de sécurité. Entrez-le ci-dessous.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">Code de vérification</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="text-center text-xl tracking-widest font-mono"
                  {...verifyForm.register('code')}
                />
                {verifyForm.formState.errors.code && (
                  <p className="text-xs text-destructive">{verifyForm.formState.errors.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={verifyForm.formState.isSubmitting}
              >
                {verifyForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  cancelVerification();
                  setError('');
                  verifyForm.reset();
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Formel
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connectez-vous à votre compte
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nom@exemple.com"
                autoComplete="email"
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
