import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface Category {
    id: string;
    name: string;
    slug: string;
    image_url?: string | null;
    is_active?: boolean | null;
}

export const categoryKeys = {
    all: ['categories'] as const,
    list: () => [...categoryKeys.all, 'list'] as const,
};

export function useCategories() {
    return useQuery({
        queryKey: categoryKeys.list(),
        queryFn: () => api.get<Category[]>('/categories'),
    });
}
