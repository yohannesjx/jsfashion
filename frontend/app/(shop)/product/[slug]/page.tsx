"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus, Share2, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";

interface ProductVariant {
    id: string; // UUID
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

// Helper function to clean variant names
const cleanVariantName = (variantName: string, productTitle: string): string => {
    // Remove product title from variant name
    let cleaned = variantName.replace(productTitle, '').trim();

    // Remove common prefixes like "tee4", "tee9", "flat", "cap", etc.
    cleaned = cleaned.replace(/^(tee|flat|cap|dress|bag|shoe|boot|sneaker|heel)\d*\s+/i, '').trim();

    // Extract just the size/color/attribute (usually the last part)
    const parts = cleaned.split(/\s+/);

    // Common size patterns: S, M, L, XL, 2XL, 3XL, or numbers (36, 37, 38, etc.)
    const sizePattern = /^(\d+|[SMLX]{1,3}|[23]XL)$/i;

    // Check if the last part is a size
    if (parts.length > 0 && sizePattern.test(parts[parts.length - 1])) {
        return parts[parts.length - 1].toUpperCase();
    }

    // If we have multiple parts, try to find a size in them
    for (let i = parts.length - 1; i >= 0; i--) {
        if (sizePattern.test(parts[i])) {
            return parts[i].toUpperCase();
        }
    }

    // Otherwise return the cleaned name or original if nothing left
    return cleaned || variantName;
};

export default function ProductPage({ params }: { params: { slug: string } }) {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<number>(0);
    const [quantity, setQuantity] = useState(1);
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [addedToCart, setAddedToCart] = useState(false);

    const addItem = useCartStore((state) => state.addItem);

    useEffect(() => {
        async function load() {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
                const res = await fetch(`${API_URL}/api/v1/products/${params.slug}`);

                if (!res.ok) {
                    notFound();
                }

                const data = await res.json();

                // Transform API response to match component expectations
                const transformedProduct: Product = {
                    id: data.product.id,
                    name: data.product.name,
                    slug: data.product.slug || params.slug,
                    description: data.product.description || '',
                    base_price: data.product.base_price,
                    image_url: data.product.image_url,
                    is_active: data.product.is_active,
                    variants: (data.variants || []).map((v: any) => ({
                        id: v.id, // This is now a UUID string
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

                // Find first variant with stock > 0
                const firstInStockIdx = transformedProduct.variants.findIndex(v => v.stock > 0);
                if (firstInStockIdx !== -1) {
                    setSelectedVariant(firstInStockIdx);
                }
            } catch (e) {
                console.error('Failed to load product:', e);
                notFound();
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.slug]);

    // Reset quantity when variant changes if it exceeds stock
    useEffect(() => {
        if (!product) return;
        const currentVariant = product.variants[selectedVariant];
        const stock = currentVariant?.stock || 0;
        if (quantity > stock && stock > 0) {
            setQuantity(stock);
        }
    }, [selectedVariant, product, quantity]);

    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!product) return null;

    const images = product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : []);
    const currentVariant = product.variants[selectedVariant] || product.variants[0];
    const price = currentVariant?.price || parseInt(product.base_price) || 0;
    const currency = 'Br'; // Default currency
    const stock = currentVariant?.stock || 0;

    return (
        <main className="min-h-screen bg-white text-black pb-20">
            <div className="md:flex">
                {/* Image Gallery */}
                <div className="w-full md:w-2/3 relative">
                    <div
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 md:gap-1 md:overflow-visible"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        {images.map((src: string, idx: number) => (
                            <div
                                key={idx}
                                className="w-full flex-shrink-0 snap-center aspect-[3/4] relative cursor-zoom-in"
                                onClick={() => {
                                    setCurrentImageIndex(idx);
                                    setLightboxOpen(true);
                                }}
                            >
                                <img
                                    src={src}
                                    alt={`${product.name} - ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback to placeholder if image fails to load
                                        (e.target as HTMLImageElement).src = '/placeholder-1.jpg';
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Mobile Image Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
                        {images.map((_: any, idx: number) => (
                            <div
                                key={idx}
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-all",
                                    currentImageIndex === idx ? "bg-black scale-125" : "bg-white/50 backdrop-blur-sm"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Product Details */}
                <div className="w-full md:w-1/3 px-4 py-6 md:px-8 md:py-12 md:sticky md:top-20 md:h-fit">
                    <div className="space-y-6">
                        {/* Header */}
                        <div>
                            <h1 className="text-lg md:text-xl font-medium text-neutral-600 mb-2">{product.name}</h1>
                            <p className="text-3xl md:text-4xl font-bold tracking-tight">{price} {currency}</p>
                        </div>

                        {/* Variant Selector */}
                        {product.variants.length > 1 && (
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-bold">Size</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.filter(v => v.stock > 0).map((variant, idx) => {
                                        const cleanName = cleanVariantName(variant.name, product.name);
                                        // Find the original index of this variant in the full list to keep selection logic consistent
                                        const originalIdx = product.variants.findIndex(v => v.id === variant.id);

                                        return (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelectedVariant(originalIdx)}
                                                className={cn(
                                                    "h-10 min-w-[60px] px-3 rounded border text-sm font-medium transition-all",
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
                        <div>
                            <span className="font-bold text-sm mb-2 block">Quantity</span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded border border-neutral-200 hover:border-black flex items-center justify-center"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                                    disabled={quantity >= stock}
                                    className="w-10 h-10 rounded border border-neutral-200 hover:border-black flex items-center justify-center disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3 pt-4 hidden md:block">
                            <Button
                                onClick={() => {
                                    if (!product || stock === 0) return;

                                    // Check if adding this quantity would exceed stock
                                    // Note: The store also checks this, but we want to show feedback here too
                                    // or rely on the store's toast. Since the store now has toast, we can rely on it,
                                    // but we can also check locally if we want to prevent the call.
                                    // Let's rely on the store's validation and toast for consistency,
                                    // but we also need to handle the "Added to bag" state only if successful.

                                    // We can check the cart state to see if it was added, but addItem is void.
                                    // Let's check locally first for immediate feedback before calling store.
                                    const currentCartItem = useCartStore.getState().items.find(i => i.variantId === currentVariant.id);
                                    const currentCartQuantity = currentCartItem?.quantity || 0;

                                    if (currentCartQuantity + quantity > stock) {
                                        toast.error(`Only ${stock} items available in stock. You already have ${currentCartQuantity} in cart.`);
                                        return;
                                    }

                                    addItem({
                                        productId: parseInt(product.id),
                                        productSlug: product.slug,
                                        productTitle: product.name,
                                        variantId: currentVariant.id, // Now a UUID string
                                        variantName: currentVariant.name,
                                        price: price,
                                        currency: currency,
                                        thumbnail: product.image_url,
                                        quantity: quantity,
                                        maxStock: stock,
                                    });

                                    setAddedToCart(true);
                                    setTimeout(() => setAddedToCart(false), 2000);
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
                                        ADDED TO BAG
                                    </span>
                                ) : stock > 0 ? (
                                    'ADD TO BAG'
                                ) : (
                                    'OUT OF STOCK'
                                )}
                            </Button>
                            <Button variant="outline" className="w-full h-12 rounded-full border-neutral-200 hover:bg-neutral-50">
                                <Share2 className="w-5 h-5 mr-2" /> Share
                            </Button>
                        </div>

                        {/* Collapsible Description */}
                        <div className="border-t border-neutral-200 pt-4 mt-8">
                            <button
                                onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                                className="w-full flex justify-between items-center py-2 group"
                            >
                                <span className="font-bold text-lg">Product Details</span>
                                {isDescriptionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            <div className={cn(
                                "overflow-hidden transition-all duration-300 ease-in-out text-neutral-600 text-sm leading-relaxed",
                                isDescriptionOpen ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
                            )}>
                                <p>{product.description || "No description available."}</p>
                                <div className="mt-4 space-y-1">
                                    <p><strong>SKU:</strong> {currentVariant?.sku}</p>
                                    <p><strong>Category:</strong> {product.slug.split('-')[0] || 'Uncategorized'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Add to Cart */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 p-4 md:hidden z-40 safe-area-pb">
                <Button
                    onClick={() => {
                        if (!product || stock === 0) return;

                        // Check locally first
                        const currentCartItem = useCartStore.getState().items.find(i => i.variantId === currentVariant.id);
                        const currentCartQuantity = currentCartItem?.quantity || 0;

                        if (currentCartQuantity + quantity > stock) {
                            toast.error(`Only ${stock} items available in stock. You already have ${currentCartQuantity} in cart.`);
                            return;
                        }

                        addItem({
                            productId: parseInt(product.id),
                            productSlug: product.slug,
                            productTitle: product.name,
                            variantId: currentVariant.id, // Now a UUID string
                            variantName: currentVariant.name,
                            price: price,
                            currency: currency,
                            thumbnail: product.image_url,
                            quantity: quantity,
                            maxStock: stock,
                        });

                        setAddedToCart(true);
                        setTimeout(() => setAddedToCart(false), 2000);
                    }}
                    className={cn(
                        "w-full h-14 rounded-full text-lg font-bold tracking-wide transition-all shadow-lg",
                        addedToCart
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-black text-white hover:bg-neutral-800"
                    )}
                    disabled={stock === 0}
                >
                    {addedToCart ? (
                        <span className="flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            ADDED TO BAG
                        </span>
                    ) : stock > 0 ? (
                        `ADD TO BAG • ${price} ${currency}`
                    ) : (
                        'OUT OF STOCK'
                    )}
                </Button>
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200">
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <div className="w-full h-full max-w-4xl max-h-[90vh] p-4 flex items-center justify-center">
                        <img
                            src={images[currentImageIndex]}
                            alt="Zoomed view"
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                </div>
            )}

            {/* Back to Shop */}
            <div className="container mx-auto px-4 py-8">
                <Link href="/shop/all" className="text-sm underline hover:text-neutral-600">
                    ← Back to Shop
                </Link>
            </div>
        </main>
    );
}
