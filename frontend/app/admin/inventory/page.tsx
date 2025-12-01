'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Package, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface InventoryStats {
    low_stock_count: number;
    total_stock_items: number;
}

interface LowStockVariant {
    id: number;
    sku: string;
    stock_quantity: number;
    product_name: string;
    image_url?: { String: string; Valid: boolean };
}

export default function InventoryPage() {
    const [stats, setStats] = useState<InventoryStats | null>(null);
    const [lowStockItems, setLowStockItems] = useState<LowStockVariant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchInventoryData();
    }, []);

    const fetchInventoryData = async () => {
        try {
            const token = localStorage.getItem('access_token');

            // Fetch stats
            const statsResponse = await fetch(`${API_URL}/api/v1/admin/inventory/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }

            // Fetch low stock items (threshold < 1)
            const lowStockResponse = await fetch(`${API_URL}/api/v1/admin/inventory/low-stock?threshold=1`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (lowStockResponse.ok) {
                const lowStockData = await lowStockResponse.json();
                setLowStockItems(lowStockData || []);
            }
        } catch (error) {
            console.error('Failed to fetch inventory data:', error);
            toast.error('Failed to load inventory data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportCSV = () => {
        toast.info('CSV export coming soon');
    };

    const handleImportCSV = () => {
        toast.info('CSV import coming soon');
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
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-neutral-500 mt-1">
                        Monitor stock levels and manage inventory
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button onClick={handleImportCSV}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import CSV
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock Items</CardTitle>
                        <Package className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_stock_items?.toLocaleString() || 0}</div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Across all variants
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-900">Low Stock Alert</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900">{stats?.low_stock_count || 0}</div>
                        <p className="text-xs text-orange-700 mt-1">
                            Items with stock &lt; 1
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stock Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.total_stock_items && stats?.low_stock_count !== undefined
                                ? Math.round(((stats.total_stock_items - stats.low_stock_count) / stats.total_stock_items) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Items in stock
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Items */}
            {lowStockItems.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <h2 className="text-xl font-semibold">Low Stock Items</h2>
                        <Badge variant="destructive">{lowStockItems.length}</Badge>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead className="w-[100px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowStockItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {item.image_url?.Valid && (
                                                    <div className="relative h-10 w-10 rounded overflow-hidden bg-neutral-100">
                                                        <Image
                                                            src={item.image_url.String}
                                                            alt={item.product_name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <span className="font-medium">{item.product_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.stock_quantity === 0 ? 'destructive' : 'secondary'}>
                                                {item.stock_quantity} units
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="outline">
                                                Restock
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {lowStockItems.length === 0 && !isLoading && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="h-12 w-12 text-neutral-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">All Stock Levels Healthy</h3>
                        <p className="text-neutral-500 text-center">
                            No items are currently low on stock
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
