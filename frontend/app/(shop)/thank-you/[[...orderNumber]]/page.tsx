"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";

export default function ThankYouPage({ params }: { params: { orderNumber?: string[] } }) {
    const [mounted, setMounted] = useState(false);
    // Get order number from URL params (it's an array due to [[...orderNumber]])
    const orderNumber = params?.orderNumber?.[0] || "—";

    const cartItems = useCartStore((state) => state.items);
    const getTotalPrice = useCartStore((state) => state.getTotalPrice);

    useEffect(() => {
        // Scroll to top
        window.scrollTo(0, 0);
        setMounted(true);
    }, []);

    const total = getTotalPrice();

    return (
        <main className="min-h-screen bg-white text-black py-12 px-4">
            <div className="max-w-2xl w-full mx-auto space-y-6">
                {/* Warning Notice */}
                <div className="bg-red-600 text-white p-4 rounded-lg text-center">
                    <p className="font-medium">⚠️ Unpaid orders will be canceled after 30min</p>
                    <p className="text-sm mt-1 flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4" />
                        Contact: 0972727239
                    </p>
                </div>

                {/* Success Icon */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                        <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
                    </div>
                </div>

                {/* Thank You Message */}
                <div className="space-y-3 text-center">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
                        THANK YOU!
                    </h1>
                    <p className="text-lg text-neutral-600">
                        Your order has been successfully placed
                    </p>
                </div>

                {/* Order Number */}
                <div className="bg-neutral-50 border border-neutral-200 p-6 rounded-lg text-center">
                    <p className="text-sm text-neutral-600 mb-2">Order Number</p>
                    <p className="text-3xl font-bold tracking-wider">{orderNumber}</p>
                </div>

                {/* Ordered Products */}
                {mounted && cartItems.length > 0 && (
                    <div className="border border-neutral-200 rounded-lg p-4">
                        <h2 className="font-bold text-lg mb-4">Order Summary</h2>
                        <div className="space-y-3">
                            {cartItems.map((item) => (
                                <div key={item.variantId} className="flex gap-3 items-center">
                                    <div className="w-16 h-16 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                                        {item.thumbnail ? (
                                            <img
                                                src={item.thumbnail}
                                                alt={item.productTitle}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{item.productTitle}</p>
                                        <p className="text-xs text-neutral-500">{item.variantName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">Qty: {item.quantity}</p>
                                        <p className="text-sm text-neutral-600">{item.price} {item.currency}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-neutral-200 mt-4 pt-4 flex justify-between items-center">
                            <span className="font-bold">Total</span>
                            <span className="font-bold text-lg">{total} ETB</span>
                        </div>
                    </div>
                )}

                {/* What's Next */}
                <div className="bg-neutral-50 p-6 rounded-lg space-y-4">
                    <h2 className="font-bold text-lg">What happens next?</h2>
                    <ul className="space-y-3 text-sm text-neutral-600">
                        <li className="flex items-start gap-3">
                            <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">1</span>
                            <span>We'll send you a confirmation email with your order details</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">2</span>
                            <span><strong>Orders will be delivered same day or next day</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">3</span>
                            <span>Your order will be processed and prepared for shipping</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">4</span>
                            <span>You'll receive a tracking number once your order ships</span>
                        </li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-4 pt-4">
                    <Button asChild className="flex-1 h-12 bg-black text-white hover:bg-neutral-800 rounded-lg">
                        <Link href="/">CONTINUE SHOPPING</Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1 h-12 border-black text-black hover:bg-black hover:text-white rounded-lg">
                        <Link href="/account/orders">VIEW ORDERS</Link>
                    </Button>
                </div>

                {/* Support */}
                <div className="pt-6 border-t border-neutral-200 text-center">
                    <p className="text-sm text-neutral-600">
                        Need help? <Link href="/contact" className="underline font-medium text-black">Contact our support team</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
