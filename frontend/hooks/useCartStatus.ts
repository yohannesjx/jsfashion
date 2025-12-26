'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.jsfashion.et';

interface StoreSettings {
    cart_enabled?: {
        Bool: boolean;
        Valid: boolean;
    };
}

export function useCartStatus() {
    const { data, isLoading } = useQuery({
        queryKey: ['cart-status'],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_URL}/api/v1/admin/settings`, {
                    cache: 'no-store',
                });

                if (!response.ok) {
                    // Default to enabled if we can't fetch settings
                    return { cartEnabled: true };
                }

                const settings: StoreSettings = await response.json();
                return {
                    cartEnabled: settings.cart_enabled?.Bool ?? true
                };
            } catch (error) {
                // Default to enabled on error
                console.error('Failed to fetch cart status:', error);
                return { cartEnabled: true };
            }
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnWindowFocus: true,
    });

    return {
        cartEnabled: data?.cartEnabled ?? true,
        isLoading
    };
}
