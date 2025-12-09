"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import QuickViewModal from "@/components/shop/QuickViewModal";
import ImagePlaceholder from "@/components/ImagePlaceholder";

interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    base_price: string;
    image_url: string | null;
    is_active: boolean;
}

// Shuffle array function
const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Product Skeleton Component
const ProductSkeleton = () => (
    <div className="group cursor-pointer animate-pulse">
        <div className="relative aspect-[3/4] bg-neutral-200 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 animate-shimmer"
                style={{ backgroundSize: '200% 100%' }} />
        </div>
        <div className="flex flex-col px-2 py-3 space-y-2">
            <div className="h-3 bg-neutral-200 rounded w-3/4" />
            <div className="h-4 bg-neutral-200 rounded w-1/3" />
        </div>
    </div>
);

// Cache utilities
const CACHE_KEY = 'shop-products-cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getCachedProducts = (): Product[] | null => {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) {
        console.error('Failed to load cached products:', e);
    }
    return null;
};

const setCachedProducts = (products: Product[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: products,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Failed to cache products:', e);
    }
};

// Preload images for faster display
const preloadImages = (products: Product[], count: number = 20) => {
    if (typeof window === 'undefined') return;

    products.slice(0, count).forEach((product) => {
        if (product.image_url) {
            const img = new window.Image();
            img.src = product.image_url;
        }
    });
};

