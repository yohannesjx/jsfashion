"use client";

import { Button } from "@/components/ui/button";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface Order {
    id: string;
    customer_id: string;
    status: string;
    total_amount: string;
    created_at: string;
    customer?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
}

export function AdminTopbar() {
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPendingOrders = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;

                const headers = { 'Authorization': `Bearer ${token}` };
                const res = await fetch(`${API_URL}/api/v1/admin/orders?status=pending&limit=5`, { headers });

                if (res.ok) {
                    const data = await res.json();
                    setPendingOrders(data || []);
                }
            } catch (error) {
                console.error('Failed to fetch pending orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPendingOrders();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="h-16 bg-background border-b border-border px-6 flex items-center justify-between sticky top-0 z-10">
            {/* Search */}
            <div className="w-96">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search anything..."
                        className="pl-10 bg-muted/50 border-border focus:bg-background transition-all"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
                    <Sun className="w-5 h-5" />
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted relative">
                            <Bell className="w-5 h-5" />
                            {pendingOrders.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {pendingOrders.length}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b">
                                <h3 className="font-semibold">Pending Orders</h3>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/admin/orders?status=pending">View All</Link>
                                </Button>
                            </div>
                            {isLoading ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
                            ) : pendingOrders.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {pendingOrders.map((order) => {
                                        const total = parseFloat(order.total_amount) / 100;
                                        const customerName = order.customer
                                            ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || order.customer.email
                                            : 'Guest';

                                        return (
                                            <Link
                                                key={order.id}
                                                href={`/admin/orders/${order.id}`}
                                                className="block p-3 rounded-lg hover:bg-muted transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">#{order.id.slice(0, 8)}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{customerName}</p>
                                                    </div>
                                                    <div className="text-right ml-2">
                                                        <p className="text-sm font-semibold">${total.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(order.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">No pending orders</p>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
    );
}
