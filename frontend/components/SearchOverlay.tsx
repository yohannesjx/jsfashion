"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Product {
    id: number;
    title: string;
    slug: string;
    thumbnail: string | null;
    categories: string[];
    variants: Array<{
        price: number | null;
        currency: string;
    }>;
}

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [results, setResults] = useState<Product[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Load products and recent searches
    useEffect(() => {
        if (isOpen) {
            fetch('/products.json')
                .then(res => res.json())
                .then(data => setProducts(data))
                .catch(err => console.error('Failed to load products:', err));

            // Load recent searches from localStorage
            const saved = localStorage.getItem('recentSearches');
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }

            // Focus input when opened
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery("");
            setResults([]);
            setSelectedIndex(-1);
        }
    }, [isOpen]);

    // Fuzzy search function
    const fuzzyMatch = (text: string, search: string): number => {
        const textLower = text.toLowerCase();
        const searchLower = search.toLowerCase();

        // Exact match gets highest score
        if (textLower.includes(searchLower)) {
            return 100;
        }

        // Check if all search characters appear in order
        let searchIndex = 0;
        let matches = 0;

        for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
            if (textLower[i] === searchLower[searchIndex]) {
                matches++;
                searchIndex++;
            }
        }

        // Return score based on how many characters matched
        return searchIndex === searchLower.length ? (matches / searchLower.length) * 50 : 0;
    };

    // Search products
    const searchProducts = useCallback((searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const searchTerms = searchQuery.toLowerCase().split(' ').filter(t => t.length > 0);

        const scored = products.map(product => {
            let score = 0;

            // Search in title
            searchTerms.forEach(term => {
                score += fuzzyMatch(product.title, term) * 3; // Title weighted higher
            });

            // Search in categories
            product.categories.forEach(cat => {
                searchTerms.forEach(term => {
                    score += fuzzyMatch(cat, term) * 2;
                });
            });

            return { product, score };
        });

        // Filter and sort by score
        const filtered = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8) // Show top 8 results
            .map(item => item.product);

        setResults(filtered);
        setSelectedIndex(-1);
    }, [products]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchProducts(query);
        }, 150);

        return () => clearTimeout(timer);
    }, [query, searchProducts]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, -1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    saveSearch(query);
                    window.location.href = `/product/${results[selectedIndex].slug}`;
                } else if (query.trim()) {
                    saveSearch(query);
                    window.location.href = `/search?q=${encodeURIComponent(query)}`;
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, results, query, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && resultsRef.current) {
            const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
            selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

    // Save search to recent
    const saveSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    };

    const handleResultClick = (product: Product) => {
        saveSearch(query);
        onClose();
    };

    const handleRecentSearchClick = (search: string) => {
        setQuery(search);
        inputRef.current?.focus();
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentSearches');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white/98 backdrop-blur-xl z-50 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl mx-auto mt-24 px-6 animate-in slide-in-from-top duration-300">
                {/* Search Input */}
                <div className="relative border-b-2 border-black pb-2">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-black" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="SEARCH PRODUCTS..."
                        className="w-full bg-transparent py-4 pl-14 pr-12 text-3xl md:text-5xl font-black tracking-tighter outline-none placeholder:text-neutral-200 uppercase text-black"
                    />
                    <button onClick={onClose} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-neutral-100 rounded-full transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Results */}
                <div className="mt-12 max-h-[60vh] overflow-y-auto" ref={resultsRef}>
                    {query.trim() === '' ? (
                        // Recent searches
                        recentSearches.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Recent Searches
                                    </h3>
                                    <button
                                        onClick={clearRecentSearches}
                                        className="text-xs text-neutral-400 hover:text-black transition-colors underline underline-offset-4"
                                    >
                                        CLEAR HISTORY
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {recentSearches.map((search, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleRecentSearchClick(search)}
                                            className="px-6 py-3 bg-neutral-100 hover:bg-black hover:text-white rounded-full transition-all text-sm font-medium tracking-wide"
                                        >
                                            {search}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : results.length > 0 ? (
                        // Search results
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-widest mb-6">
                                {results.length} SUGGESTIONS
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.map((product, idx) => {
                                    const price = product.variants[0]?.price || 0;
                                    const currency = product.variants[0]?.currency || 'Br';

                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/product/${product.slug}`}
                                            onClick={() => handleResultClick(product)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 transition-all border border-transparent hover:border-black/10 hover:bg-neutral-50",
                                                selectedIndex === idx
                                                    ? "bg-neutral-50 border-black/10"
                                                    : ""
                                            )}
                                        >
                                            <div className="w-20 h-24 bg-neutral-100 overflow-hidden flex-shrink-0">
                                                {product.thumbnail ? (
                                                    <img
                                                        src={product.thumbnail}
                                                        alt={product.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-neutral-200" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-lg tracking-tight truncate">{product.title}</h4>
                                                <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wide">
                                                    {product.categories[0] || 'Product'}
                                                </p>
                                                <p className="font-medium text-sm mt-2">{price} {currency}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                            <div className="mt-8 text-center">
                                <button
                                    onClick={() => {
                                        saveSearch(query);
                                        window.location.href = `/search?q=${encodeURIComponent(query)}`;
                                        onClose();
                                    }}
                                    className="inline-flex items-center gap-2 text-lg font-bold hover:underline underline-offset-4"
                                >
                                    VIEW ALL RESULTS <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        // No results
                        <div className="py-12 text-center text-neutral-400">
                            <p className="text-xl font-light">No products found for "{query}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