export default function Home() {
    const [products, setProducts] = useState<Product[]>([]);
    const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [quickViewOpen, setQuickViewOpen] = useState(false);
    const [quickViewProductSlug, setQuickViewProductSlug] = useState<string | null>(null);

    useEffect(() => {
        // Try to load from cache first for instant display
        const cached = getCachedProducts();
        if (cached && cached.length > 0) {
            const shuffled = shuffleArray(cached);
            setProducts(shuffled);
            setDisplayedProducts(shuffled.slice(0, 40));
            setIsLoading(false);
            // Preload first batch of images
            preloadImages(shuffled, 20);

            // Still fetch fresh data in background
            setIsFetching(true);
        }

        // Fetch fresh products from API
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
        fetch(`${API_URL}/api/v1/products?limit=1000&offset=0`)
            .then(res => res.json())
            .then((data: Product[]) => {
                if (!data) {
                    if (!cached) {
                        setProducts([]);
                        setDisplayedProducts([]);
                    }
                    setIsLoading(false);
                    setIsFetching(false);
                    return;
                }

                // Cache the fresh data
                setCachedProducts(data);

                // Only update if we don't have cached data or it's a fresh load
                if (!cached || cached.length === 0) {
                    const shuffled = shuffleArray(data);
                    setProducts(shuffled);
                    setDisplayedProducts(shuffled.slice(0, 40));
                    preloadImages(shuffled, 20);
                } else {
                    // Update products silently for next load more
                    const shuffled = shuffleArray(data);
                    setProducts(shuffled);
                }

                setIsLoading(false);
                setIsFetching(false);
            })
            .catch(err => {
                console.error('Failed to load products:', err);
                if (!cached) {
                    setIsLoading(false);
                }
                setIsFetching(false);
            });
    }, []);

    // Preload next batch of images when user scrolls
    useEffect(() => {
        if (products.length > displayedProducts.length) {
            const nextBatch = products.slice(displayedProducts.length, displayedProducts.length + 20);
            preloadImages(nextBatch, 20);
        }
    }, [displayedProducts.length, products]);

    const handleLoadMore = () => {
        setLoadMoreLoading(true);
        setTimeout(() => {
            const currentLength = displayedProducts.length;
            const newProducts = products.slice(currentLength, currentLength + 40);
            setDisplayedProducts([...displayedProducts, ...newProducts]);
            setLoadMoreLoading(false);
        }, 300);
    };

    // Generate skeleton array for loading state
    const skeletonCount = 8;

    return (
        <main className="min-h-screen bg-white text-black selection:bg-black selection:text-white">

            {/* Hero Section */}
            <section className="relative h-[90vh] w-full flex flex-col justify-center items-center overflow-hidden bg-neutral-100">
                <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-90 grayscale contrast-125" />

                <div className="relative z-10 text-center space-y-6 max-w-5xl px-4">
                    <h1 className="text-[12vw] leading-[0.8] font-black tracking-tighter text-black mix-blend-overlay">
                        FUTURE<br />CLASSICS
                    </h1>
                    <div className="flex flex-col md:flex-row gap-6 justify-center items-center mt-12">
                        <Button asChild size="lg" className="bg-black text-white hover:bg-white hover:text-black border-2 border-black rounded-none h-14 px-10 text-lg tracking-widest transition-all duration-300">
                            <Link href="/shop/new-arrivals">SHOP NEW ARRIVALS</Link>
                        </Button>
                    </div>
                </div>

                {/* Scrolling Marquee */}
                <div className="absolute bottom-0 w-full bg-black text-white py-3 overflow-hidden whitespace-nowrap z-20">
                    <div className="animate-marquee inline-block">
                        <span className="text-lg font-mono tracking-widest mx-8">FREE DELIVERY IN ADDIS ON ORDERS OVER 5000BR</span>
                        <span className="text-lg font-mono tracking-widest mx-8">•</span>
                        <span className="text-lg font-mono tracking-widest mx-8">NEW COLLECTION DROPPING EVERYDAY</span>
                        <span className="text-lg font-mono tracking-widest mx-8">•</span>
                        <span className="text-lg font-mono tracking-widest mx-8">LIMITED EDITION PIECES</span>
                        <span className="text-lg font-mono tracking-widest mx-8">•</span>
                        <span className="text-lg font-mono tracking-widest mx-8">FREE DELIVERY IN ADDIS ON ORDERS OVER 5000BR</span>
                    </div>
                </div>
            </section>



            {/* New Arrivals Grid */}
            <section className="py-12">
                <div className="container mx-auto px-4 mb-8">
                    <div className="flex justify-between items-end">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">NEW ARRIVALS</h2>
                        <Link href="/shop/new-arrivals" className="text-lg underline underline-offset-4 hover:text-neutral-500 transition-colors">VIEW ALL</Link>
                    </div>
                    {/* Background refresh indicator */}
                    {isFetching && displayedProducts.length > 0 && (
                        <p className="text-xs text-neutral-400 mt-2">Refreshing products...</p>
                    )}
                </div>

                {isLoading && displayedProducts.length === 0 ? (
                    // Skeleton Loading Grid
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5">
                        {Array.from({ length: skeletonCount }).map((_, i) => (
                            <ProductSkeleton key={i} />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5">
                            {displayedProducts.map((product, index) => {
                                const price = parseInt(product.base_price) || 0;
                                const currency = 'Br';

                                return (
                                    <Link href={`/product/${product.slug}`} key={product.id} className="group cursor-pointer">
                                        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                                            {product.image_url ? (
                                                <>
                                                    <ImagePlaceholder className="absolute inset-0" />
                                                    <Image
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        fill
                                                        sizes="(max-width: 768px) 50vw, 25vw"
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out relative z-10"
                                                        priority={index < 8}
                                                    />
                                                </>
                                            ) : (
                                                <ImagePlaceholder className="absolute inset-0" />
                                            )}
                                            <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
                                                <Button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setQuickViewProductSlug(product.slug || product.id);
                                                        setQuickViewOpen(true);
                                                    }}
                                                    className="w-full bg-white/90 backdrop-blur-md text-black hover:bg-black hover:text-white border border-black/10 rounded-none shadow-sm h-10 flex items-center justify-center text-sm font-medium transition-colors"
                                                >
                                                    QUICK ADD
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col px-2 py-3">
                                            <h3 className="text-xs font-medium tracking-tight mb-1 line-clamp-2">{product.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold">{price} {currency}</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Load More Button */}
                        {displayedProducts.length < products.length && (
                            <div className="mt-16 flex justify-center px-4">
                                <Button
                                    onClick={handleLoadMore}
                                    disabled={loadMoreLoading}
                                    className="w-full md:w-auto min-w-[300px] h-14 text-lg tracking-widest bg-white text-black border border-black hover:bg-black hover:text-white rounded-none transition-all relative overflow-hidden"
                                >
                                    {loadMoreLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-pulse">LOADING...</span>
                                        </span>
                                    ) : (
                                        "LOAD MORE"
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Footer Banner */}
            <section className="bg-black text-white py-24 px-6 text-center">
                <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">JOIN THE CLUB</h2>
                <p className="text-xl text-neutral-400 mb-8 max-w-2xl mx-auto">Subscribe to receive updates, access to exclusive deals, and more.</p>
                <div className="flex flex-col md:flex-row gap-4 justify-center max-w-md mx-auto">
                    <input
                        type="email"
                        placeholder="YOUR EMAIL"
                        className="bg-transparent border-b border-white px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 w-full text-lg"
                    />
                    <Button variant="outline" className="rounded-none border-white text-white hover:bg-white hover:text-black px-8 h-auto py-3">
                        SUBSCRIBE
                    </Button>
                </div>
            </section>

            <QuickViewModal
                isOpen={quickViewOpen}
                onClose={setQuickViewOpen}
                productSlug={quickViewProductSlug}
            />

            {/* Shimmer animation styles */}
            <style jsx global>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite linear;
                }
            `}</style>
        </main>
    );
}
