"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, Trash2, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { VariantSelector } from "@/components/pos/VariantSelector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Product {
    id: string;
    name: string;
    base_price: string;
    image_url: string | null;
    variants: Variant[];
}

interface Variant {
    id: string;
    product_id: string;
    name: string;
    sku: string;
    size: string | null;
    color: string | null;
    price: number;
    stock: number;
    active: boolean;
    image: string | null;
    price_adjustment: string | null;
}

interface CartItem {
    variantId: string;
    productId: string;
    name: string;
    sku: string;
    size: string | null;
    color: string | null;
    price: number;
    quantity: number;
}
export default function POSPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false);
    const queryClient = useQueryClient();

    // Barcode scanner state
    const [barcodeBuffer, setBarcodeBuffer] = useState("");
    const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const lastKeyTime = useRef<number>(0);

    // Load cached products from localStorage
    const getCachedProducts = useCallback(() => {
        if (typeof window === 'undefined') return [];
        try {
            const cached = localStorage.getItem('pos-products-cache');
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Cache valid for 30 minutes
                if (Date.now() - timestamp < 30 * 60 * 1000) {
                    return data;
                }
            }
        } catch (e) {
            console.error('Failed to load cached products:', e);
        }
        return [];
    }, []);

    // Fetch ALL products at once for fast POS checkout with persistent cache
    const { data: products = [], isLoading, isFetching } = useQuery({
        queryKey: ['pos-products'],
        queryFn: async () => {
            const res = await api.get('/products?limit=1000&offset=0');
            // Save to localStorage for instant loading on next visit
            try {
                localStorage.setItem('pos-products-cache', JSON.stringify({
                    data: res.data,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.error('Failed to cache products:', e);
            }
            return res.data || [];
        },
        initialData: getCachedProducts, // Load from cache immediately
        staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
        gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
    });

    // Filtered products based on search query (shimmer while loading)
    const filteredProducts = useMemo(() => {
        const safeProducts = Array.isArray(products) ? products : [];
        if (!searchQuery) return safeProducts;
        const q = searchQuery.toLowerCase();
        return safeProducts.filter((p: Product) => p.name.toLowerCase().includes(q));
    }, [products, searchQuery]);

    // Mutation for Checkout
    const checkoutMutation = useMutation({
        mutationFn: async (orderData: any) => {
            return api.post('/orders', orderData);
        },
        onSuccess: () => {
            toast.success("Order completed successfully!");
            setCart([]);
            queryClient.invalidateQueries({ queryKey: ['pos-products'] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Checkout failed");
        }
    });

    const handleProductClick = async (product: Product) => {
        try {
            const res = await api.get(`/products/${product.id}`);
            setSelectedProduct({
                ...res.data.product,
                variants: res.data.variants
            });
            setIsVariantSelectorOpen(true);
        } catch (error) {
            toast.error("Failed to load product details");
            console.error(error);
        }
    };

    const handleAddToCart = (variant: Variant, quantity: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.variantId === variant.id);
            if (existing) {
                return prev.map(item =>
                    item.variantId === variant.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }

            const basePrice = parseFloat(selectedProduct!.base_price);
            const adj = variant.price_adjustment ? parseFloat(variant.price_adjustment) : 0;
            const price = basePrice + adj;

            return [...prev, {
                variantId: variant.id,
                productId: selectedProduct!.id,
                name: selectedProduct!.name,
                sku: variant.sku,
                size: variant.size,
                color: variant.color,
                price: price,
                quantity: quantity
            }];
        });
        toast.success("Added to cart");
    };

    // Add to cart by SKU (for barcode scanner)
    const addToCartBySku = useCallback(async (sku: string) => {
        try {
            // Search for variant by SKU
            const res = await api.get(`/products/variants/sku/${sku}`);

            if (res.data && res.data.variant) {
                const variant = res.data.variant;
                const product = res.data.product;

                setCart(prev => {
                    const existing = prev.find(item => item.variantId === variant.id);
                    if (existing) {
                        return prev.map(item =>
                            item.variantId === variant.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        );
                    }

                    const basePrice = parseFloat(product.base_price);
                    const adj = variant.price_adjustment ? parseFloat(variant.price_adjustment) : 0;
                    const price = basePrice + adj;

                    return [...prev, {
                        variantId: variant.id,
                        productId: product.id,
                        name: product.name,
                        sku: variant.sku,
                        size: variant.size,
                        color: variant.color,
                        price: price,
                        quantity: 1
                    }];
                });
                toast.success(`Added ${product.name} to cart`);
            } else {
                toast.error(`Product with SKU "${sku}" not found`);
            }
        } catch (error) {
            toast.error(`Product with SKU "${sku}" not found`);
            console.error(error);
        }
    }, []);

    const removeFromCart = (variantId: string) => {
        setCart(prev => prev.filter(item => item.variantId !== variantId));
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;

        const orderData = {
            payment_method: "cash",
            source: "pos", // Add source to mark as POS order
            items: cart.map(item => ({
                variant_id: item.variantId,
                quantity: item.quantity
            }))
        };

        checkoutMutation.mutate(orderData);
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Barcode Scanner Detection
    // Barcode scanners typically type characters very fast and end with Enter
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            const timeDiff = now - lastKeyTime.current;
            lastKeyTime.current = now;

            // If focused on the search input and it's a regular typing speed, don't interfere
            if (document.activeElement === searchInputRef.current && timeDiff > 50) {
                return;
            }

            // Detect barcode scanner: fast consecutive key presses
            if (timeDiff < 50) {
                // This is likely a barcode scanner (very fast input)
                if (e.key === 'Enter' && barcodeBuffer.length > 3) {
                    // Process the barcode
                    e.preventDefault();
                    const sku = barcodeBuffer;
                    setBarcodeBuffer("");
                    addToCartBySku(sku);
                    return;
                }

                // Build buffer
                if (e.key.length === 1) {
                    setBarcodeBuffer(prev => prev + e.key);
                }
            } else {
                // Reset buffer if typing is slow (manual input)
                if (barcodeBuffer && barcodeBuffer.length > 0) {
                    setBarcodeBuffer("");
                }

                // Start new buffer
                if (e.key.length === 1 && document.activeElement?.tagName !== 'INPUT') {
                    setBarcodeBuffer(e.key);
                    // Focus search input for manual typing
                    searchInputRef.current?.focus();
                }
            }

            // Clear buffer after timeout
            if (barcodeTimeoutRef.current) {
                clearTimeout(barcodeTimeoutRef.current);
            }
            barcodeTimeoutRef.current = setTimeout(() => {
                setBarcodeBuffer("");
            }, 100);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (barcodeTimeoutRef.current) {
                clearTimeout(barcodeTimeoutRef.current);
            }
        };
    }, [barcodeBuffer, addToCartBySku]);

    // Handle search input Enter key for SKU search
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            // Try to find by SKU first
            addToCartBySku(searchQuery.trim());
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Left Side: Product Grid */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search products or scan barcode..."
                            className="pl-10 h-12 text-lg bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                    </div>
                    <Link href="/pos/report">
                        <Button variant="outline" className="h-12 px-6">
                            Reports
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20 pr-2">
                    {isLoading && products.length === 0 ? (
                        <div className="col-span-full text-center py-10">Loading products...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-gray-500">No products found</div>
                    ) : (
                        <>
                            {/* Show subtle background refresh indicator */}
                            {isFetching && products.length > 0 && (
                                <div className="col-span-full text-center py-2 text-xs text-gray-400">
                                    Refreshing products...
                                </div>
                            )}
                            {filteredProducts.map((product: Product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <div className="w-full aspect-square bg-gray-100 mb-4 rounded-lg flex items-center justify-center text-gray-300 overflow-hidden relative">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <ShoppingBag className="w-8 h-8 opacity-20" />
                                        )}
                                    </div>
                                    <h3 className="font-medium mb-1 line-clamp-1">{product.name}</h3>
                                    <p className="text-gray-500">{parseFloat(product.base_price).toLocaleString()} ETB</p>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Right Side: Cart */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        Current Order
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setCart([])} disabled={cart.length === 0}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center space-y-4">
                            <ShoppingBag className="h-12 w-12 opacity-20" />
                            <p>Cart is empty</p>
                            <p className="text-xs">Scan barcode or click products to add</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item, idx) => (
                                <div key={`${item.variantId}-${idx}`} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg group">
                                    <div className="flex-1">
                                        <p className="font-medium line-clamp-1">{item.name}</p>
                                        <p className="text-xs text-gray-500 mb-1">
                                            {item.size && <span className="mr-2">{item.size}</span>}
                                            {item.color && <span>{item.color}</span>}
                                            {!item.size && !item.color && <span>Default</span>}
                                        </p>
                                        <p className="text-sm text-gray-500">{item.quantity} x {item.price.toLocaleString()} ETB</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <p className="font-medium">{(item.price * item.quantity).toLocaleString()} ETB</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeFromCart(item.variantId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-between mb-4 text-lg font-semibold">
                        <span>Total</span>
                        <span>{total.toLocaleString()} ETB</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="w-full h-12">
                            Hold
                        </Button>
                        <Button
                            className="w-full h-12 bg-black text-white hover:bg-gray-800"
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || checkoutMutation.isPending}
                        >
                            {checkoutMutation.isPending ? "Processing..." : "Checkout"}
                        </Button>
                    </div>
                </div>
            </div>

            <VariantSelector
                product={selectedProduct}
                open={isVariantSelectorOpen}
                onOpenChange={setIsVariantSelectorOpen}
                onAddToCart={handleAddToCart}
            />
        </div>
    );
}
