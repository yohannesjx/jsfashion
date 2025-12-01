import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './client';

// Types
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

export interface ProductImage {
    id: string;
    product_id: string;
    url: string;
    alt_text?: string | null;
    display_order?: number | null;
    created_at: string;
}

export interface ProductVariant {
    id: string;
    product_id: string;
    sku: string;
    size?: { String: string; Valid: boolean } | string | null;
    color?: { String: string; Valid: boolean } | string | null;
    price_adjustment?: { String: string; Valid: boolean } | string | null;
    stock_quantity: number;
    display_order?: number;
    price?: number;
    created_at: string;
    updated_at: string;
}

export interface ProductDetail {
    product: Product;
    images: ProductImage[];
    variants: ProductVariant[];
}

export interface CreateProductInput {
    name: string;
    description?: string;
    base_price: string;
    category?: string;
    image_url?: string;
    is_active?: boolean;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
    id: string;
    images?: string[];
}

export interface CreateVariantInput {
    product_id: string;
    sku: string;
    size?: string;
    color?: string;
    price_adjustment?: string;
    stock_quantity: number;
    display_order?: number;
}

export interface UpdateVariantInput {
    id: string;
    sku?: string;
    size?: string;
    color?: string;
    price_adjustment?: string;
    stock_quantity?: number;
    display_order?: number;
    image?: string;
}

// Query Keys
export const productKeys = {
    all: ['products'] as const,
    lists: () => [...productKeys.all, 'list'] as const,
    list: (filters?: string) => [...productKeys.lists(), filters] as const,
    details: () => [...productKeys.all, 'detail'] as const,
    detail: (id: string) => [...productKeys.details(), id] as const,
    variants: (productId: string) => [...productKeys.detail(productId), 'variants'] as const,
};

// Hooks
export function useProducts() {
    return useQuery({
        queryKey: productKeys.lists(),
        queryFn: () => adminApi.get<Product[]>('/products'),
    });
}

export function useProduct(id: string) {
    return useQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => adminApi.get<ProductDetail>(`/products/${id}`),
        enabled: !!id,
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateProductInput) => adminApi.post<Product>('/products', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.lists() });
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateProductInput) =>
            adminApi.put<Product>(`/products/${id}`, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: productKeys.lists() });
            queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminApi.delete(`/products/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.lists() });
        },
    });
}

export function useVariants(productId: string) {
    return useQuery({
        queryKey: productKeys.variants(productId),
        queryFn: async () => {
            const product = await adminApi.get<ProductDetail>(`/products/${productId}`);
            return product.variants;
        },
        enabled: !!productId,
    });
}

export function useCreateVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateVariantInput) =>
            adminApi.post<ProductVariant>('/products/variants', data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: productKeys.variants(variables.product_id) });
            queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.product_id) });
        },
    });
}

export function useUpdateVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateVariantInput) =>
            adminApi.put<ProductVariant>(`/products/variants/${id}`, data),
        onSuccess: async (_, variables) => {
            // Get product_id from variant
            const variant = await adminApi.get<ProductVariant>(`/products/variants/${variables.id}`);
            queryClient.invalidateQueries({ queryKey: productKeys.variants(variant.product_id) });
            queryClient.invalidateQueries({ queryKey: productKeys.detail(variant.product_id) });
        },
    });
}

export function useDeleteVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
            await adminApi.delete(`/products/variants/${id}`);
            return { product_id: productId };
        },
        onSuccess: (result) => {
            if (result?.product_id) {
                queryClient.invalidateQueries({ queryKey: productKeys.variants(result.product_id) });
                queryClient.invalidateQueries({ queryKey: productKeys.detail(result.product_id) });
            }
        },
    });
}

export function useBulkUpdateVariants() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ productId, variants }: { productId: string; variants: UpdateVariantInput[] }) => {
            return adminApi.post<ProductVariant[]>(`/products/${productId}/variants/bulk`, { variants });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: productKeys.variants(variables.productId) });
            queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
        },
    });
}

