"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import Image from "next/image";

interface Product {
    id: string;
    name: string;
    slug: string;
    description?: string;
    base_price: string;
    category?: string;
    image_url?: string;
    is_active?: boolean;
    created_at: string;
    updated_at: string;
}

function SearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);

        const fetchUrl = query
            ? `/products?search=${encodeURIComponent(query)}&limit=100`
            : '/products?limit=100';

        api.get<Product[]>(fetchUrl)
            .then((data) => {
                const products = Array.isArray(data) ? data : (data as any).products || [];
                setAllProducts(products);
                setDisplayedProducts(products.slice(0, 40));
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load products:', err);
                setIsLoading(false);
            });
    }, [query]);

    const handleLoadMore = () => {
        setLoadMoreLoading(true);
        setTimeout(() => {
            const currentLength = displayedProducts.length;
            const newProducts = allProducts.slice(currentLength, currentLength + 20);
            setDisplayedProducts([...displayedProducts, ...newProducts]);
            setLoadMoreLoading(false);
        }, 500);
    };

    return (
        <main className="min-h-screen bg-white text-black">
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-center uppercase">
                    {query ? `Search: ${query}` : 'Search'}
                </h1>
                {query && !isLoading && (
                    <p className="text-center text-neutral-500 mb-12">
                        {allProducts.length} results found
                    </p>
                )}

                {isLoading ? (
                    <div className="text-center py-20">
                        <p className="text-2xl animate-pulse">Searching...</p>
                    </div>
                ) : displayedProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-2xl">No products found for "{query}".</p>
                        <Button asChild className="mt-8 rounded-none" variant="outline">
                            <Link href="/shop/new-arrivals">VIEW NEW ARRIVALS</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5 -mx-4 md:mx-0">
                            {displayedProducts.map((product, index) => {
                                const price = parseInt(product.base_price) || 0;
                                const currency = 'Br';

                                return (
                                    <Link href={`/product/${product.slug || product.id}`} key={product.id} className="group cursor-pointer">
                                        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                                            {product.image_url ? (
                                                <Image
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                    sizes="(max-width: 768px) 50vw, 25vw"
                                                    priority={index < 8}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-neutral-200 group-hover:scale-105 transition-transform duration-500 ease-out" />
                                            )}
                                            <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
                                                <Button className="w-full bg-white/90 backdrop-blur-md text-black hover:bg-black hover:text-white border border-black/10 rounded-none shadow-sm">QUICK ADD</Button>
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
                        {displayedProducts.length < allProducts.length && (
                            <div className="mt-16 flex justify-center">
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
            </div>
        </main>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SearchContent />
        </Suspense>
    );
}
