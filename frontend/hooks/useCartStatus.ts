'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.jsfashion.et';

export function useCartStatus() {
    const { data, isLoading } = useQuery({
        queryKey: ['cart-status'],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_URL}/api/v1/cart-status`, {
                    cache: 'no-store',
                });

                if (!response.ok) {
                    // Default to enabled if we can't fetch settings
                    return { cartEnabled: true };
                }

                const data = await response.json();
                return {
                    cartEnabled: data.cart_enabled ?? true
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
