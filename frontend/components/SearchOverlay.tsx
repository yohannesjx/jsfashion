"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                const selected = results[selectedIndex];
                if (selected) {
                    saveSearch(query);
                    window.location.href = `/product/${selected.slug}`;
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl mx-auto mt-20 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300">
                {/* Search Input */}
                <div className="flex items-center gap-4 p-6 border-b border-neutral-200">
                    <Search className="w-6 h-6 text-neutral-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for products..."
                        className="flex-1 text-lg outline-none placeholder:text-neutral-400"
                    />
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto" ref={resultsRef}>
                    {query.trim() === '' ? (
                        // Recent searches
                        recentSearches.length > 0 && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Recent Searches
                                    </h3>
                                    <button
                                        onClick={clearRecentSearches}
                                        className="text-xs text-neutral-400 hover:text-black transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {recentSearches.map((search, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleRecentSearchClick(search)}
                                            className="w-full text-left px-4 py-2 hover:bg-neutral-50 rounded-lg transition-colors text-sm"
                                        >
                                            {search}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : results.length > 0 ? (
                        // Search results
                        <div className="p-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-4 px-2">
                                {results.length} {results.length === 1 ? 'Result' : 'Results'}
                            </p>
                            <div className="space-y-1">
                                {results.map((product, idx) => {
                                    const price = product.variants[0]?.price || 0;
                                    const currency = product.variants[0]?.currency || 'Br';

                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/product/${product.slug}`}
                                            onClick={() => handleResultClick(product)}
                                            className={cn(
                                                "flex items-center gap-4 p-3 rounded-lg transition-all",
                                                selectedIndex === idx
                                                    ? "bg-black text-white"
                                                    : "hover:bg-neutral-50"
                                            )}
                                        >
                                            <div className="w-16 h-16 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
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
                                                <h4 className="font-medium text-sm truncate">{product.title}</h4>
                                                <p className={cn(
                                                    "text-xs mt-1",
                                                    selectedIndex === idx ? "text-white/70" : "text-neutral-500"
                                                )}>
                                                    {product.categories[0] || 'Product'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm">{price} {currency}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // No results
                        <div className="p-12 text-center text-neutral-500">
                            <p className="text-lg mb-2">No products found</p>
                            <p className="text-sm">Try searching with different keywords</p>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="border-t border-neutral-200 px-6 py-3 bg-neutral-50 text-xs text-neutral-500 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-white border border-neutral-200 rounded text-[10px]">↑</kbd>
                            <kbd className="px-2 py-1 bg-white border border-neutral-200 rounded text-[10px]">↓</kbd>
                            to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-white border border-neutral-200 rounded text-[10px]">Enter</kbd>
                            to select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-white border border-neutral-200 rounded text-[10px]">Esc</kbd>
                            to close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
