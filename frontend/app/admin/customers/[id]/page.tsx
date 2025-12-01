'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Loader2,
    User,
    Mail,
    Phone,
    Calendar,
    ShoppingBag,
    CreditCard,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface Order {
    id: string;
    status: string;
    total_amount: string;
    created_at: string;
}

interface Customer {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string;
    created_at: string;
    total_orders: number;
    total_spent: string;
    last_order_date?: string;
}

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCustomerDetails();
    }, [params.id]);

    const fetchCustomerDetails = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/customers/${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Customer details:', data);
                setCustomer(data.customer);
                setOrders(data.orders || []);
            } else {
                console.error('Failed to fetch customer:', response.status);
                toast.error('Failed to load customer details');
            }
        } catch (error) {
            console.error('Failed to fetch customer:', error);
            toast.error('Failed to load customer details');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
            case 'completed':
                return 'default';
            case 'processing':
            case 'shipped':
                return 'secondary';
            case 'cancelled':
            case 'failed':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold">Customer not found</h2>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/admin/customers">Back to Customers</Link>
                </Button>
            </div>
        );
    }

    const avgOrderValue = customer.total_orders > 0
        ? parseFloat(customer.total_spent) / customer.total_orders
        : 0;

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/customers">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        {customer.first_name} {customer.last_name}
                    </h1>
                    <p className="text-neutral-500 text-sm flex items-center gap-2 mt-1">
                        Customer since {new Date(customer.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {parseFloat(customer.total_spent).toLocaleString()} Birr
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Lifetime Value
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customer.total_orders}</div>
                        <p className="text-xs text-muted-foreground">
                            Completed orders
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} Birr
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per order average
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order History */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order History</CardTitle>
                            <CardDescription>
                                Recent orders from this customer
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <div className="text-center py-8 text-neutral-500">
                                    No orders found.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono text-xs">
                                                    {order.id.substring(0, 8)}...
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusColor(order.status)}>
                                                        {order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {parseFloat(order.total_amount).toLocaleString()} Birr
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={`/admin/orders/${order.id}`}>
                                                            <ArrowLeft className="h-4 w-4 rotate-180" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Contact Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold text-lg">
                                    {customer.first_name?.[0] || 'U'}
                                </div>
                                <div>
                                    <div className="font-medium">
                                        {customer.first_name} {customer.last_name}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                        ID: {customer.id.substring(0, 8)}...
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-neutral-400" />
                                    <a href={`mailto:${customer.email}`} className="hover:underline">
                                        {customer.email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-neutral-400" />
                                    <span>{customer.phone || 'No phone number'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-4 w-4 text-neutral-400" />
                                    <span>Joined {new Date(customer.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
