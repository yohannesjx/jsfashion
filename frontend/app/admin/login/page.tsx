'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            console.log('Attempting login...');
            await login(email, password);
            console.log('Login successful, redirecting...');
            // Use window.location for full page reload to ensure middleware picks up the new auth state
            window.location.href = '/admin';
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
                    {/* Logo/Brand */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-neutral-800 to-neutral-600 bg-clip-text text-transparent mb-2">
                            JsFashion
                        </h1>
                        <p className="text-neutral-500 text-sm font-medium">Admin Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-neutral-700">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@jsfashion.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pl-12 h-12 rounded-2xl border-neutral-200 bg-white/50 backdrop-blur-sm focus:bg-white transition-all duration-200 focus-visible:ring-neutral-300"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-neutral-700">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pl-12 h-12 rounded-2xl border-neutral-200 bg-white/50 backdrop-blur-sm focus:bg-white transition-all duration-200 focus-visible:ring-neutral-300"
                                />
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive" className="rounded-2xl border-red-200 bg-red-50/80 backdrop-blur-sm">
                                <AlertDescription className="text-sm">{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        {/* Helper Text */}
                        <div className="mt-6 p-4 bg-neutral-50/80 backdrop-blur-sm rounded-2xl border border-neutral-200">
                            <p className="text-xs text-center text-neutral-600 font-medium">
                                Demo Credentials
                            </p>
                            <p className="text-xs text-center text-neutral-500 mt-1">
                                admin@luxe.com / admin123
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-neutral-500 mt-6">
                    © 2024 JsFashion. All rights reserved.
                </p>
            </div>
        </div>
    );
}
