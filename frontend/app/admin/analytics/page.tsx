'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, TrendingUp, DollarSign, Users, ShoppingCart, Package } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface SalesAnalytics {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    unique_customers: number;
}

interface TopProduct {
    id: number;
    product_name: string;
    image_url?: { String: string; Valid: boolean };
    order_count: number;
    total_quantity_sold: number;
    total_revenue: number;
}

interface CustomerMetrics {
    total_customers: number;
    repeat_customers: number;
    repeat_customer_rate: number;
    avg_orders_per_customer: number;
}

export default function AnalyticsPage() {
    const [salesData, setSalesData] = useState<SalesAnalytics | null>(null);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30'); // days

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(dateRange));

            const params = new URLSearchParams({
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
            });

            // Fetch sales analytics
            const salesResponse = await fetch(`${API_URL}/api/v1/admin/analytics/sales?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (salesResponse.ok) {
                const data = await salesResponse.json();
                setSalesData(data);
            }

            // Fetch top products
            const productsResponse = await fetch(`${API_URL}/api/v1/admin/analytics/top-products?${params}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (productsResponse.ok) {
                const data = await productsResponse.json();
                setTopProducts(data || []);
            }

            // Fetch customer metrics
            const metricsResponse = await fetch(`${API_URL}/api/v1/admin/analytics/customer-metrics?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (metricsResponse.ok) {
                const data = await metricsResponse.json();
                setCustomerMetrics(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setIsLoading(false);
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
                    <p className="text-neutral-500 mt-1">
                        Track your store's performance and insights
                    </p>
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Sales Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {salesData?.total_revenue?.toLocaleString() || 0} Birr
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            From {salesData?.total_orders || 0} orders
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {salesData?.average_order_value?.toLocaleString() || 0} Birr
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Per transaction
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {salesData?.total_orders?.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Completed transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                        <Users className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {salesData?.unique_customers?.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Active shoppers
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Customer Metrics */}
            {customerMetrics && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {customerMetrics.repeat_customer_rate.toFixed(1)}%
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                {customerMetrics.repeat_customers} of {customerMetrics.total_customers} customers
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Orders Per Customer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {customerMetrics.avg_orders_per_customer.toFixed(1)}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                Customer lifetime orders
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {customerMetrics.total_customers - customerMetrics.repeat_customers}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                First-time buyers
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Top Selling Products */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Top Selling Products
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Orders</TableHead>
                                <TableHead>Quantity Sold</TableHead>
                                <TableHead>Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topProducts.length > 0 ? (
                                topProducts.map((product, index) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                                                    {index + 1}
                                                </Badge>
                                                {product.image_url?.Valid && (
                                                    <div className="relative h-10 w-10 rounded overflow-hidden bg-neutral-100">
                                                        <Image
                                                            src={product.image_url.String}
                                                            alt={product.product_name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <span className="font-medium">{product.product_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.order_count}</TableCell>
                                        <TableCell>{product.total_quantity_sold}</TableCell>
                                        <TableCell className="font-semibold">
                                            {product.total_revenue.toLocaleString()} Birr
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-neutral-500 py-8">
                                        No sales data available for this period
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
