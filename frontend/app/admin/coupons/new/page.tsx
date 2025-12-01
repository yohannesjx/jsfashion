'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export default function CouponFormPage({ params }: { params?: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const isEditing = !!params?.id;
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(isEditing);

    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage',
        value: '',
        min_order_value: '',
        usage_limit: '',
        expires_at: '',
        is_active: true
    });

    useEffect(() => {
        if (isEditing) {
            fetchCoupon();
        }
    }, [params?.id]);

    const fetchCoupon = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/coupons/${params?.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setFormData({
                    code: data.code,
                    type: data.type,
                    value: data.value,
                    min_order_value: data.min_order_value?.String || '',
                    usage_limit: data.usage_limit?.Int32?.toString() || '',
                    expires_at: data.expires_at?.Valid ? new Date(data.expires_at.Time).toISOString().split('T')[0] : '',
                    is_active: data.is_active?.Bool ?? true
                });
            } else {
                toast.error('Failed to load coupon');
                router.push('/admin/coupons');
            }
        } catch (error) {
            console.error('Failed to fetch coupon:', error);
            toast.error('Failed to load coupon');
        } finally {
            setIsFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const url = isEditing
                ? `${API_URL}/api/v1/admin/coupons/${params?.id}`
                : `${API_URL}/api/v1/admin/coupons`;

            const method = isEditing ? 'PUT' : 'POST';

            const body = {
                code: formData.code.toUpperCase(),
                type: formData.type,
                value: formData.value,
                min_order_value: formData.min_order_value || null,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
                expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
                is_active: formData.is_active
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                toast.success(isEditing ? 'Coupon updated' : 'Coupon created');
                router.push('/admin/coupons');
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to save coupon');
            }
        } catch (error) {
            console.error('Failed to save coupon:', error);
            toast.error('Failed to save coupon');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/coupons">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isEditing ? 'Edit Coupon' : 'Create Coupon'}
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        {isEditing ? 'Update existing discount code' : 'Add a new discount code'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="code">Coupon Code</Label>
                        <Input
                            id="code"
                            placeholder="e.g. SUMMER20"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            required
                            className="font-mono uppercase"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Discount Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount (Birr)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="value">Discount Value</Label>
                            <Input
                                id="value"
                                type="number"
                                placeholder={formData.type === 'percentage' ? '20' : '100'}
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                required
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="min_order">Min. Order Value (Optional)</Label>
                            <Input
                                id="min_order"
                                type="number"
                                placeholder="0"
                                value={formData.min_order_value}
                                onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                                min="0"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="usage_limit">Usage Limit (Optional)</Label>
                            <Input
                                id="usage_limit"
                                type="number"
                                placeholder="∞"
                                value={formData.usage_limit}
                                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
                        <Input
                            id="expires_at"
                            type="date"
                            value={formData.expires_at}
                            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Active Status</Label>
                            <p className="text-sm text-neutral-500">
                                Enable or disable this coupon
                            </p>
                        </div>
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button variant="outline" type="button" asChild>
                        <Link href="/admin/coupons">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? 'Update Coupon' : 'Create Coupon'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
