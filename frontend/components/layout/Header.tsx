"use client";

import Link from "next/link";
import { Menu, X, Search, ShoppingBag, User } from "lucide-react";
import { useState, useEffect } from "react";
import SearchOverlay from "@/components/SearchOverlay";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useCategories } from "@/lib/api/categories";

export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const cartItemsCount = useCartStore((state) => state.getTotalItems());
    const { data: categories = [] } = useCategories();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = [
        ...(categories?.map(cat => ({
            label: cat.name.toUpperCase(),
            href: `/shop/${cat.slug}`,
            isSpecial: false
        })) || []),
        { label: "GIFT CARD", href: "/gift-card", isSpecial: true }
    ];

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
            {/* Top Banner */}
            <div className="bg-black text-white text-center py-2 text-xs md:text-sm tracking-widest">
                FREE SHIPPING ON ORDERS OVER 5000 Br
            </div>

            {/* Main Header */}
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                {/* Logo */}
                <Link href="/" className="text-2xl font-black tracking-tighter">
                    JsFashion
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-6 text-sm font-medium tracking-wide">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "hover:underline underline-offset-4 transition-all",
                                item.isSpecial ? "text-neutral-900 font-bold" : "text-neutral-600 hover:text-black"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-4 md:gap-6">
                    {/* Search */}
                    <button onClick={() => setIsSearchOpen(!isSearchOpen)}>
                        <Search className="w-5 h-5 md:w-6 md:h-6" />
                    </button>

                    {/* Profile */}
                    <Link href="/account" className="hidden md:block">
                        <User className="w-6 h-6" />
                    </Link>

                    {/* Cart */}
                    <Link href="/cart" className="relative">
                        <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                        {mounted && cartItemsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                                {cartItemsCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden border-t border-neutral-200 bg-white">
                    <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "text-lg font-medium tracking-wide py-2 border-b border-neutral-100",
                                    item.isSpecial ? "text-neutral-900 font-bold" : "text-neutral-600"
                                )}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}

                        {/* Mobile Only Links */}
                        <div className="pt-4 space-y-4 border-t border-neutral-200">
                            <Link href="/account" className="block text-lg font-medium text-neutral-600">
                                ACCOUNT
                            </Link>
                            <Link href="/wishlist" className="block text-lg font-medium text-neutral-600">
                                WISHLIST
                            </Link>
                        </div>
                    </nav>
                </div>
            )}

            {/* Search Overlay */}
            <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </header>
    );
}
