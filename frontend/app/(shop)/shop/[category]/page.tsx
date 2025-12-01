"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

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

export default function CategoryPage({ params }: { params: { category: string } }) {
    const categoryName = params.category.replace(/-/g, " ").toUpperCase();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);

    useEffect(() => {
        // Load products from API
        api.get<Product[]>(`/categories/${params.category}/products`)
            .then((data) => {
                setAllProducts(data || []);
                setDisplayedProducts((data || []).slice(0, 40));
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load products:', err);
                setIsLoading(false);
            });
    }, [params.category]);

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
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-12 text-center">{categoryName}</h1>

                {isLoading ? (
                    <div className="text-center py-20">
                        <p className="text-2xl">Loading products...</p>
                    </div>
                ) : displayedProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-2xl">No products found in this category.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5 -mx-4 md:mx-0">
                            {displayedProducts.map((product) => {
                                const price = parseFloat(product.base_price) / 100;
                                const currency = 'Br';

                                return (
                                    <Link href={`/product/${product.slug || product.id}`} key={product.id} className="group cursor-pointer">
                                        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
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
                                                <span className="text-sm font-bold">{price.toFixed(2)} {currency}</span>
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
