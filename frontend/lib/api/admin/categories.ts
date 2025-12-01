import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './client';

// Types
export interface Category {
    id: string;
    name: string;
    slug: string;
    image_url?: string | null;
    is_active?: boolean | null;
    created_at: string;
    updated_at: string;
}

export interface CreateCategoryInput {
    name: string;
    slug?: string;
    image_url?: string;
    is_active?: boolean;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
    id: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string | null;
    base_price: string;
    category?: string | null;
    image_url?: string | null;
    is_active?: boolean | null;
    created_at: string;
    updated_at: string;
}

// Query Keys
export const categoryKeys = {
    all: ['categories'] as const,
    lists: () => [...categoryKeys.all, 'list'] as const,
    list: () => [...categoryKeys.lists()] as const,
    details: () => [...categoryKeys.all, 'detail'] as const,
    detail: (id: string) => [...categoryKeys.details(), id] as const,
    productCategories: (productId: string) => [...categoryKeys.all, 'product', productId] as const,
    categoryProducts: (slug: string, page?: number, limit?: number) => 
        [...categoryKeys.all, 'products', slug, page, limit] as const,
};

// Hooks
export function useCategories() {
    return useQuery({
        queryKey: categoryKeys.list(),
        queryFn: () => adminApi.get<Category[]>('/categories'),
    });
}

export function useCategory(id: string) {
    return useQuery({
        queryKey: categoryKeys.detail(id),
        queryFn: () => adminApi.get<Category>(`/categories/${id}`),
        enabled: !!id,
    });
}

export function useProductCategories(productId: string) {
    return useQuery({
        queryKey: categoryKeys.productCategories(productId),
        queryFn: () => adminApi.get<Category[]>(`/products/${productId}/categories`),
        enabled: !!productId,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCategoryInput) => adminApi.post<Category>('/categories', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateCategoryInput) => 
            adminApi.put<Category>(`/categories/${id}`, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: categoryKeys.detail(variables.id) });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminApi.delete(`/categories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
        },
    });
}

export function useSetProductCategories() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ productId, categoryIds }: { productId: string; categoryIds: string[] }) => 
            adminApi.put(`/products/${productId}/categories`, { category_ids: categoryIds }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.productCategories(variables.productId) });
            queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.productId] });
        },
    });
}

export function useCategoryProducts(slug: string, page: number = 1, limit: number = 100) {
    return useQuery({
        queryKey: categoryKeys.categoryProducts(slug, page, limit),
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            return adminApi.get<Product[]>(`/categories/${slug}/products?${params.toString()}`);
        },
        enabled: !!slug,
    });
}



