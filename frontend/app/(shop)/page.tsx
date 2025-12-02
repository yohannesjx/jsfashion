"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

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

export default function Home() {
    const [products, setProducts] = useState<Product[]>([]);
    const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);

    useEffect(() => {
        // Load products from API
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
        fetch(`${API_URL}/api/v1/products?limit=100&offset=0`)
            .then(res => res.json())
            .then((data: Product[]) => {
                // Randomize products
                if (!data) {
                    setProducts([]);
                    setDisplayedProducts([]);
                    setIsLoading(false);
                    return;
                }
                const shuffled = shuffleArray(data);
                setProducts(shuffled);
                setDisplayedProducts(shuffled.slice(0, 40));
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load products:', err);
                setIsLoading(false);
            });
    }, []);

    const handleLoadMore = () => {
        setLoadMoreLoading(true);
        setTimeout(() => {
            const currentLength = displayedProducts.length;
            const newProducts = products.slice(currentLength, currentLength + 20);
            setDisplayedProducts([...displayedProducts, ...newProducts]);
            setLoadMoreLoading(false);
        }, 500);
    };

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
                        <span className="text-lg font-mono tracking-widest mx-8">FREE DELIVERY IN ADDIS ON ORDERS OVER 5000Br</span>
                        <span className="text-lg font-mono tracking-widest mx-8">•</span>
                        <span className="text-lg font-mono tracking-widest mx-8">NEW COLLECTION DROPPING EVERYDAY</span>
                        <span className="text-lg font-mono tracking-widest mx-8">•</span>
                        <span className="text-lg font-mono tracking-widest mx-8">LIMITED EDITION PIECES</span>
                        <span className="text-lg font-mono tracking-widest mx-8">•</span>
                        <span className="text-lg font-mono tracking-widest mx-8">FREE DELIVERY IN ADDIS ON ORDERS OVER 5000Br</span>
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
                </div>

                {isLoading ? (
                    <div className="text-center py-20">
                        <p className="text-2xl">Loading products...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5">
                            {displayedProducts.map((product) => {
                                const price = parseInt(product.base_price) || 0;
                                const currency = 'Br';

                                return (
                                    <Link href={`/product/${product.slug}`} key={product.id} className="group cursor-pointer">
                                        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder-1.jpg';
                                                    }}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-neutral-200 group-hover:scale-105 transition-transform duration-500 ease-out" />
                                            )}
                                            <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
                                                <div className="w-full bg-white/90 backdrop-blur-md text-black hover:bg-black hover:text-white border border-black/10 rounded-none shadow-sm h-10 flex items-center justify-center text-sm font-medium transition-colors">QUICK ADD</div>
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
        </main>
    );
}
