"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Upload, X } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";

export default function CheckoutPage() {
    const router = useRouter();
    const [selectedDelivery, setSelectedDelivery] = useState("free");
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [highlightUpload, setHighlightUpload] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadSectionRef = useRef<HTMLDivElement>(null);
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

    // Calculate delivery fee based on location and order total
    const calculateDeliveryFee = () => {
        if (selectedDelivery === "outside") {
            return 800; // Outside Addis Ababa
        }
        // Inside Addis Ababa: free if ≥5000 ETB, otherwise 300 ETB
        return subtotal >= 5000 ? 0 : 300;
    };

    const deliveryFee = calculateDeliveryFee();
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setUploadError('Please select an image file');
                return;
            }
            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                setUploadError('File size must be less than 10MB');
                return;
            }
            setUploadedFile(file);
            setUploadError(null);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setUploadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
            toast.error("Please fill in all required fields", {
                description: "Name, phone, address, and city are required"
            });
            return;
        }

        // Validate payment screenshot
        if (!uploadedFile) {
            toast.error("Payment screenshot required", {
                description: "Please upload your payment confirmation screenshot",
                duration: 5000
            });
            setUploadError("Payment screenshot is required");
            setHighlightUpload(true);

            // Scroll to upload section
            uploadSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Remove highlight after animation
            setTimeout(() => setHighlightUpload(false), 3000);
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
                },
                payment_screenshot: uploadedFile // Include the file for backend processing
            };

            console.log('Sending order data:', JSON.stringify(orderData, null, 2));

            // Create FormData to send both JSON and file
            const formDataToSend = new FormData();
            formDataToSend.append('data', JSON.stringify({
                customer_id: null,
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
            }));
            formDataToSend.append('payment_screenshot', uploadedFile);

            const response = await fetch(`${API_URL}/api/v1/orders`, {
                method: 'POST',
                body: formDataToSend,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create order');
            }

            const result = await response.json();
            const orderNumber = result.order?.order_number || result.order_number;

            // Clear cart and redirect to thank you page
            clearCart();
            router.push(`/thank-you/${orderNumber}`);
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
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">Inside Addis Ababa</span>
                                        {subtotal < 5000 && (
                                            <span className="text-xs text-neutral-500">Free for orders ≥5000 ETB</span>
                                        )}
                                    </div>
                                </div>
                                <span className="font-bold">
                                    {subtotal >= 5000 ? (
                                        <span className="text-green-600">Free</span>
                                    ) : (
                                        "300 ETB"
                                    )}
                                </span>
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

                        {/* Payment Screenshot Upload */}
                        <div
                            ref={uploadSectionRef}
                            className={`mt-6 border-2 rounded-lg p-4 space-y-3 transition-all ${highlightUpload
                                ? 'border-red-500 animate-border-pulse'
                                : 'border-red-500'
                                }`}
                        >
                            <h3 className="font-bold text-base text-center">Upload Payment Screenshot *</h3>

                            {!uploadedFile ? (
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="payment-screenshot"
                                    />
                                    <label
                                        htmlFor="payment-screenshot"
                                        className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg p-4 cursor-pointer hover:border-red-500 transition-colors"
                                    >
                                        <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                                        <span className="text-sm font-medium text-neutral-700">Click to select image</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                                            <Check className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                                            <p className="text-xs text-neutral-500">
                                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="p-2 hover:bg-green-200 rounded-full transition-colors flex-shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {uploadError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-sm text-center">
                                    {uploadError}
                                </div>
                            )}
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
