import { useQuery } from '@tanstack/react-query';
import { adminApi } from './client';

// Types
export interface Customer {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at: string;
}

export interface CustomerDetail extends Customer {
    orders_count?: number;
    total_spent?: string;
    last_order_date?: string | null;
}

// Query Keys
export const customerKeys = {
    all: ['customers'] as const,
    lists: () => [...customerKeys.all, 'list'] as const,
    list: (filters?: string) => [...customerKeys.lists(), filters] as const,
    details: () => [...customerKeys.all, 'detail'] as const,
    detail: (id: string) => [...customerKeys.details(), id] as const,
};

// Hooks
export function useCustomers() {
    return useQuery({
        queryKey: customerKeys.lists(),
        queryFn: () => adminApi.get<Customer[]>('/customers'),
    });
}

export function useCustomer(id: string) {
    return useQuery({
        queryKey: customerKeys.detail(id),
        queryFn: () => adminApi.get<CustomerDetail>(`/customers/${id}`),
        enabled: !!id,
    });
}

