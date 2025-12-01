"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useUpdateProduct } from "@/lib/api/admin/products";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProductSheetEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: any; // Replace with proper type
}

export function ProductSheetEditor({ open, onOpenChange, product }: ProductSheetEditorProps) {
    const [formData, setFormData] = useState(product || {});
    const updateProduct = useUpdateProduct();

    const handleSave = async () => {
        if (!product?.id) {
            toast.error("Product ID is missing");
            return;
        }

        try {
            await updateProduct.mutateAsync({
                id: product.id,
                name: formData.name,
                description: formData.description || "",
                base_price: formData.base_price,
                is_active: formData.is_active,
            });

            toast.success("Product updated successfully");
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to update product");
            console.error("Update error:", error);
        }
    };

    if (!product) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Edit Product</SheetTitle>
                    <SheetDescription>
                        Make quick changes to your product here. Click save when you're done.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                            id="name"
                            defaultValue={product.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                            id="status"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            defaultValue={product.is_active ? "active" : "draft"}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                        >
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="price">Base Price (cents)</Label>
                        <Input
                            id="price"
                            type="number"
                            defaultValue={product.base_price}
                            onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            defaultValue={product.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
                <SheetFooter>
                    <Button
                        type="submit"
                        onClick={handleSave}
                        disabled={updateProduct.isPending}
                    >
                        {updateProduct.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save changes"
                        )}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
