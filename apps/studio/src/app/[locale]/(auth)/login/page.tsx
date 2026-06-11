'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const t = useTranslations('login');
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const errorMessages: Record<string, string> = {
        CredentialsSignin: t('invalidCredentials'),
        'Insufficient permissions. GM access required.': t('insufficientPermissions'),
        'Account is deactivated': t('accountDeactivated'),
        'Account is temporarily locked': t('accountLocked'),
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                login,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(errorMessages[result.error] || t('unknownError'));
                return;
            }

            if (result?.ok) {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError(t('unknownError'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t('title')}</CardTitle>
                <CardDescription>{t('subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="login">{t('loginLabel')}</Label>
                        <Input
                            id="login"
                            type="text"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            placeholder="admin"
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('passwordLabel')}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        <LogIn className="h-4 w-4 mr-2" />
                        {loading ? t('signingIn') : t('submit')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
