"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface ProductVariant {
    id: string;
    product_id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    stock_quantity: number;
    image: string | null;
    active: boolean | null;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    base_price: string;
    image_url: string | null;
    is_active: boolean;
    variants: ProductVariant[];
    images: string[];
}

const cleanVariantName = (variantName: string, productTitle: string): string => {
    let cleaned = variantName.replace(productTitle, '').trim();
    cleaned = cleaned.replace(/^(tee|flat|cap|dress|bag|shoe|boot|sneaker|heel)\d*\s+/i, '').trim();
    const parts = cleaned.split(/\s+/);
    const sizePattern = /^(\d+|[SMLX]{1,3}|[23]XL)$/i;
    if (parts.length > 0 && sizePattern.test(parts[parts.length - 1])) {
        return parts[parts.length - 1].toUpperCase();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
        if (sizePattern.test(parts[i])) {
            return parts[i].toUpperCase();
        }
    }
    return cleaned || variantName;
};

export default function QuickViewModal({
    isOpen,
    onClose,
    productSlug
}: {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    productSlug: string | null;
}) {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<number>(0);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const addItem = useCartStore((state) => state.addItem);

    useEffect(() => {
        if (!isOpen || !productSlug) return;

        setLoading(true);
        setProduct(null);
        setQuantity(1);
        setSelectedVariant(0);
        setCurrentImageIndex(0);

        async function load() {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
                const res = await fetch(`${API_URL}/api/v1/products/${productSlug}`);

                if (!res.ok) throw new Error('Failed to load product');

                const data = await res.json();

                const transformedProduct: Product = {
                    id: data.product.id,
                    name: data.product.name,
                    slug: data.product.slug || productSlug,
                    description: data.product.description || '',
                    base_price: data.product.base_price,
                    image_url: data.product.image_url,
                    is_active: data.product.is_active,
                    variants: (data.variants || []).map((v: any) => ({
                        id: v.id,
                        product_id: v.product_id,
                        name: v.name || 'Default',
                        sku: v.sku,
                        price: v.price || 0,
                        stock: v.stock_quantity || 0,
                        stock_quantity: v.stock_quantity || 0,
                        image: v.image,
                        active: v.active
                    })),
                    images: (data.images || []).map((img: any) => typeof img === 'string' ? img : img.url) || (data.product.image_url ? [data.product.image_url] : [])
                };

                setProduct(transformedProduct);

                const firstInStockIdx = transformedProduct.variants.findIndex(v => v.stock > 0);
                if (firstInStockIdx !== -1) {
                    setSelectedVariant(firstInStockIdx);
                }
            } catch (e) {
                console.error('Failed to load product:', e);
                toast.error("Failed to load product details");
                onClose(false);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [isOpen, productSlug, onClose]);

    useEffect(() => {
        if (!product) return;
        const currentVariant = product.variants[selectedVariant];
        const stock = currentVariant?.stock || 0;
        if (quantity > stock && stock > 0) {
            setQuantity(stock);
        }
    }, [selectedVariant, product, quantity]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-white sm:max-h-[85vh] h-full sm:h-auto flex flex-col sm:block">
                <DialogTitle className="sr-only">Quick View</DialogTitle>
                <div className="relative h-full overflow-y-auto sm:overflow-hidden">
                    <button
                        onClick={() => onClose(false)}
                        className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-black hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {loading ? (
                        <div className="h-[400px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                        </div>
                    ) : product ? (
                        <div className="flex flex-col md:flex-row h-full">
                            {/* Image Gallery */}
                            <div className="w-full md:w-1/2 bg-neutral-100 relative min-h-[300px] md:min-h-[500px]">
                                <Image
                                    src={product.images[currentImageIndex] || product.image_url || '/placeholder.jpg'}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover"
                                />
                                {product.images.length > 1 && (
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                                        {product.images.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentImageIndex(idx)}
                                                className={cn(
                                                    "w-2 h-2 rounded-full transition-all",
                                                    currentImageIndex === idx ? "bg-black scale-125" : "bg-white/50 backdrop-blur"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col h-full overflow-y-auto">
                                <Link href={`/product/${product.slug}`} className="hover:underline">
                                    <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                                </Link>

                                {(() => {
                                    const currentVariant = product.variants[selectedVariant];
                                    const price = currentVariant?.price || parseInt(product.base_price) || 0;
                                    const stock = currentVariant?.stock || 0;

                                    return (
                                        <div className="space-y-6">
                                            <p className="text-xl font-medium">{price} Br</p>

                                            {/* Variants */}
                                            {product.variants.length > 1 && (
                                                <div className="space-y-2">
                                                    <span className="text-sm font-bold">Size</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {product.variants.filter(v => v.stock > 0).map((variant) => {
                                                            const cleanName = cleanVariantName(variant.name, product.name);
                                                            const originalIdx = product.variants.findIndex(v => v.id === variant.id);
                                                            return (
                                                                <button
                                                                    key={variant.id}
                                                                    onClick={() => setSelectedVariant(originalIdx)}
                                                                    className={cn(
                                                                        "h-10 min-w-[50px] px-3 rounded border text-sm font-medium transition-all",
                                                                        selectedVariant === originalIdx
                                                                            ? "bg-black text-white border-black"
                                                                            : "bg-white text-black border-neutral-200 hover:border-black"
                                                                    )}
                                                                >
                                                                    {cleanName}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quantity */}
                                            <div className="space-y-2">
                                                <span className="text-sm font-bold">Quantity</span>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                        className="w-10 h-10 rounded border border-neutral-200 hover:border-black flex items-center justify-center"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                                                    <button
                                                        onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                                                        disabled={quantity >= stock}
                                                        className="w-10 h-10 rounded border border-neutral-200 hover:border-black flex items-center justify-center disabled:opacity-50"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Add to Cart */}
                                            <Button
                                                onClick={() => {
                                                    if (stock === 0) return;

                                                    const currentCartItem = useCartStore.getState().items.find(i => i.variantId === currentVariant.id);
                                                    const currentCartQuantity = currentCartItem?.quantity || 0;

                                                    if (currentCartQuantity + quantity > stock) {
                                                        toast.error(`Only ${stock} items available. You have ${currentCartQuantity} in cart.`);
                                                        return;
                                                    }

                                                    addItem({
                                                        productId: parseInt(product.id),
                                                        productSlug: product.slug,
                                                        productTitle: product.name,
                                                        variantId: currentVariant.id,
                                                        variantName: currentVariant.name,
                                                        price: price,
                                                        currency: 'Br',
                                                        thumbnail: product.image_url,
                                                        quantity: quantity,
                                                        maxStock: stock,
                                                    });

                                                    setAddedToCart(true);
                                                    setTimeout(() => {
                                                        setAddedToCart(false);
                                                        onClose(false);
                                                    }, 1000);
                                                }}
                                                className={cn(
                                                    "w-full h-12 rounded-full text-lg font-bold tracking-wide transition-all",
                                                    addedToCart
                                                        ? "bg-green-600 hover:bg-green-700"
                                                        : "bg-black text-white hover:bg-neutral-800"
                                                )}
                                                disabled={stock === 0}
                                            >
                                                {addedToCart ? (
                                                    <span className="flex items-center gap-2">
                                                        <Check className="w-5 h-5" />
                                                        ADDED
                                                    </span>
                                                ) : stock > 0 ? (
                                                    'ADD TO BAG'
                                                ) : (
                                                    'OUT OF STOCK'
                                                )}
                                            </Button>

                                            <div className="pt-4 border-t border-neutral-100">
                                                <Link href={`/product/${product.slug}`} className="text-sm underline hover:text-neutral-600 block text-center">
                                                    View Full Details
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center text-red-500">
                            Failed to load product
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
