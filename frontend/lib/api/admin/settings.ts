import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './client';

// Types
export interface StoreSettings {
    store_name: string;
    contact_email: string;
    currency: string;
    logo_url?: string | null;
    support_email?: string | null;
}

export interface UpdateSettingsInput extends Partial<StoreSettings> {}

// Query Keys
export const settingsKeys = {
    all: ['settings'] as const,
    detail: () => [...settingsKeys.all, 'store'] as const,
};

// Hooks
export function useStoreSettings() {
    return useQuery({
        queryKey: settingsKeys.detail(),
        queryFn: () => adminApi.get<StoreSettings>('/settings'),
    });
}

export function useUpdateStoreSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateSettingsInput) => 
            adminApi.put<StoreSettings>('/settings', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
        },
    });
}

