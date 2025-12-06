'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, ShoppingCart, Users, Percent, Tags } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface DashboardStats {
    total_revenue: number;
    orders_today: number;
    total_orders: number;
    total_customers: number;
    conversion_rate: number;
    avg_order_value: number;
    total_sold: number;
    total_inventory_value: number;
    product_count: number;
    variant_count: number;
    total_variant_price: number;
}

interface SalesDataPoint {
    date: string;
    revenue: number;
    orders: number;
}

interface TopProduct {
    id: string;
    name: string;
    sales: number;
    revenue: number;
    image_url: string;
}

interface Order {
    id: string;
    order_number: number;
    customer_id: string;
    status: string;
    total_amount: string;
    payment_method: string;
    created_at: string;
    customer?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
}

export default function AdminDashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/admin/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const headers = {
                    'Authorization': `Bearer ${token}`,
                };

                // Fetch stats
                const statsRes = await fetch(`${API_URL}/api/v1/admin/dashboard/stats`, { headers });
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(statsData);
                }

                // Fetch sales data
                const salesRes = await fetch(`${API_URL}/api/v1/admin/dashboard/sales`, { headers });
                if (salesRes.ok) {
                    const salesData = await salesRes.json();
                    setSalesData(salesData || []);
                }

                // Fetch top products
                const productsRes = await fetch(`${API_URL}/api/v1/admin/dashboard/top-products`, { headers });
                if (productsRes.ok) {
                    const productsData = await productsRes.json();
                    setTopProducts(productsData || []);
                }

                // Fetch recent orders
                const ordersRes = await fetch(`${API_URL}/api/v1/admin/orders?limit=10`, { headers });
                if (ordersRes.ok) {
                    const ordersData = await ordersRes.json();
                    setRecentOrders(ordersData || []);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-neutral-500 mt-1">
                    Welcome back, {user.first_name || user.email}!
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Total Revenue</p>
                            <p className="text-3xl font-bold mt-2">
                                {stats?.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} Birr
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                        {stats?.total_sold || 0} items sold
                    </p>
                </div>

                <Link href="/admin/orders" className="block transition-transform hover:scale-[1.02]">
                    <div className="bg-white p-6 rounded-lg border border-neutral-200 h-full cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-neutral-500">Orders Today</p>
                                <p className="text-3xl font-bold mt-2">{stats?.orders_today || 0}</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <ShoppingCart className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">
                            {stats?.total_orders || 0} total orders
                        </p>
                    </div>
                </Link>

                <div className="bg-white p-6 rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Total Customers</p>
                            <p className="text-3xl font-bold mt-2">{stats?.total_customers || 0}</p>
                        </div>
                        <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">Active users</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Inventory Value</p>
                            <p className="text-3xl font-bold mt-2">
                                {stats?.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} Birr
                            </p>
                            {stats?.total_variant_price && stats.total_variant_price > 0 && (
                                <p className="text-xs text-neutral-400 mt-1">
                                    Catalog: {stats.total_variant_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Birr
                                </p>
                            )}
                        </div>
                        <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <Tags className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-2 space-y-1">
                        <p>{stats?.product_count || 0} Products</p>
                        <p>{stats?.variant_count || 0} Variants</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-lg border border-neutral-200">
                    <h2 className="text-lg font-semibold mb-4">Revenue Overview (Last 30 Days)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue (Birr)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Products Chart */}
                <div className="bg-white p-6 rounded-lg border border-neutral-200">
                    <h2 className="text-lg font-semibold mb-4">Top Products (Last 30 Days)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (Birr)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Products Table */}
            <div className="bg-white rounded-lg border border-neutral-200">
                <div className="p-6 border-b border-neutral-200">
                    <h2 className="text-lg font-semibold">Top Selling Products</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Product
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Sales
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Revenue
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                            {topProducts.length > 0 ? (
                                topProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-neutral-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {product.image_url && (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="h-10 w-10 rounded object-cover mr-3"
                                                    />
                                                )}
                                                <div className="text-sm font-medium text-neutral-900">
                                                    {product.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                            {product.sales} units
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                            {product.revenue.toFixed(2)} Birr
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                                        No sales data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg border border-neutral-200">
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent Orders</h2>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/admin/orders">View All</Link>
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Order ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                            {recentOrders.length > 0 ? (
                                recentOrders.map((order) => {
                                    const total = parseFloat(order.total_amount); // Removed / 100
                                    const customerName = order.customer
                                        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || order.customer.email
                                        : 'Guest';

                                    return (
                                        <tr key={order.id} className="hover:bg-neutral-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    #{order.order_number}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                                                {customerName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                'bg-neutral-100 text-neutral-800'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                                {total.toFixed(2)} Birr
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                        No orders yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
