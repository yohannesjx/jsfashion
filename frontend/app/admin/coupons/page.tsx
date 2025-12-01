'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Loader2,
    Tag
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface Coupon {
    id: number;
    code: string;
    type: 'percentage' | 'fixed';
    value: string;
    usage_limit?: number;
    usage_count: number;
    starts_at?: string;
    expires_at?: string;
    is_active: boolean;
}

export default function CouponsPage() {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/coupons`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCoupons(data || []);
            } else {
                console.error('Failed to fetch coupons:', response.status);
                toast.error('Failed to fetch coupons');
            }
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
            toast.error('Failed to fetch coupons');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/coupons/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setCoupons(coupons.filter(c => c.id !== id));
                toast.success('Coupon deleted successfully');
            } else {
                toast.error('Failed to delete coupon');
            }
        } catch (error) {
            console.error('Failed to delete coupon:', error);
            toast.error('Failed to delete coupon');
        }
    };

    const filteredCoupons = coupons.filter(coupon =>
        coupon.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
                    <p className="text-neutral-500 mt-1">
                        Manage discounts and promo codes
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/coupons/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Coupon
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                        placeholder="Search coupons..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredCoupons.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-neutral-500">
                                    No coupons found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCoupons.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-neutral-500" />
                                            <span className="font-mono font-medium">{coupon.code}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {coupon.type === 'percentage' ? (
                                            <Badge variant="secondary">{coupon.value}% OFF</Badge>
                                        ) : (
                                            <Badge variant="outline">{parseFloat(coupon.value).toLocaleString()} Birr OFF</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span className="font-medium">{coupon.usage_count}</span>
                                            <span className="text-neutral-500"> / {coupon.usage_limit || '∞'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                                            {coupon.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-neutral-500 text-sm">
                                        {coupon.expires_at
                                            ? new Date(coupon.expires_at).toLocaleDateString()
                                            : 'Never'}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/coupons/${coupon.id}`}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDelete(coupon.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
