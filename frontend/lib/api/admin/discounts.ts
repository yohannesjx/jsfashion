import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './client';

// Types
export interface Discount {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: string;
    minimum_amount?: string | null;
    active_from?: string | null;
    active_until?: string | null;
    usage_limit?: number | null;
    usage_count?: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateDiscountInput {
    code: string;
    type: 'percentage' | 'fixed';
    value: string;
    minimum_amount?: string;
    active_from?: string;
    active_until?: string;
    usage_limit?: number;
    is_active?: boolean;
}

export interface UpdateDiscountInput extends Partial<CreateDiscountInput> {
    id: string;
}

// Query Keys
export const discountKeys = {
    all: ['discounts'] as const,
    lists: () => [...discountKeys.all, 'list'] as const,
    list: (filters?: string) => [...discountKeys.lists(), filters] as const,
    details: () => [...discountKeys.all, 'detail'] as const,
    detail: (id: string) => [...discountKeys.details(), id] as const,
};

// Hooks
export function useDiscounts() {
    return useQuery({
        queryKey: discountKeys.lists(),
        queryFn: () => adminApi.get<Discount[]>('/discounts'),
    });
}

export function useDiscount(id: string) {
    return useQuery({
        queryKey: discountKeys.detail(id),
        queryFn: () => adminApi.get<Discount>(`/discounts/${id}`),
        enabled: !!id,
    });
}

export function useCreateDiscount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateDiscountInput) => adminApi.post<Discount>('/discounts', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
        },
    });
}

export function useUpdateDiscount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateDiscountInput) => 
            adminApi.put<Discount>(`/discounts/${id}`, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
            queryClient.invalidateQueries({ queryKey: discountKeys.detail(variables.id) });
        },
    });
}

export function useDeleteDiscount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminApi.delete(`/discounts/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
        },
    });
}

