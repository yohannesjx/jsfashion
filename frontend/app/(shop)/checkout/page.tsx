"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { useCartStore } from "@/store/cart";

export default function CheckoutPage() {
    const router = useRouter();
    const [selectedDelivery, setSelectedDelivery] = useState("free");
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        couponCode: ""
    });

    const cartItems = useCartStore((state) => state.items);
    const getTotalPrice = useCartStore((state) => state.getTotalPrice);
    const clearCart = useCartStore((state) => state.clearCart);

    const subtotal = getTotalPrice();
    const deliveryFee = selectedDelivery === "outside" ? 800 : 0;
    const total = subtotal + deliveryFee;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCopy = (text: string, accountType: string) => {
        navigator.clipboard.writeText(text);
        setCopiedAccount(accountType);
        setTimeout(() => setCopiedAccount(null), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
            alert("Please fill in all required fields");
            return;
        }

        // Validate Ethiopian phone number
        const cleanPhone = formData.phone.replace(/\s/g, '').trim();
        const phoneRegex = /^(0[97]\d{8}|[97]\d{8})$/;

        if (!phoneRegex.test(cleanPhone)) {
            alert("Please enter a valid Ethiopian phone number (e.g., 0938965920, 938965920, 0738994444, or 738994444)");
            return;
        }

        if (cartItems.length === 0) {
            alert("Your cart is empty");
            return;
        }

        try {
            // Create order via API
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

            // Prepare order items
            const items = cartItems.map(item => ({
                variant_id: item.variantId.toString(), // Convert number to string
                quantity: item.quantity
            }));

            const orderData = {
                customer_id: null, // Guest checkout
                items: items,
                payment_method: "bank_transfer",
                shipping_address: {
                    full_name: formData.fullName,
                    phone: cleanPhone,
                    email: formData.email || null,
                    address: formData.address,
                    city: formData.city,
                    delivery_method: selectedDelivery
                }
            };

            console.log('Sending order data:', JSON.stringify(orderData, null, 2));

            const response = await fetch(`${API_URL}/api/v1/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create order');
            }

            const result = await response.json();
            const orderId = result.order?.id || result.id;

            // Clear cart and redirect to thank you page
            clearCart();
            router.push(`/thank-you/${orderId}`);
        } catch (error) {
            console.error('Order creation failed:', error);
            alert(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
        }
    };

    return (
        <main className="min-h-screen bg-white text-black py-8 pb-32">
            <div className="container mx-auto px-4 max-w-2xl">
                <h1 className="text-2xl md:text-3xl font-bold mb-8">Checkout</h1>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Contact Information */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="text"
                                name="fullName"
                                placeholder="Full Name"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                required
                                className="rounded-lg border-neutral-300"
                            />
                            <div className="flex items-center border border-neutral-300 rounded-lg px-3">
                                <span className="text-neutral-500 text-sm mr-2">+251</span>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="9XXXXXXXX"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    className="flex-1 outline-none text-sm"
                                    maxLength={10}
                                />
                            </div>
                        </div>
                        <Input
                            type="email"
                            name="email"
                            placeholder="Email (optional)"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="rounded-lg border-neutral-300"
                        />
                    </div>

                    {/* Delivery Address */}
                    <div>
                        <h2 className="text-lg font-bold mb-4">Delivery Address</h2>
                        <div className="space-y-4">
                            <Input
                                type="text"
                                name="address"
                                placeholder="Street Address"
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                                className="rounded-lg border-neutral-300"
                            />
                            <Input
                                type="text"
                                name="city"
                                placeholder="City"
                                value={formData.city}
                                onChange={handleInputChange}
                                required
                                className="rounded-lg border-neutral-300"
                            />
                        </div>
                    </div>

                    {/* Delivery Method */}
                    <div>
                        <h2 className="text-lg font-bold mb-4">Delivery Method</h2>
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setSelectedDelivery("free")}
                                className={`w-full p-4 border-2 rounded-lg transition-all flex items-center justify-between ${selectedDelivery === "free"
                                    ? "border-black bg-neutral-50"
                                    : "border-neutral-200 hover:border-neutral-400"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedDelivery === "free" ? "border-black" : "border-neutral-300"
                                        }`}>
                                        {selectedDelivery === "free" && (
                                            <div className="w-3 h-3 bg-black rounded-full" />
                                        )}
                                    </div>
                                    <span className="font-medium">Free Delivery</span>
                                </div>
                                <span className="font-bold">0 ETB</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedDelivery("outside")}
                                className={`w-full p-4 border-2 rounded-lg transition-all flex items-center justify-between ${selectedDelivery === "outside"
                                    ? "border-black bg-neutral-50"
                                    : "border-neutral-200 hover:border-neutral-400"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedDelivery === "outside" ? "border-black" : "border-neutral-300"
                                        }`}>
                                        {selectedDelivery === "outside" && (
                                            <div className="w-3 h-3 bg-black rounded-full" />
                                        )}
                                    </div>
                                    <span className="font-medium">Outside Addis Ababa</span>
                                </div>
                                <span className="font-bold">800 ETB</span>
                            </button>
                        </div>
                    </div>

                    {/* Coupon */}
                    <div>
                        <h2 className="text-lg font-bold mb-4">Have a Coupon?</h2>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                name="couponCode"
                                placeholder="Enter coupon code"
                                value={formData.couponCode}
                                onChange={handleInputChange}
                                className="rounded-lg border-neutral-300"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-lg px-6 border-neutral-300 hover:bg-neutral-50"
                            >
                                Apply
                            </Button>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div>
                        <h2 className="text-lg font-bold mb-4">Make Payment</h2>
                        <div className="space-y-3">
                            {/* CBE Account */}
                            <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                                <div>
                                    <span className="font-medium">CBE </span>
                                    <span className="font-bold">1000484381047</span>
                                    <span className="text-neutral-600"> | Betelhem Aklilu</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy("1000484381047", "cbe")}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                                >
                                    {copiedAccount === "cbe" ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                    <span className="text-sm">Copy</span>
                                </button>
                            </div>

                            {/* TeleBirr Account */}
                            <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                                <div>
                                    <span className="font-medium">TeleBirr </span>
                                    <span className="font-bold">0984666187</span>
                                    <span className="text-neutral-600"> | Betelhem</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy("0984666187", "telebirr")}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                                >
                                    {copiedAccount === "telebirr" ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                    <span className="text-sm">Copy</span>
                                </button>
                            </div>

                            {/* BOA Account */}
                            <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                                <div>
                                    <span className="font-medium">BOA </span>
                                    <span className="font-bold">19454916</span>
                                    <span className="text-neutral-600"> | Betelhem Aklilu</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy("19454916", "boa")}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                                >
                                    {copiedAccount === "boa" ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                    <span className="text-sm">Copy</span>
                                </button>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="mt-4 bg-black text-white text-center py-3 rounded-lg">
                            <p className="text-sm">Unpaid orders will be canceled after 30min</p>
                        </div>
                    </div>
                </form>
            </div>

            {/* Floating Place Order Button */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 p-4 z-40 safe-area-pb">
                <div className="container mx-auto max-w-2xl flex items-center justify-between gap-4">
                    <div className="text-left">
                        <p className="text-sm text-neutral-600">Total:</p>
                        <p className="text-2xl font-bold">{total} ETB</p>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        className="bg-black text-white hover:bg-neutral-800 rounded-lg h-12 px-8 text-base font-medium"
                    >
                        Place Order
                    </Button>
                </div>
            </div>
        </main>
    );
}
