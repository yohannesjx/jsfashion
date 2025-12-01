'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Load user from localStorage on mount
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/v1/admin/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                }
            } catch (error) {
                console.error('Failed to load user:', error);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // Auto-refresh token before expiry
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            refreshToken();
        }, 10 * 60 * 1000); // Refresh every 10 minutes

        return () => clearInterval(interval);
    }, [user]);

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/api/v1/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();

        // Store in localStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        // Also set cookies for middleware
        document.cookie = `access_token=${data.access_token}; path=/; max-age=900`; // 15 min
        document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=604800`; // 7 days

        setUser(data.user);
    };

    const logout = async () => {
        const refreshTokenValue = localStorage.getItem('refresh_token');

        if (refreshTokenValue) {
            try {
                await fetch(`${API_URL}/api/v1/admin/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refresh_token: refreshTokenValue }),
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        // Clear cookies
        document.cookie = 'access_token=; path=/; max-age=0';
        document.cookie = 'refresh_token=; path=/; max-age=0';

        setUser(null);
        router.push('/admin/login');
    };

    const refreshToken = useCallback(async () => {
        const refreshTokenValue = localStorage.getItem('refresh_token');

        if (!refreshTokenValue) {
            throw new Error('No refresh token');
        }

        try {
            const response = await fetch(`${API_URL}/api/v1/admin/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshTokenValue }),
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            setUser(data.user);
        } catch (error) {
            console.error('Token refresh failed:', error);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            router.push('/admin/login');
        }
    }, [router]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
