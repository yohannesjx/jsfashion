"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, Phone, Loader2, Upload, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.jsfashion.et';

interface OrderItem {
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price: string;
    image_url: string | null;
}

interface OrderData {
    order_number: number;
    status: string;
    total_amount: string;
    created_at: string;
    items: OrderItem[];
}

export default function ThankYouPage({ params }: { params: { orderNumber?: string[] } }) {
    const [mounted, setMounted] = useState(false);
    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const orderNumber = params?.orderNumber?.[0] || "";

    useEffect(() => {
        window.scrollTo(0, 0);
        setMounted(true);

        // Fetch order from API
        if (orderNumber && !isNaN(parseInt(orderNumber))) {
            fetch(`${API_URL}/api/v1/orders/number/${orderNumber}`)
                .then(res => {
                    if (!res.ok) throw new Error('Order not found');
                    return res.json();
                })
                .then((data: OrderData) => {
                    setOrder(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch order:', err);
                    setError('Order not found');
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [orderNumber]);

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

    const handleUpload = async () => {
        if (!uploadedFile || !orderNumber) return;

        setUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('screenshot', uploadedFile);

        try {
            const response = await fetch(`${API_URL}/api/v1/orders/${orderNumber}/payment-screenshot`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            setUploadSuccess(true);
            setUploadedFile(null);
        } catch (err: any) {
            setUploadError(err.message || 'Failed to upload screenshot');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setUploadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

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
                    <p className="text-3xl font-bold tracking-wider">#{order?.order_number || orderNumber || "—"}</p>
                </div>

                {/* Payment Screenshot Upload */}
                {orderNumber && !uploadSuccess && (
                    <div className="border-2 border-red-500 rounded-lg p-6 space-y-4">
                        <h2 className="font-bold text-lg text-center">Upload Payment Screenshot</h2>
                        <p className="text-sm text-neutral-600 text-center">
                            Please upload a screenshot of your payment confirmation
                        </p>

                        {!uploadedFile ? (
                            <div className="space-y-3">
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
                                    className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg p-8 cursor-pointer hover:border-red-500 transition-colors"
                                >
                                    <Upload className="w-12 h-12 text-neutral-400 mb-3" />
                                    <span className="text-sm font-medium text-neutral-700">Click to select image</span>
                                    <span className="text-xs text-neutral-500 mt-1">PNG, JPG up to 10MB</span>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-12 h-12 bg-neutral-200 rounded flex items-center justify-center flex-shrink-0">
                                            <Upload className="w-6 h-6 text-neutral-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                                            <p className="text-xs text-neutral-500">
                                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRemoveFile}
                                        className="p-2 hover:bg-neutral-200 rounded-full transition-colors flex-shrink-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <Button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Upload Screenshot'
                                    )}
                                </Button>
                            </div>
                        )}

                        {uploadError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                {uploadError}
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Success Message */}
                {uploadSuccess && (
                    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-6 h-6 text-green-600" strokeWidth={3} />
                        </div>
                        <h3 className="font-bold text-lg text-green-800 mb-2">Payment Screenshot Uploaded!</h3>
                        <p className="text-sm text-green-700">
                            We've received your payment proof and will process your order shortly.
                        </p>
                    </div>
                )}

                {/* Ordered Products */}
                {loading ? (
                    <div className="border border-neutral-200 rounded-lg p-8 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                ) : error ? (
                    <div className="border border-neutral-200 rounded-lg p-6 text-center text-neutral-500">
                        {error}
                    </div>
                ) : order && order.items && order.items.length > 0 ? (
                    <div className="border border-neutral-200 rounded-lg p-4">
                        <h2 className="font-bold text-lg mb-4">Order Summary</h2>
                        <div className="space-y-3">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-center">
                                    <div className="w-16 h-16 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.product_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{item.product_name}</p>
                                        {item.variant_name && item.variant_name !== ' / ' && (
                                            <p className="text-xs text-neutral-500">{item.variant_name}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">Qty: {item.quantity}</p>
                                        <p className="text-sm text-neutral-600">{item.unit_price} ETB</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-neutral-200 mt-4 pt-4 flex justify-between items-center">
                            <span className="font-bold">Total</span>
                            <span className="font-bold text-lg">{order.total_amount} ETB</span>
                        </div>
                    </div>
                ) : null}

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
