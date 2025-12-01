import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './client';

// Types
export interface Order {
    id: string;
    customer_id?: string | null;
    status: string;
    total_amount: string;
    payment_method?: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    variant_id: string | number;
    quantity: number;
    unit_price: string;
    subtotal: string;
}

export interface OrderDetail extends Order {
    customer?: {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        phone?: string | null;
    } | null;
    items: OrderItem[];
}

export interface UpdateOrderInput {
    id: string;
    status?: string;
    payment_method?: string;
}

// Query Keys
export const orderKeys = {
    all: ['orders'] as const,
    lists: () => [...orderKeys.all, 'list'] as const,
    list: (filters?: string) => [...orderKeys.lists(), filters] as const,
    details: () => [...orderKeys.all, 'detail'] as const,
    detail: (id: string) => [...orderKeys.details(), id] as const,
};

// Hooks
export function useOrders() {
    return useQuery({
        queryKey: orderKeys.lists(),
        queryFn: () => adminApi.get<Order[]>('/orders'),
    });
}

export function useOrder(id: string) {
    return useQuery({
        queryKey: orderKeys.detail(id),
        queryFn: () => adminApi.get<OrderDetail>(`/orders/${id}`),
        enabled: !!id,
    });
}

export function useUpdateOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateOrderInput) => 
            adminApi.put<Order>(`/orders/${id}`, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
        },
    });
}

