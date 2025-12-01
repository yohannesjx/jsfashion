"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/cart";

export default function CartPage() {
    const cartItems = useCartStore((state) => state.items);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);
    const getTotalPrice = useCartStore((state) => state.getTotalPrice);

    const subtotal = getTotalPrice();

    return (
        <main className="min-h-screen bg-white text-black pb-32 md:pb-12">
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-12 text-center">YOUR CART</h1>

                {cartItems.length === 0 ? (
                    <div className="text-center space-y-6">
                        <p className="text-neutral-500">Your bag is empty.</p>
                        <Button asChild className="bg-black text-white hover:bg-neutral-800 rounded-none px-8 h-12">
                            <Link href="/">CONTINUE SHOPPING</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        {/* Cart Items List */}
                        <div className="space-y-8 mb-12">
                            {cartItems.map((item) => (
                                <div key={item.variantId} className="flex gap-4 md:gap-8 border-b border-neutral-100 pb-8">
                                    <div className="w-24 md:w-32 aspect-[3/4] bg-neutral-100 relative overflow-hidden flex-shrink-0">
                                        {item.thumbnail ? (
                                            <img
                                                src={item.thumbnail}
                                                alt={item.productTitle}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-neutral-200" />
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Link
                                                    href={`/product/${item.productSlug}`}
                                                    className="font-bold tracking-tight text-sm md:text-lg hover:underline"
                                                >
                                                    {item.productTitle}
                                                </Link>
                                                <p className="text-xs md:text-sm text-neutral-500 mt-1">
                                                    {item.variantName}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.variantId)}
                                                className="text-neutral-400 hover:text-black transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-end mt-4">
                                            <div className="flex items-center border border-neutral-200">
                                                <button
                                                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                                    className="p-2 hover:bg-neutral-50 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                                    disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                                                    className="p-2 hover:bg-neutral-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <p className="font-medium text-lg">{(item.price * item.quantity).toFixed(2)} {item.currency}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="space-y-4 text-right">
                            <div className="flex justify-between md:justify-end gap-12 text-lg font-medium">
                                <span>SUBTOTAL</span>
                                <span>{subtotal.toFixed(2)} Br</span>
                            </div>
                            <p className="text-neutral-500 text-sm">Shipping and taxes calculated at checkout.</p>

                            <div className="hidden md:block pt-8">
                                <Button asChild className="w-full md:w-96 bg-black text-white hover:bg-neutral-800 rounded-none h-14 text-lg tracking-widest">
                                    <Link href="/checkout">CHECKOUT</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Sticky Checkout */}
            {cartItems.length > 0 && (
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 p-4 md:hidden z-40 safe-area-pb">
                    <Button asChild className="w-full bg-black text-white hover:bg-neutral-800 rounded-none h-14 text-lg tracking-widest shadow-xl">
                        <Link href="/checkout">CHECKOUT • {subtotal.toFixed(2)} Br</Link>
                    </Button>
                </div>
            )}
        </main>
    );
}
