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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Loader2,
    User,
    MapPin,
    CreditCard,
    Package,
    Calendar,
    Mail,
    Phone
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface OrderItem {
    id: number;
    product_name: string;
    variant_name: string;
    sku: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    image_url?: string;
}

interface Order {
    id: string;
    order_number: number;
    customer_first_name?: string;
    customer_last_name?: string;
    customer_email?: string;
    customer_phone?: string;
    status: string;
    total_amount: string;
    payment_method?: string;
    created_at: string;
}

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchOrderDetails();
    }, [params.id]);

    const fetchOrderDetails = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/orders/${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Order details:', data);
                setOrder(data.order);
                setItems(data.items || []);
            } else {
                console.error('Failed to fetch order:', response.status);
                toast.error('Failed to load order details');
            }
        } catch (error) {
            console.error('Failed to fetch order:', error);
            toast.error('Failed to load order details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!order) return;
        setIsUpdating(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/orders/${order.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                const updatedOrder = await response.json();
                setOrder({ ...order, status: updatedOrder.status });
                toast.success('Order status updated');
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
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
            case 'pending':
                return 'outline'; // Or a specific color for pending
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

    if (!order) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold">Order not found</h2>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/admin/orders">Back to Orders</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/orders">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            Order #{order.order_number}

                            <Badge variant={getStatusColor(order.status)} className="ml-2">
                                {order.status}
                            </Badge>
                        </h1>
                        <p className="text-neutral-500 text-sm flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={order.status}
                        onValueChange={handleStatusChange}
                        disabled={isUpdating}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                            <CardDescription>
                                {items.length} items in this order
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {item.image_url && (
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.product_name}
                                                            className="h-10 w-10 rounded object-cover bg-neutral-100"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{item.product_name}</div>
                                                        <div className="text-xs text-neutral-500">
                                                            {item.variant_name} {item.sku && `• ${item.sku}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {parseFloat(item.unit_price).toLocaleString()} Birr
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.quantity}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {parseFloat(item.subtotal).toLocaleString()} Birr
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold pt-6">
                                            Total Amount
                                        </TableCell>
                                        <TableCell className="text-right font-bold pt-6 text-lg">
                                            {parseFloat(order.total_amount).toLocaleString()} Birr
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Customer & Info */}
                <div className="space-y-6">
                    {/* Customer Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold">
                                    {order.customer_first_name?.[0] || 'U'}
                                </div>
                                <div>
                                    <div className="font-medium">
                                        {order.customer_first_name} {order.customer_last_name}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                        Customer ID: {order.id.substring(0, 8)}...
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-neutral-400" />
                                    <a href={`mailto:${order.customer_email}`} className="hover:underline">
                                        {order.customer_email || 'No email'}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-neutral-400" />
                                    <span>{order.customer_phone || 'No phone'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipping Card (Mocked for now as schema doesn't have address yet) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Shipping Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-neutral-500 italic">
                                Address information not available in current schema.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Payment Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Payment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Method</span>
                                <span className="font-medium capitalize">{order.payment_method || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Status</span>
                                <Badge variant="outline" className="capitalize">
                                    {order.status === 'cancelled' ? 'Refunded' : 'Paid'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
