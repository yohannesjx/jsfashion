import { useQuery } from '@tanstack/react-query';
import { adminApi } from './client';

// Types
export interface DashboardStats {
    revenue_today: string;
    revenue_week: string;
    revenue_month: string;
    orders_today: number;
    orders_week: number;
    orders_month: number;
    customers_today: number;
    customers_week: number;
    customers_month: number;
    products_total: number;
}

export interface RecentOrder {
    id: string;
    customer_name?: string | null;
    customer_email?: string | null;
    total: string;
    status: string;
    created_at: string;
}

export interface TopProduct {
    id: string;
    name: string;
    image_url?: string | null;
    total_sold: number;
    revenue: string;
}

export interface SalesData {
    date: string;
    revenue: string | number;
    orders: number;
}

// Query Keys
export const dashboardKeys = {
    all: ['dashboard'] as const,
    stats: () => [...dashboardKeys.all, 'stats'] as const,
    recentOrders: () => [...dashboardKeys.all, 'recent-orders'] as const,
    topProducts: () => [...dashboardKeys.all, 'top-products'] as const,
    salesData: (period: string) => [...dashboardKeys.all, 'sales', period] as const,
};

// Hooks
export function useDashboardStats() {
    return useQuery({
        queryKey: dashboardKeys.stats(),
        queryFn: () => adminApi.get<DashboardStats>('/dashboard/stats'),
    });
}

export function useRecentOrders(limit = 10) {
    return useQuery({
        queryKey: dashboardKeys.recentOrders(),
        queryFn: () => adminApi.get<RecentOrder[]>(`/dashboard/recent-orders?limit=${limit}`),
    });
}

export function useTopProducts(limit = 10) {
    return useQuery({
        queryKey: dashboardKeys.topProducts(),
        queryFn: () => adminApi.get<TopProduct[]>(`/dashboard/top-products?limit=${limit}`),
    });
}

export function useSalesData(period: 'week' | 'month' | 'year' = 'month') {
    return useQuery({
        queryKey: dashboardKeys.salesData(period),
        queryFn: () => adminApi.get<SalesData[]>(`/dashboard/sales?period=${period}`),
    });
}

