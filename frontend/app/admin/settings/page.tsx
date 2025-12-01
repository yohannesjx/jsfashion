'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        store_name: '',
        store_email: '',
        store_phone: '',
        currency: 'ETB'
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setFormData({
                    store_name: data.store_name || '',
                    store_email: data.store_email?.String || '',
                    store_phone: data.store_phone?.String || '',
                    currency: data.currency?.String || 'ETB'
                });
            } else {
                toast.error('Failed to load settings');
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    store_name: formData.store_name,
                    store_email: formData.store_email || null,
                    store_phone: formData.store_phone || null,
                    currency: formData.currency || null
                }),
            });

            if (response.ok) {
                toast.success('Settings updated successfully');
            } else {
                toast.error('Failed to update settings');
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
                <p className="text-neutral-500 mt-1">
                    Manage your store's profile and configuration
                </p>
            </div>
            <Separator />

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="store_name">Store Name</Label>
                        <Input
                            id="store_name"
                            value={formData.store_name}
                            onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="store_email">Store Email</Label>
                            <Input
                                id="store_email"
                                type="email"
                                value={formData.store_email}
                                onChange={(e) => setFormData({ ...formData, store_email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="store_phone">Store Phone</Label>
                            <Input
                                id="store_phone"
                                type="tel"
                                value={formData.store_phone}
                                onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                            value={formData.currency}
                            onValueChange={(value) => setFormData({ ...formData, currency: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ETB">Ethiopian Birr (ETB)</SelectItem>
                                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}
