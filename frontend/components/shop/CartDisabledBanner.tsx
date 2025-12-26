'use client';

import { useCartStatus } from '@/hooks/useCartStatus';
import { AlertCircle } from 'lucide-react';

export function CartDisabledBanner() {
    const { cartEnabled, isLoading } = useCartStatus();

    if (isLoading || cartEnabled) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 px-4 sticky top-0 z-50 shadow-md">
            <div className="container mx-auto flex items-center justify-center gap-2 text-center">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm md:text-base font-semibold">
                    We can't take orders now. Please visit the shop as we are on BIGGEST SALE!
                </p>
            </div>
        </div>
    );
}
