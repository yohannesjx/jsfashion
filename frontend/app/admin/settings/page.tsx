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
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Image } from 'lucide-react';
import { toast } from 'sonner';
import { MediaPicker } from '@/components/admin/MediaPicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [formData, setFormData] = useState({
        store_name: '',
        store_email: '',
        store_phone: '',
        currency: 'ETB',
        hero_banner_url: '',
        hero_title: '',
        hero_subtitle: '',
        cart_enabled: true
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
                    currency: data.currency?.String || 'ETB',
                    hero_banner_url: data.hero_banner_url?.String || '',
                    hero_title: data.hero_title?.String || '',
                    hero_subtitle: data.hero_subtitle?.String || '',
                    cart_enabled: data.cart_enabled?.Bool ?? true
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
                    currency: formData.currency || null,
                    hero_banner_url: formData.hero_banner_url || null,
                    hero_title: formData.hero_title || null,
                    hero_subtitle: formData.hero_subtitle || null,
                    cart_enabled: formData.cart_enabled
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
                        <Label htmlFor="hero_banner_url">Hero Banner Image</Label>
                        <div className="flex gap-2">
                            <Input
                                id="hero_banner_url"
                                value={formData.hero_banner_url}
                                onChange={(e) => setFormData({ ...formData, hero_banner_url: e.target.value })}
                                placeholder="Enter image URL or select from media library"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMediaPickerOpen(true)}
                            >
                                <Image className="w-4 h-4 mr-2" />
                                Select Image
                            </Button>
                        </div>
                        {formData.hero_banner_url && (
                            <div className="mt-2">
                                <img
                                    src={formData.hero_banner_url}
                                    alt="Hero Banner Preview"
                                    className="w-full max-w-md h-48 object-cover rounded border"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="hero_title">Hero Title</Label>
                        <Input
                            id="hero_title"
                            value={formData.hero_title}
                            onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                            placeholder="e.g., FUTURE\nCLASSICS (use \n for line break)"
                        />
                        <p className="text-sm text-neutral-500">
                            Use \n for line breaks (e.g., "FUTURE\nCLASSICS")
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="hero_subtitle">Hero Subtitle (Optional)</Label>
                        <Input
                            id="hero_subtitle"
                            value={formData.hero_subtitle}
                            onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
                            placeholder="e.g., Discover our latest collection"
                        />
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

                    <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="cart_enabled" className="text-base font-medium">Enable Shopping Cart</Label>
                            <p className="text-sm text-neutral-500">
                                When disabled, customers can browse products but cannot add items to cart. A notice will be displayed.
                            </p>
                        </div>
                        <Switch
                            id="cart_enabled"
                            checked={formData.cart_enabled}
                            onCheckedChange={(checked) => setFormData({ ...formData, cart_enabled: checked })}
                        />
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

            <MediaPicker
                isOpen={mediaPickerOpen}
                onClose={() => setMediaPickerOpen(false)}
                onSelect={(url) => {
                    setFormData({ ...formData, hero_banner_url: url });
                    setMediaPickerOpen(false);
                }}
            />
        </div>
    );
}
