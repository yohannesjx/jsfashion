"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag } from "lucide-react";

interface CartItem {
    variantId: string;
    productId: string;
    name: string;
    sku: string;
    size: string | null;
    color: string | null;
    price: number;
    quantity: number;
    image_url: string | null;
}

interface CheckoutConfirmationProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cart: CartItem[];
    total: number;
    onConfirm: () => void;
    isLoading?: boolean;
}

export function CheckoutConfirmation({
    open,
    onOpenChange,
    cart,
    total,
    onConfirm,
    isLoading = false
}: CheckoutConfirmationProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <ShoppingBag className="h-6 w-6" />
                        Confirm Order
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Items List */}
                    <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-3">
                            {cart.map((item, idx) => (
                                <div key={`${item.variantId}-${idx}`} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                    {/* Thumbnail */}
                                    <img
                                        src={item.image_url || '/placeholder-1.jpg'}
                                        alt={item.name}
                                        className="w-20 h-20 object-cover rounded flex-shrink-0"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/placeholder-1.jpg';
                                        }}
                                    />

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium line-clamp-2">{item.name}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {item.size && <span className="mr-2">{item.size}</span>}
                                            {item.color && <span>{item.color}</span>}
                                            {!item.size && !item.color && <span>Default</span>}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {item.quantity} x {item.price.toLocaleString()} Br
                                        </p>
                                    </div>

                                    {/* Subtotal */}
                                    <div className="flex items-center">
                                        <p className="font-semibold text-lg">
                                            {(item.price * item.quantity).toLocaleString()} Br
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Total */}
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xl font-semibold">Total:</span>
                            <span className="text-3xl font-bold text-black">
                                {total.toLocaleString()} Br
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {cart.length} item{cart.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 h-12"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-12 bg-black text-white hover:bg-neutral-800"
                            onClick={onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Complete Order'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
