"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    Row,
} from "@tanstack/react-table";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GripVertical, Trash2, Plus, Image as ImageIcon, CheckSquare, Copy, Download, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateVariant, useUpdateVariant, useDeleteVariant, useBulkUpdateVariants, ProductVariant } from "@/lib/api/admin/products";
import { uploadApi } from "@/lib/api/admin/upload";
import { toast } from "sonner";

export type Variant = {
    id: string;
    image: string | null;
    name: string;
    sku: string;
    price: number;
    comparePrice?: number;
    stock: number;
    display_order?: number;
    selected?: boolean;
};

interface VariantTableEnhancedProps {
    productId: string;
    variants: ProductVariant[];
    basePrice: number;
    productImageUrl?: string | null;
    onVariantsChange?: (variants: ProductVariant[]) => void;
}

// Sortable Row Component
function SortableRow({ row, table }: { row: Row<Variant>; table: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: row.original.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            data-state={row.getIsSelected() && "selected"}
            className={isDragging ? "bg-muted" : ""}
        >
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="p-0 h-12 border-r last:border-r-0 border-border px-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    );
}

// Editable Cell Component
const EditableCell = ({
    getValue,
    row,
    column,
    table,
    onSave,
}: any) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        // When editing a stock cell that currently has 0, clear the input so user can type fresh
        if (isEditing && column.id === 'stock' && (initialValue === 0 || initialValue === '0')) {
            setValue('');
        } else {
            setValue(initialValue);
        }
    }, [isEditing, column.id, initialValue]);

    const handleBlur = () => {
        let finalValue = value;
        if (column.id === 'stock') {
            // Convert empty string to 0, otherwise parse number
            finalValue = value === '' ? 0 : Number(value);
        }
        if (finalValue !== initialValue) {
            table.options.meta?.updateData(row.index, column.id, finalValue);
            onSave?.(row.original, column.id, finalValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
        }
    };

    if (!isEditing) {
        return (
            <div
                onClick={() => {
                    setIsEditing(true);
                    if (column.id === 'stock') {
                        setValue('');
                    }
                }}
                className="w-full p-2 h-full cursor-text hover:bg-muted/50 rounded"
            >
                {column.id === 'price' || column.id === 'comparePrice' || column.id === 'stock'
                    ? typeof value === 'number' ? value.toLocaleString() : value
                    : value || '-'}
            </div>
        );
    }

    return (
        <Input
            value={value}
            onChange={(e) => {
                const val = column.id === 'stock'
                    ? e.target.value // keep as string, conversion on blur
                    : column.id === 'price' || column.id === 'comparePrice'
                        ? e.target.value === ''
                            ? 0
                            : Number(e.target.value)
                        : e.target.value;
                setValue(val);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-full border-none focus:ring-1 focus:ring-primary no-spinner"
            type={column.id === 'price' || column.id === 'comparePrice' ? 'number' : 'text'}
        />
    );
};

export function VariantTableEnhanced({ productId, variants: initialVariants, basePrice, productImageUrl, onVariantsChange }: VariantTableEnhancedProps) {
    const mapVariants = useCallback((variants: ProductVariant[], price: number, img: string | null | undefined) => {
        return variants.map(v => {
            // Handle both object and string formats for size/color
            let size = '';
            // Extract size
            if (v.size) {
                if (typeof v.size === 'string') {
                    size = v.size;
                } else if (v.size && typeof v.size === 'object' && 'String' in v.size) {
                    size = (v.size as any).String || '';
                } else if (v.size && typeof v.size === 'object' && 'Valid' in v.size && (v.size as any).Valid) {
                    size = (v.size as any).String || '';
                }
            }

            let color = '';
            // Extract color
            if (v.color) {
                if (typeof v.color === 'string') {
                    color = v.color;
                } else if (v.color && typeof v.color === 'object' && 'String' in v.color) {
                    color = (v.color as any).String || '';
                } else if (v.color && typeof v.color === 'object' && 'Valid' in v.color && (v.color as any).Valid) {
                    color = (v.color as any).String || '';
                }
            }

            // Build variant name from size and color
            let name = '';
            if (size && color) {
                name = `${size} / ${color}`;
            } else if (size) {
                name = size;
            } else if (color) {
                name = color;
            } else {
                // If no size or color, use SKU as fallback
                name = v.sku || 'Variant';
            }

            const priceAdj = typeof v.price_adjustment === 'string' ? v.price_adjustment : (v.price_adjustment as any)?.String || '0';

            // Backend returns price in cents (int64) if available from prices table
            // If price is 0 (no record), fallback to basePrice + adjustment
            let finalPrice = 0;
            if (v.price && v.price > 0) {
                finalPrice = v.price; // Keep in cents
            } else {
                finalPrice = price + parseFloat(priceAdj); // basePrice is in cents
            }

            let variantImage = null;
            // Check if image exists on the variant object (it might be missing in the type definition but present in runtime)
            const vAny = v as any;
            if (vAny.image) {
                if (typeof vAny.image === 'string') {
                    variantImage = vAny.image;
                } else if (typeof vAny.image === 'object' && 'String' in vAny.image) {
                    variantImage = vAny.image.String;
                } else if (typeof vAny.image === 'object' && 'Valid' in vAny.image && vAny.image.Valid) {
                    variantImage = vAny.image.String;
                }
            }

            return {
                id: v.id,
                image: variantImage || img || null, // Use variant image, fallback to product image
                name: name,
                sku: v.sku,
                price: finalPrice,
                comparePrice: undefined,
                stock: v.stock_quantity || 0,
                display_order: v.display_order,
            };
        }).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }, []);

    const [variants, setVariants] = useState<Variant[]>(() =>
        mapVariants(initialVariants, basePrice, productImageUrl)
    );

    useEffect(() => {
        setVariants(mapVariants(initialVariants, basePrice, productImageUrl));
    }, [initialVariants, basePrice, productImageUrl, mapVariants]);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    const [bulkPrice, setBulkPrice] = useState("");
    const [bulkStock, setBulkStock] = useState("");

    // Variant generation state
    const [optionSets, setOptionSets] = useState<{ name: string; values: string[] }[]>([
        { name: 'Size', values: [] },
        { name: 'Color', values: [] },
    ]);

    const updateVariant = useUpdateVariant();
    const deleteVariant = useDeleteVariant();
    const bulkUpdateVariants = useBulkUpdateVariants();
    const createVariant = useCreateVariant();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setVariants((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist new order
                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    display_order: index,
                }));

                bulkUpdateVariants.mutateAsync({
                    productId,
                    variants: updates,
                }).catch(err => {
                    toast.error('Failed to save order');
                    console.error(err);
                });

                return newItems;
            });
        }
    };

    const handleSave = useCallback(async (variant: Variant, columnId: string, value: any) => {
        try {
            const variantData = initialVariants.find(v => v.id === variant.id);
            if (!variantData) return;

            const updateData: any = {};
            if (columnId === 'sku') {
                updateData.sku = String(value);
            }
            if (columnId === 'price') {
                const priceAdjustment = (Number(value) - basePrice).toFixed(2);
                updateData.price_adjustment = priceAdjustment;
            }
            if (columnId === 'stock') {
                updateData.stock_quantity = Number(value);
            }
            if (columnId === 'name') {
                // Parse name to extract size/color
                const parts = String(value).split('/').map((p: string) => p.trim());
                if (parts.length >= 2) {
                    updateData.size = parts[0] || null;
                    updateData.color = parts[1] || null;
                } else if (parts.length === 1 && parts[0]) {
                    updateData.size = parts[0];
                }
            }

            // Ensure at least one field is being updated
            if (Object.keys(updateData).length === 0) {
                console.warn('No fields to update for variant', variant.id);
                return;
            }

            await updateVariant.mutateAsync({
                id: String(variant.id),
                ...updateData,
            });

            // Update local state to reflect the new stock (or other fields)
            setVariants(prev => prev.map(v =>
                v.id === variant.id ? { ...v, ...updateData, stock: updateData.stock_quantity } : v
            ));

            toast.success('Variant updated');
        } catch (error) {
            toast.error('Failed to update variant');
            console.error(error);
        }
    }, [initialVariants, basePrice, updateVariant]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        const rows = paste.split('\n').filter(r => r.trim());
        const selectedRows = Object.keys(rowSelection).map(Number);

        if (selectedRows.length === 0) {
            toast.error('Please select rows to paste into');
            return;
        }

        rows.forEach((row, idx) => {
            if (selectedRows[idx] !== undefined) {
                const cells = row.split('\t');
                const variant = variants[selectedRows[idx]!];
                if (variant) {
                    const updates: Partial<Variant> = {};
                    if (cells[0]) updates.sku = cells[0];
                    if (cells[1]) updates.price = parseFloat(cells[1]) || variant.price;
                    if (cells[2]) updates.stock = parseInt(cells[2]) || variant.stock;
                    setVariants(prev => prev.map((v, i) => i === selectedRows[idx]! ? { ...v, ...updates } : v));
                }
            }
        });

        toast.success('Pasted data');
    }, [rowSelection, variants]);

    const handleCopy = useCallback(() => {
        const selectedRows = Object.keys(rowSelection).map(Number);
        if (selectedRows.length === 0) {
            toast.error('Please select rows to copy');
            return;
        }

        const text = selectedRows.map(idx => {
            const v = variants[idx];
            return v ? `${v.sku}\t${v.price}\t${v.stock}` : '';
        }).join('\n');

        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    }, [rowSelection, variants]);

    const handleBulkUpdate = async () => {
        const selectedIndices = Object.keys(rowSelection).map(Number);
        if (selectedIndices.length === 0) return;

        try {
            const updates = selectedIndices.map(idx => {
                const variant = variants[idx];
                if (!variant) return null;
                return {
                    id: variant.id,
                    price_adjustment: bulkPrice ? (parseFloat(bulkPrice) - basePrice).toFixed(2) : undefined,
                    stock_quantity: bulkStock ? parseInt(bulkStock) : undefined,
                };
            }).filter(Boolean) as any[];

            await bulkUpdateVariants.mutateAsync({
                productId,
                variants: updates,
            });

            setIsBulkEditDialogOpen(false);
            setBulkPrice("");
            setBulkStock("");
            setRowSelection({});
            toast.success('Variants updated');
        } catch (error) {
            toast.error('Failed to update variants');
        }
    };

    const handleBulkDelete = async () => {
        const selectedIndices = Object.keys(rowSelection).map(Number);
        if (selectedIndices.length === 0) return;

        const selectedVariants = selectedIndices.map(idx => variants[idx]).filter(Boolean);

        if (!confirm(`Are you sure you want to delete ${selectedVariants.length} variant(s)?`)) {
            return;
        }

        try {
            // Delete all selected variants
            await Promise.all(
                selectedVariants.map(variant =>
                    deleteVariant.mutateAsync({ id: variant.id, productId })
                )
            );

            // Update local state
            setVariants(prev => prev.filter(v => !selectedVariants.find(sv => sv.id === v.id)));
            setRowSelection({});
            toast.success(`${selectedVariants.length} variant(s) deleted`);
        } catch (error) {
            toast.error('Failed to delete variants');
            console.error(error);
        }
    };

    const handleGenerateVariants = async () => {
        if (optionSets.length === 0 || optionSets.some(s => s.values.length === 0)) {
            toast.error('Please add at least one option with values');
            return;
        }

        // Generate all combinations
        const combinations: any[] = [];
        const generate = (current: any[], index: number) => {
            if (index === optionSets.length) {
                combinations.push([...current]);
                return;
            }
            optionSets[index]!.values.forEach(value => {
                generate([...current, { name: optionSets[index]!.name, value }], index + 1);
            });
        };
        generate([], 0);

        // Create variants
        try {
            for (const combo of combinations) {
                const name = combo.map((c: any) => c.value).join(' / ');
                const size = combo.find((c: any) => c.name === 'Size')?.value || null;
                const color = combo.find((c: any) => c.name === 'Color')?.value || null;
                const sku = `${productId.slice(0, 8)}-${combo.map((c: any) => c.value.slice(0, 3).toUpperCase()).join('-')}`;

                await createVariant.mutateAsync({
                    product_id: productId,
                    sku,
                    size,
                    color,
                    price_adjustment: '0',
                    stock_quantity: 0,
                });
            }

            setIsGenerateDialogOpen(false);
            setOptionSets([{ name: 'Size', values: [] }, { name: 'Color', values: [] }]);
            toast.success(`Generated ${combinations.length} variants`);
            onVariantsChange?.([]); // Trigger refetch
        } catch (error) {
            toast.error('Failed to generate variants');
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingVariantId, setUploadingVariantId] = useState<string | null>(null);

    const handleImageClick = (variantId: string) => {
        setUploadingVariantId(variantId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingVariantId) return;

        try {
            toast.info('Uploading image...');
            const url = await uploadApi.uploadFile(file);

            await updateVariant.mutateAsync({
                id: uploadingVariantId,
                image: url,
            });

            setVariants(prev => prev.map(v =>
                v.id === uploadingVariantId ? { ...v, image: url } : v
            ));

            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload image');
        } finally {
            setUploadingVariantId(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const columns: ColumnDef<Variant>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            size: 40,
        },
        {
            id: "drag",
            header: "",
            cell: () => (
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                    <GripVertical className="w-4 h-4" />
                </div>
            ),
            size: 40,
        },
        {
            accessorKey: "image",
            header: "Image",
            cell: ({ row }) => {
                let imageUrl = '';
                const img = row.original.image;
                if (img) {
                    if (typeof img === 'string') {
                        imageUrl = img;
                    } else if (typeof img === 'object' && 'String' in img && (img as any).Valid) {
                        imageUrl = (img as any).String;
                    }
                }

                return (
                    <div
                        className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center overflow-hidden group relative cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(row.original.id)}
                    >
                        {imageUrl ? (
                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="w-4 h-4 text-white" />
                        </div>
                    </div>
                );
            },
            size: 60,
        },
        {
            accessorKey: "name",
            header: "Variant Name",
            cell: ({ row }) => {
                const variant = initialVariants.find(v => v.id === row.original.id);
                if (!variant) return <div className="px-2 py-1">Default</div>;

                // Handle both object and string formats
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

                // Build display name
                let displayName = '';
                if (size && color) {
                    displayName = `${size} / ${color}`;
                } else if (size) {
                    displayName = size;
                } else if (color) {
                    displayName = color;
                } else {
                    displayName = variant.sku || 'Variant';
                }

                return (
                    <div className="px-2 py-1">
                        {displayName}
                    </div>
                );
            },
        },
        {
            accessorKey: "sku",
            header: "SKU",
            cell: (props) => <EditableCell {...props} onSave={handleSave} />,
        },
        {
            accessorKey: "price",
            header: "Price",
            cell: (props) => <EditableCell {...props} onSave={handleSave} />,
        },
        {
            accessorKey: "comparePrice",
            header: "Compare Price",
            cell: (props) => <EditableCell {...props} onSave={handleSave} />,
        },
        {
            accessorKey: "stock",
            header: "Stock",
            cell: (props) => <EditableCell {...props} onSave={handleSave} />,
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                        try {
                            await deleteVariant.mutateAsync({ id: row.original.id, productId });
                            setVariants(prev => prev.filter(v => v.id !== row.original.id));
                            toast.success('Variant deleted');
                        } catch (error) {
                            toast.error('Failed to delete variant');
                        }
                    }}
                    className="text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            ),
            size: 40,
        },
    ];

    const table = useReactTable({
        data: variants,
        columns,
        state: { rowSelection },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            updateData: (rowIndex: number, columnId: string, value: any) => {
                setVariants((old) =>
                    old.map((row, index) => {
                        if (index === rowIndex) {
                            return { ...old[rowIndex]!, [columnId]: value };
                        }
                        return row;
                    })
                );
            },
        },
    });

    return (
        <div className="space-y-4" onPaste={handlePaste}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Variants</h3>
                <div className="flex gap-2">
                    {Object.keys(rowSelection).length > 0 && (
                        <>
                            <Button variant="outline" size="sm" onClick={handleCopy}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsBulkEditDialogOpen(true)}>
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Edit Selected ({Object.keys(rowSelection).length})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete ({Object.keys(rowSelection).length})
                            </Button>
                        </>
                    )}
                    <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Generate Variants
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Generate Variants from Options</DialogTitle>
                                <DialogDescription>
                                    Create all combinations of options (e.g., Size × Color)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {optionSets.map((set, idx) => (
                                    <div key={idx} className="space-y-2 p-3 border border-border rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Option name (e.g., Size)"
                                                value={set.name}
                                                onChange={(e) => {
                                                    const newSets = [...optionSets];
                                                    newSets[idx]!.name = e.target.value;
                                                    setOptionSets(newSets);
                                                }}
                                                className="flex-1"
                                            />
                                            {optionSets.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        const newSets = optionSets.filter((_, i) => i !== idx);
                                                        setOptionSets(newSets.length > 0 ? newSets : [{ name: 'Size', values: [] }]);
                                                    }}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <Input
                                            placeholder="Enter values separated by commas (e.g., S, M, L)"
                                            onBlur={(e) => {
                                                const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                                                const newSets = [...optionSets];
                                                newSets[idx]!.values = values;
                                                setOptionSets(newSets);
                                            }}
                                        />
                                        {set.values.length > 0 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {set.values.map((v, i) => (
                                                    <span key={i} className="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1">
                                                        {v}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newSets = [...optionSets];
                                                                newSets[idx]!.values = newSets[idx]!.values.filter((_, j) => j !== i);
                                                                setOptionSets(newSets);
                                                            }}
                                                            className="ml-1 text-destructive hover:text-destructive-foreground"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOptionSets(prev => [...prev, { name: '', values: [] }])}
                                    className="w-full"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Option
                                </Button>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleGenerateVariants}>Generate Variants</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button size="sm" onClick={async () => {
                        try {
                            await createVariant.mutateAsync({
                                product_id: productId,
                                sku: `${productId.slice(0, 8)}-NEW-${Date.now()}`,
                                price_adjustment: '0',
                                stock_quantity: 0,
                            });
                            toast.success('Variant created');
                            onVariantsChange?.([]); // Trigger refetch
                        } catch (error) {
                            toast.error('Failed to create variant');
                        }
                    }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variant
                    </Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden bg-card shadow-sm">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <Table>
                        <TableHeader className="bg-muted/50">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} style={{ width: header.getSize() }}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            <SortableContext
                                items={variants.map(v => v.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <SortableRow key={row.original.id} row={row} table={table} />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No variants. Generate or add one above.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </SortableContext>
                        </TableBody>
                    </Table>
                </DndContext>
            </div>

            <div className="text-xs text-muted-foreground">
                Tip: Click cells to edit, drag rows to reorder, select rows and use Ctrl+C/Ctrl+V to copy/paste
            </div>

            <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Edit Variants</DialogTitle>
                        <DialogDescription>
                            Update {Object.keys(rowSelection).length} selected variants
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Price Adjustment</Label>
                            <Input
                                type="number"
                                placeholder="Enter price adjustment"
                                onChange={(e) => {
                                    // TODO: Implement bulk update state
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Stock Quantity</Label>
                            <Input
                                type="number"
                                placeholder="Enter stock quantity"
                                onChange={(e) => {
                                    // TODO: Implement bulk update state
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={async () => {
                            // TODO: Implement bulk update logic
                            setIsBulkEditDialogOpen(false);
                            setRowSelection({});
                        }}>Update Variants</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

