"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: string;
    image_url: string | null;
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

export default function RelatedProducts({ productId }: { productId: string }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
                const res = await fetch(`${API_URL}/api/v1/products/${productId}/related`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(shuffleArray(data || []));
                }
            } catch (e) {
                console.error('Failed to load related products:', e);
            } finally {
                setLoading(false);
            }
        }
        if (productId) {
            load();
        }
    }, [productId]);

    if (loading || products.length === 0) return null;

    return (
        <section className="py-12 border-t border-neutral-100">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold mb-8 tracking-tight">YOU MIGHT ALSO LIKE</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
                    {products.map((product) => (
                        <Link key={product.id} href={`/product/${product.slug}`} className="group block">
                            <div className="aspect-[3/4] bg-neutral-100 mb-4 overflow-hidden relative">
                                {product.image_url ? (
                                    <Image
                                        src={product.image_url}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <h3 className="text-sm font-medium text-neutral-900 group-hover:underline underline-offset-4">
                                {product.name}
                            </h3>
                            <div className="mt-1 flex items-baseline gap-2">
                                {product.sale_price ? (
                                    <>
                                        <span className="text-sm font-semibold text-red-600">
                                            {// Assuming base_price is coming as string from backend like "1200", we just display it.
                                                // sale_price comes as number/float from our earlier handlers.
                                                product.sale_price.toLocaleString()} Br
                                        </span>
                                        <span className="text-xs text-neutral-400 line-through">
                                            {parseInt(product.base_price).toLocaleString()} Br
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-neutral-500">
                                        {parseInt(product.base_price).toLocaleString()} Br
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
