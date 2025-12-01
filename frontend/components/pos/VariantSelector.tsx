"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    base_price: string;
    variants?: Variant[];
}

interface Variant {
    id: string;
    product_id: string;
    name: string;
    sku: string;
    size: string | null;
    color: string | null;
    price: number;
    stock: number;
    active: boolean;
    image: string | null;
    price_adjustment: string | null;
}

interface VariantSelectorProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddToCart: (variant: Variant, quantity: number) => void;
}

export function VariantSelector({ product, open, onOpenChange, onAddToCart }: VariantSelectorProps) {
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (open) {
            setSelectedVariant(null);
            setQuantity(1);
        }
    }, [open]);

    if (!product) return null;

    const variants = product.variants || [];
    const hasVariants = variants.length > 0;

    const handleAddToCart = () => {
        if (selectedVariant) {
            onAddToCart(selectedVariant, quantity);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {hasVariants ? (
                        <div className="grid grid-cols-1 gap-4">
                            {variants.map((variant) => {
                                const price = variant.price / 100.0;
                                const isSelected = selectedVariant?.id === variant.id;
                                const outOfStock = variant.stock <= 0;

                                return (
                                    <div
                                        key={variant.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                                            isSelected ? "border-black bg-neutral-50 ring-1 ring-black" : "border-gray-200 hover:border-gray-300",
                                            outOfStock && "opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => !outOfStock && setSelectedVariant(variant)}
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {variant.name}
                                            </div>
                                            <div className="text-sm text-gray-500">SKU: {variant.sku}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">${price.toFixed(2)}</div>
                                            <div className={cn("text-xs", outOfStock ? "text-red-500" : "text-green-600")}>
                                                {outOfStock ? "Out of Stock" : `${variant.stock} in stock`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">No variants available for this product.</div>
                    )}

                    {selectedVariant && (
                        <div className="flex items-center gap-4 justify-end">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    -
                                </Button>
                                <span className="w-8 text-center font-medium">{quantity}</span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
                                >
                                    +
                                </Button>
                            </div>
                            <Button onClick={handleAddToCart} className="bg-black text-white hover:bg-neutral-800">
                                Add to Cart
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
