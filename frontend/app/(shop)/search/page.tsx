"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import Image from "next/image";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { Search, SlidersHorizontal, Grid3x3, LayoutGrid, X } from "lucide-react";

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
    const [gridCols, setGridCols] = useState<2 | 3 | 4>(4);

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
        <main className="min-h-screen bg-neutral-50">
            {/* Header Section */}
            <div className="bg-white border-b border-neutral-200">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Search className="w-6 h-6 text-neutral-400" />
                                <h1 className="text-3xl md:text-5xl font-black tracking-tight">
                                    {query ? `"${query}"` : 'All Products'}
                                </h1>
                            </div>
                            {!isLoading && (
                                <p className="text-neutral-600 font-medium">
                                    {allProducts.length} {allProducts.length === 1 ? 'product' : 'products'} found
                                </p>
                            )}
                        </div>

                        {/* View Toggle */}
                        <div className="hidden md:flex items-center gap-2 bg-neutral-100 p-1 rounded-lg">
                            <button
                                onClick={() => setGridCols(2)}
                                className={`p-2 rounded transition-colors ${gridCols === 2 ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                                title="2 columns"
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setGridCols(3)}
                                className={`p-2 rounded transition-colors ${gridCols === 3 ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                                title="3 columns"
                            >
                                <Grid3x3 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setGridCols(4)}
                                className={`p-2 rounded transition-colors ${gridCols === 4 ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                                title="4 columns"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" />
                                    <rect x="14" y="3" width="7" height="7" />
                                    <rect x="3" y="14" width="7" height="7" />
                                    <rect x="14" y="14" width="7" height="7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="container mx-auto px-6 py-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-medium text-neutral-600">Searching products...</p>
                    </div>
                ) : displayedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-neutral-200">
                        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-12 h-12 text-neutral-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No products found</h2>
                        <p className="text-neutral-600 mb-8 max-w-md text-center">
                            We couldn't find any products matching "{query}". Try different keywords or browse our collections.
                        </p>
                        <Button asChild className="bg-black text-white hover:bg-neutral-800 px-8 py-6 text-base font-semibold rounded-full">
                            <Link href="/shop/new-arrivals">Explore New Arrivals</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className={`grid gap-6 ${gridCols === 2 ? 'grid-cols-2' :
                                gridCols === 3 ? 'grid-cols-2 md:grid-cols-3' :
                                    'grid-cols-2 md:grid-cols-4'
                            }`}>
                            {displayedProducts.map((product, index) => {
                                const price = parseInt(product.base_price) || 0;
                                const currency = 'Br';

                                return (
                                    <Link
                                        href={`/product/${product.slug || product.id}`}
                                        key={product.id}
                                        className="group bg-white rounded-xl overflow-hidden border border-neutral-200 hover:border-black hover:shadow-xl transition-all duration-300"
                                    >
                                        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                                            {product.image_url ? (
                                                <Image
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                                    sizes={gridCols === 2 ? "50vw" : gridCols === 3 ? "33vw" : "25vw"}
                                                    priority={index < 8}
                                                />
                                            ) : (
                                                <ImagePlaceholder className="absolute inset-0" />
                                            )}

                                            {/* Quick Add Button */}
                                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                <Button className="w-full bg-white/95 backdrop-blur-sm text-black hover:bg-black hover:text-white border-2 border-black rounded-full font-bold shadow-lg">
                                                    QUICK VIEW
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <h3 className="font-bold text-base tracking-tight mb-2 line-clamp-2 group-hover:text-neutral-600 transition-colors">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-black">{price} {currency}</span>
                                                {product.category && (
                                                    <span className="text-xs text-neutral-500 uppercase tracking-wider">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Load More Button */}
                        {displayedProducts.length < allProducts.length && (
                            <div className="mt-12 flex justify-center">
                                <Button
                                    onClick={handleLoadMore}
                                    disabled={loadMoreLoading}
                                    className="px-12 py-6 text-base font-bold tracking-wide bg-black text-white hover:bg-neutral-800 rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                >
                                    {loadMoreLoading ? (
                                        <span className="flex items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Loading...
                                        </span>
                                    ) : (
                                        `Load More (${allProducts.length - displayedProducts.length} remaining)`
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
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg font-medium text-neutral-600">Loading...</p>
                </div>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}
