import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

export interface CartItem {
    productId: number;
    productSlug: string;
    productTitle: string;
    variantId: string; // Changed to string to support UUID variant IDs
    variantName: string;
    price: number;
    currency: string;
    quantity: number;
    maxStock: number; // Added to track available stock
    thumbnail: string | null;
}

interface CartStore {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    removeItem: (variantId: string) => void; // Changed to string
    updateQuantity: (variantId: string, quantity: number) => void; // Changed to string
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) => {
                set((state) => {
                    const existingItem = state.items.find(i => i.variantId === item.variantId);
                    const quantityToAdd = item.quantity || 1;

                    if (existingItem) {
                        // Check stock limit
                        if (existingItem.quantity + quantityToAdd > existingItem.maxStock) {
                            toast.error(`Only ${existingItem.maxStock} items available in stock`);
                            return { items: state.items };
                        }

                        // Increment quantity if item already exists
                        return {
                            items: state.items.map(i =>
                                i.variantId === item.variantId
                                    ? { ...i, quantity: i.quantity + quantityToAdd }
                                    : i
                            ),
                        };
                    } else {
                        // Check stock limit for new item
                        if (quantityToAdd > item.maxStock) {
                            toast.error(`Only ${item.maxStock} items available in stock`);
                            return { items: state.items };
                        }

                        // Add new item
                        return {
                            items: [...state.items, { ...item, quantity: quantityToAdd }],
                        };
                    }
                });
            },

            removeItem: (variantId) => {
                set((state) => ({
                    items: state.items.filter(i => i.variantId !== variantId),
                }));
            },

            updateQuantity: (variantId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(variantId);
                    return;
                }

                set((state) => ({
                    items: state.items.map(i => {
                        if (i.variantId === variantId) {
                            // Check stock limit
                            if (quantity > i.maxStock) {
                                toast.error(`Only ${i.maxStock} items available in stock`);
                                return i; // Don't update if exceeds stock
                            }
                            return { ...i, quantity };
                        }
                        return i;
                    }),
                }));
            },

            clearCart: () => {
                set({ items: [] });
            },

            getTotalItems: () => {
                return get().items.reduce((total, item) => total + item.quantity, 0);
            },

            getTotalPrice: () => {
                return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);
