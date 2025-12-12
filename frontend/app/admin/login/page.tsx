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
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-neutral-950">
            {/* Animated Wavy Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Wavy Lines */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.2 }} />
                        </linearGradient>
                        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#ec4899', stopOpacity: 0.15 }} />
                            <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0.15 }} />
                        </linearGradient>
                    </defs>

                    {/* Animated wavy paths */}
                    <path
                        d="M0,100 Q250,50 500,100 T1000,100 L1000,0 L0,0 Z"
                        fill="url(#grad1)"
                        className="animate-wave"
                    >
                        <animate
                            attributeName="d"
                            dur="10s"
                            repeatCount="indefinite"
                            values="
                                M0,100 Q250,50 500,100 T1000,100 L1000,0 L0,0 Z;
                                M0,100 Q250,150 500,100 T1000,100 L1000,0 L0,0 Z;
                                M0,100 Q250,50 500,100 T1000,100 L1000,0 L0,0 Z
                            "
                        />
                    </path>

                    <path
                        d="M0,300 Q400,250 800,300 T1600,300 L1600,0 L0,0 Z"
                        fill="url(#grad2)"
                        opacity="0.5"
                    >
                        <animate
                            attributeName="d"
                            dur="15s"
                            repeatCount="indefinite"
                            values="
                                M0,300 Q400,250 800,300 T1600,300 L1600,0 L0,0 Z;
                                M0,300 Q400,350 800,300 T1600,300 L1600,0 L0,0 Z;
                                M0,300 Q400,250 800,300 T1600,300 L1600,0 L0,0 Z
                            "
                        />
                    </path>

                    <path
                        d="M0,500 Q300,450 600,500 T1200,500 L1200,0 L0,0 Z"
                        fill="url(#grad1)"
                        opacity="0.3"
                    >
                        <animate
                            attributeName="d"
                            dur="12s"
                            repeatCount="indefinite"
                            values="
                                M0,500 Q300,450 600,500 T1200,500 L1200,0 L0,0 Z;
                                M0,500 Q300,550 600,500 T1200,500 L1200,0 L0,0 Z;
                                M0,500 Q300,450 600,500 T1200,500 L1200,0 L0,0 Z
                            "
                        />
                    </path>
                </svg>

                {/* Gradient Orbs */}
                <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-neutral-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-neutral-800/50 p-8 md:p-10">
                    {/* Logo/Brand */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent mb-2">
                            JsFashion
                        </h1>
                        <p className="text-neutral-400 text-sm font-medium">Admin Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-neutral-300">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pl-12 h-12 rounded-2xl border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:bg-neutral-800 focus:border-neutral-600 transition-all duration-200 focus-visible:ring-neutral-600"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-neutral-300">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pl-12 h-12 rounded-2xl border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:bg-neutral-800 focus:border-neutral-600 transition-all duration-200 focus-visible:ring-neutral-600"
                                />
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive" className="rounded-2xl border-red-900/50 bg-red-950/50 backdrop-blur-sm">
                                <AlertDescription className="text-sm text-red-300">{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
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
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-neutral-600 mt-6">
                    © 2024 JsFashion. All rights reserved.
                </p>
            </div>
        </div>
    );
}
