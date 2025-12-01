"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Edit } from "lucide-react";
import Link from "next/link";
import { useVariants } from "@/lib/api/admin/products";
import { Input } from "@/components/ui/input";
import { useUpdateVariant } from "@/lib/api/admin/products";
import { toast } from "sonner";

export function ProductRow({
    product,
    selectedProducts,
    setSelectedProducts,
    updateProduct,
    handleQuickEdit
}: any) {
    const [expanded, setExpanded] = useState(false);
    const { data: variants = [], isLoading: variantsLoading } = useVariants(product.id);
    const updateVariant = useUpdateVariant();

    const handleVariantUpdate = async (variantId: string, field: string, value: any) => {
        try {
            await updateVariant.mutateAsync({
                id: variantId,
                [field]: value,
            });
            toast.success('Variant updated');
        } catch (error) {
            toast.error('Failed to update variant');
        }
    };

    return (
        <>
            <TableRow className="cursor-pointer hover:bg-muted/50">
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={(checked) => {
                            const newSet = new Set(selectedProducts);
                            if (checked) {
                                newSet.add(product.id);
                            } else {
                                newSet.delete(product.id);
                            }
                            setSelectedProducts(newSet);
                        }}
                    />
                </TableCell>
                <TableCell>
                    <div className="w-10 h-10 bg-muted rounded border border-border overflow-hidden">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                No Image
                            </div>
                        )}
                    </div>
                </TableCell>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(!expanded);
                            }}
                        >
                            {expanded ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </Button>
                        <Link href={`/admin/products/${product.id}`} className="hover:underline">
                            {product.name}
                        </Link>
                    </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                        checked={product.is_active ?? false}
                        onCheckedChange={async (checked) => {
                            try {
                                await updateProduct.mutateAsync({
                                    id: product.id,
                                    is_active: checked,
                                });
                                toast.success('Product status updated');
                            } catch (error) {
                                toast.error('Failed to update product status');
                            }
                        }}
                    />
                </TableCell>
                <TableCell>{product.base_price || '0'}</TableCell>
                <TableCell>
                    {(() => {
                        const cat = product.category;
                        if (!cat) return 'Uncategorized';
                        if (typeof cat === 'string') return cat;
                        if (cat && typeof cat === 'object' && 'String' in cat) return (cat as any).String || 'Uncategorized';
                        if (cat && typeof cat === 'object' && 'Valid' in cat && (cat as any).Valid) return (cat as any).String || 'Uncategorized';
                        return 'Uncategorized';
                    })()}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleQuickEdit(product);
                            }}
                        >
                            Quick Edit
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/products/${product.id}`}>
                                <Edit className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {expanded && (
                <TableRow>
                    <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm mb-3">Variants</h4>
                            {variantsLoading ? (
                                <div className="text-sm text-muted-foreground">Loading variants...</div>
                            ) : variants.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No variants</div>
                            ) : (
                                <div className="space-y-2">
                                    {variants.map((variant: any) => {
                                        let size = '';
                                        let color = '';

                                        if (variant.size) {
                                            if (typeof variant.size === 'string') {
                                                size = variant.size;
                                            } else if (variant.size && typeof variant.size === 'object' && 'String' in variant.size) {
                                                size = (variant.size as any).String || '';
                                            } else if (variant.size && typeof variant.size === 'object' && 'Valid' in variant.size && (variant.size as any).Valid) {
                                                size = (variant.size as any).String || '';
                                            }
                                        }

                                        if (variant.color) {
                                            if (typeof variant.color === 'string') {
                                                color = variant.color;
                                            } else if (variant.color && typeof variant.color === 'object' && 'String' in variant.color) {
                                                color = (variant.color as any).String || '';
                                            } else if (variant.color && typeof variant.color === 'object' && 'Valid' in variant.color && (variant.color as any).Valid) {
                                                color = (variant.color as any).String || '';
                                            }
                                        }

                                        const name = [size, color].filter(Boolean).join(' / ') || (size || color || 'Default Variant');
                                        const priceAdj = typeof variant.price_adjustment === 'string' ? variant.price_adjustment : (variant.price_adjustment as any)?.String || '0';
                                        // base_price is in cents from ListProducts, keep in cents
                                        const basePrice = parseFloat(product.base_price || '0');
                                        const price = basePrice + parseFloat(priceAdj);

                                        return (
                                            <div key={variant.id} className="flex items-center gap-4 p-2 bg-card rounded border border-border">
                                                <div className="flex-1 text-sm">{name}</div>
                                                <div className="w-32">
                                                    <Input
                                                        type="text"
                                                        value={variant.sku}
                                                        onChange={(e) => handleVariantUpdate(variant.id, 'sku', e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <Input
                                                        type="number"
                                                        value={price}
                                                        onChange={(e) => {
                                                            const newPrice = parseFloat(e.target.value) || 0;
                                                            const basePrice = parseFloat(product.base_price || '0');
                                                            const newAdj = (newPrice - basePrice).toFixed(2);
                                                            handleVariantUpdate(variant.id, 'price_adjustment', newAdj);
                                                        }}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <Input
                                                        type="number"
                                                        value={variant.stock_quantity}
                                                        onChange={(e) => handleVariantUpdate(variant.id, 'stock_quantity', parseInt(e.target.value) || 0)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

