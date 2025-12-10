'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Plus,
    Search,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ChevronDown,
    ChevronRight as ChevronRightIcon,
    Tags,
    Edit2,
    Check,
    X,
    Download
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';
import { useCategories, useSetProductCategories, useProductCategories } from '@/lib/api/admin/categories';
import { useCreateVariant, useUpdateVariant, useDeleteVariant, useDeleteProduct, useUpdateProduct } from '@/lib/api/admin/products';
import { MediaPicker } from '@/components/admin/MediaPicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface Variant {
    id: string;
    sku: string;
    name: string;
    price: number;
    stock_quantity: number;
    size?: string | null;
    color?: string | null;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    base_price: string;
    image_url?: string;
    is_active?: boolean;
    created_at: string;
    variants?: Variant[];
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk category assignment
    const [isBulkCategoryDialogOpen, setIsBulkCategoryDialogOpen] = useState(false);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const { data: categories = [] } = useCategories();
    const setProductCategories = useSetProductCategories();

    // Inline editing
    const [editingCell, setEditingCell] = useState<{ variantId: string; field: 'price' | 'stock' | 'size' | 'color' } | null>(null);
    const [editValue, setEditValue] = useState('');
    const updateVariant = useUpdateVariant();
    const createVariant = useCreateVariant();
    const deleteVariant = useDeleteVariant();
    const deleteProduct = useDeleteProduct();
    const updateProduct = useUpdateProduct();

    // Media Picker state
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    // Category assignment state
    const [categoryEditingProductId, setCategoryEditingProductId] = useState<string | null>(null);
    const [productCategoriesCache, setProductCategoriesCache] = useState<Record<string, string[]>>({});

    const limit = 100;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setProducts([]);
        setPage(1);
        setHasMore(true);
        setSelectedIds(new Set());
        fetchProducts(1, false);
    }, [debouncedSearch]);

    const fetchVariantsInBackground = async (productsToFetch: Product[], isAppend: boolean) => {
        const token = localStorage.getItem('access_token');
        const BATCH_SIZE = 5;

        for (let i = 0; i < productsToFetch.length; i += BATCH_SIZE) {
            const batch = productsToFetch.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(async (product) => {
                    try {
                        const variantRes = await fetch(`${API_URL}/api/v1/products/${product.id}`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                        });
                        if (variantRes.ok) {
                            const variantData = await variantRes.json();
                            return { ...product, variants: variantData.variants || [] };
                        }
                    } catch (e) {
                        // ignore
                    }
                    return { ...product, variants: [] };
                })
            );

            // Update state incrementally
            setProducts(prev => {
                const updatedBatchMap = new Map(batchResults.map(p => [p.id, p]));
                return prev.map(p => {
                    const updated = updatedBatchMap.get(p.id);
                    if (updated) return { ...p, variants: updated.variants };
                    return p;
                });
            });
        }
    };

    const fetchProducts = async (pageNum: number, append: boolean = false) => {
        setIsLoading(!append);

        try {
            const token = localStorage.getItem('access_token');
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: limit.toString(),
                ...(debouncedSearch && { search: debouncedSearch }),
                _t: new Date().getTime().toString(), // Cache busting without headers
            });

            const response = await fetch(`${API_URL}/api/v1/admin/products?${params}`, {
                method: 'GET',
                // cache: 'no-store', // This might still trigger headers in some browsers/nextjs versions so be careful, but standard fetch API it's usually fine. 
                // However, Next.js extensions might add headers. 
                // Safe bet: remove custom headers that caused CORS and rely on query param + no-store signal
                cache: 'no-store',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const newProducts = data.products || data || [];

                // 1. Set products immediately to unblock UI
                const productsInit = newProducts.map((p: any) => ({ ...p, variants: [] }));

                if (append) {
                    setProducts(prev => [...prev, ...productsInit]);
                } else {
                    setProducts(productsInit);
                }
                setHasMore(newProducts.length === limit);
                setIsLoading(false); // Unblock UI here!

                // 2. Fetch variants in background
                // Use a defined function to avoid clutter
                fetchVariantsInBackground(newProducts, append);
            } else {
                toast.error('Failed to load products');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (productId: string) => {
        setExpandedProducts(prev => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === products.length && products.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(products.map(p => p.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkCategoryAssign = async () => {
        if (selectedCategoryIds.length === 0) {
            toast.error('Please select at least one category');
            return;
        }

        try {
            const toastId = toast.loading(`Assigning categories to ${selectedIds.size} products...`);

            for (const productId of selectedIds) {
                await setProductCategories.mutateAsync({
                    productId,
                    categoryIds: selectedCategoryIds,
                });
            }

            toast.dismiss(toastId);
            toast.success(`Categories assigned to ${selectedIds.size} products`);
            setIsBulkCategoryDialogOpen(false);
            setSelectedCategoryIds([]);
            setSelectedIds(new Set());
        } catch (error) {
            toast.error('Failed to assign categories');
        }
    };

    const startEdit = (variantId: string, field: 'price' | 'stock' | 'size' | 'color', currentValue: number | string | null | undefined) => {
        setEditingCell({ variantId, field });
        setEditValue(currentValue?.toString() || '');
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const saveEdit = async (productId: string) => {
        if (!editingCell) return;

        try {
            let updateData: any = { id: editingCell.variantId };

            if (editingCell.field === 'price' || editingCell.field === 'stock') {
                const value = parseFloat(editValue);
                if (isNaN(value) || value < 0) {
                    toast.error('Invalid value');
                    return;
                }
                updateData[editingCell.field === 'price' ? 'price_adjustment' : 'stock_quantity'] =
                    editingCell.field === 'price' ? value.toString() : value;
            } else if (editingCell.field === 'size' || editingCell.field === 'color') {
                // For size and color, accept string values
                updateData[editingCell.field] = editValue.trim() || null;
            }

            await updateVariant.mutateAsync(updateData);

            // Update local state
            setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                    return {
                        ...p,
                        variants: p.variants?.map(v => {
                            if (v.id === editingCell.variantId) {
                                if (editingCell.field === 'price') {
                                    return { ...v, price: parseFloat(editValue) };
                                } else if (editingCell.field === 'stock') {
                                    return { ...v, stock_quantity: parseFloat(editValue) };
                                } else if (editingCell.field === 'size') {
                                    return { ...v, size: editValue.trim() || null };
                                } else if (editingCell.field === 'color') {
                                    return { ...v, color: editValue.trim() || null };
                                }
                            }
                            return v;
                        })
                    };
                }
                return p;
            }));

            toast.success('Updated successfully');
            cancelEdit();
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const handleAddVariant = async (productId: string) => {
        const sku = `VAR-${Date.now()}`;
        try {
            await createVariant.mutateAsync({
                product_id: productId,
                sku,
                stock_quantity: 0,
            });

            toast.success('Variant added');
            // Refresh products
            fetchProducts(page, false);
        } catch (error) {
            toast.error('Failed to add variant');
        }
    };

    const handleDeleteVariant = async (productId: string, variantId: string) => {
        if (!confirm('Are you sure you want to delete this variant?')) return;

        try {
            await deleteVariant.mutateAsync({ id: variantId, productId });

            // Update local state
            setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                    return {
                        ...p,
                        variants: p.variants?.filter(v => v.id !== variantId)
                    };
                }
                return p;
            }));

            toast.success('Variant deleted');
        } catch (error) {
            toast.error('Failed to delete variant');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedIds.size} product(s)? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        const toastId = toast.loading(`Deleting ${selectedIds.size} products...`);
        const successIds: string[] = [];
        const failedIds: string[] = [];

        try {
            for (const productId of selectedIds) {
                try {
                    await deleteProduct.mutateAsync(productId);
                    successIds.push(productId);
                } catch (error) {
                    console.error(`Failed to delete product ${productId}:`, error);
                    failedIds.push(productId);
                }
            }

            // Update local state - remove only successfully deleted products
            setProducts(prev => prev.filter(p => !successIds.includes(p.id)));
            setSelectedIds(new Set());

            toast.dismiss(toastId);
            if (failedIds.length === 0) {
                toast.success(`Successfully deleted ${successIds.length} product(s)`);
            } else {
                toast.warning(`Deleted ${successIds.length} product(s), ${failedIds.length} failed`);
            }
        } catch (error) {
            toast.dismiss(toastId);
            toast.error('Failed to delete products');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            const toastId = toast.loading('Generating CSV...');
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/v1/admin/inventory/export`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to fetch export data');

            const data = await res.json();

            if (!data || data.length === 0) {
                toast.dismiss(toastId);
                toast.info('No inventory data to export');
                return;
            }

            // Convert to CSV
            const csvContent = "data:text/csv;charset=utf-8,"
                + "Product Name,SKU,Price,Stock\n"
                + data.map((item: any) => {
                    // Escape quotes in product name
                    const name = item.product_name.replace(/"/g, '""');
                    return `"${name}","${item.sku}",${item.price},${item.stock}`;
                }).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.dismiss(toastId);
            toast.success('Exported successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export CSV');
        }
    };

    const handleImageSelect = async (imageUrl: string) => {
        if (!editingProductId) return;

        try {
            const token = localStorage.getItem('access_token');

            // 1. Fetch fresh, complete product details
            // We need this because the update endpoint expects a full payload or specific pointers,
            // and mixing partial state from the list view with the update might be causing issues.
            const res = await fetch(`${API_URL}/api/v1/admin/products/${editingProductId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch product details');

            const data = await res.json();
            const product = data.product;
            const existingImages = data.images || [];

            // 2. Prepare updated images list 
            // Put the selected image first (as primary), followed by other existing images
            // Filter out the selected image from existing ones to avoid duplicates
            const otherImageUrls = existingImages
                .map((img: any) => img.url)
                .filter((url: string) => url !== imageUrl);

            const updatedImages = [imageUrl, ...otherImageUrls];

            // 3. Send COMPLETE update via mutation
            // This mimics exactly how the Edit Product page works
            await updateProduct.mutateAsync({
                id: editingProductId,
                name: product.name,
                description: product.description || '',
                base_price: product.base_price,
                is_active: product.is_active,
                image_url: imageUrl,      // Set primary image URL
                images: updatedImages     // Set all images array
            });

            // Update local state to reflect change immediately
            setProducts(prev => prev.map(p =>
                p.id === editingProductId ? { ...p, image_url: imageUrl } : p
            ));

            toast.success('Product image updated');
            setEditingProductId(null);
        } catch (error: any) {
            console.error('Failed to update image:', error);
            toast.error(error?.message || 'Failed to update image');
        }
    };

    const handleOpenCategoryPopover = async (productId: string) => {
        setCategoryEditingProductId(productId);

        // Fetch current categories for this product if not cached
        if (!productCategoriesCache[productId]) {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`${API_URL}/api/v1/admin/products/${productId}/categories`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    const categoryIds = data.map((cat: any) => cat.id);
                    setProductCategoriesCache(prev => ({ ...prev, [productId]: categoryIds }));
                }
            } catch (error) {
                console.error('Failed to fetch product categories:', error);
            }
        }
    };

    const toggleProductCategory = (productId: string, categoryId: string) => {
        setProductCategoriesCache(prev => {
            const current = prev[productId] || [];
            const updated = current.includes(categoryId)
                ? current.filter(id => id !== categoryId)
                : [...current, categoryId];
            return { ...prev, [productId]: updated };
        });
    };

    const handleSaveCategories = async (productId: string) => {
        const categoryIds = productCategoriesCache[productId] || [];

        if (categoryIds.length === 0) {
            toast.error('Please select at least one category');
            return;
        }

        try {
            await setProductCategories.mutateAsync({
                productId,
                categoryIds,
            });
            toast.success('Categories updated');
            setCategoryEditingProductId(null);
        } catch (error) {
            toast.error('Failed to update categories');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                    <p className="text-neutral-500 mt-1">
                        Manage your product catalog
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <>
                            <Button variant="outline" onClick={() => setIsBulkCategoryDialogOpen(true)}>
                                <Tags className="h-4 w-4 mr-2" />
                                Assign Categories ({selectedIds.size})
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                            </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button asChild>
                        <Link href="/admin/products/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Products Table with Collapsible Variants */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={products.length > 0 && selectedIds.size === products.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Variants</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-500" />
                                </TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-neutral-500">
                                    No products found
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => {
                                const isExpanded = expandedProducts.has(product.id);
                                const variantCount = product.variants?.length || 0;

                                return (
                                    <>
                                        {/* Product Row */}
                                        <TableRow key={product.id} className="group">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(product.id)}
                                                    onCheckedChange={() => toggleSelectOne(product.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {variantCount > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => toggleExpand(product.id)}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRightIcon className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {product.image_url && (
                                                        <div
                                                            className="relative group cursor-pointer"
                                                            onClick={() => setEditingProductId(product.id)}
                                                            title="Click to change image"
                                                        >
                                                            {/* Thumbnail Image */}
                                                            <div className="h-10 w-10 rounded overflow-hidden bg-neutral-100 group-hover:ring-2 group-hover:ring-primary transition-all">
                                                                <Image
                                                                    src={product.image_url}
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="40px"
                                                                />
                                                            </div>

                                                            {/* Hover zoom preview */}
                                                            <div className="absolute left-12 top-0 z-[100] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none min-w-[500px]">
                                                                <div className="relative h-[500px] w-[500px] rounded-lg overflow-hidden shadow-2xl border-2 border-white bg-white">
                                                                    <Image
                                                                        src={product.image_url}
                                                                        alt={product.name}
                                                                        fill
                                                                        className="object-cover"
                                                                        sizes="500px"
                                                                        priority
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/admin/products/${product.id}`}
                                                            className="font-medium hover:text-blue-600 hover:underline"
                                                        >
                                                            {product.name}
                                                        </Link>

                                                        {/* Quick Category Assignment */}
                                                        <Popover
                                                            open={categoryEditingProductId === product.id}
                                                            onOpenChange={(open) => {
                                                                if (open) {
                                                                    handleOpenCategoryPopover(product.id);
                                                                } else {
                                                                    setCategoryEditingProductId(null);
                                                                }
                                                            }}
                                                        >
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Assign categories"
                                                                >
                                                                    <Tags className="h-3 w-3" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-64" align="start">
                                                                <div className="space-y-3">
                                                                    <div className="space-y-2">
                                                                        <h4 className="font-medium text-sm">Categories</h4>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Select categories for this product
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                                                                        {categories.map((cat) => (
                                                                            <div key={cat.id} className="flex items-center space-x-2">
                                                                                <Checkbox
                                                                                    id={`quick-cat-${product.id}-${cat.id}`}
                                                                                    checked={productCategoriesCache[product.id]?.includes(cat.id) || false}
                                                                                    onCheckedChange={() => toggleProductCategory(product.id, cat.id)}
                                                                                />
                                                                                <Label
                                                                                    htmlFor={`quick-cat-${product.id}-${cat.id}`}
                                                                                    className="text-sm cursor-pointer"
                                                                                >
                                                                                    {cat.name}
                                                                                </Label>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleSaveCategories(product.id)}
                                                                            className="flex-1"
                                                                        >
                                                                            Save
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => setCategoryEditingProductId(null)}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {parseInt(product.base_price).toLocaleString()} Birr
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{variantCount} variants</Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleAddVariant(product.id)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>

                                        {/* Variant Rows (Collapsible) */}
                                        {isExpanded && product.variants?.map((variant) => (
                                            <TableRow key={variant.id} className="bg-muted/30">
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                                <TableCell className="pl-12">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span className="font-mono text-xs">{variant.sku}</span>

                                                        {/* Editable Size */}
                                                        {editingCell?.variantId === variant.id && editingCell.field === 'size' ? (
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    type="text"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    className="h-6 w-16 text-xs"
                                                                    placeholder="Size"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') saveEdit(product.id);
                                                                        if (e.key === 'Escape') cancelEdit();
                                                                    }}
                                                                />
                                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(product.id)}>
                                                                    <Check className="h-3 w-3" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="cursor-pointer hover:bg-muted"
                                                                onClick={() => startEdit(variant.id, 'size', variant.size ?? null)}
                                                            >
                                                                {variant.size || 'Add Size'}
                                                            </Badge>
                                                        )}

                                                        {/* Editable Color */}
                                                        {editingCell?.variantId === variant.id && editingCell.field === 'color' ? (
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    type="text"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    className="h-6 w-20 text-xs"
                                                                    placeholder="Color"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') saveEdit(product.id);
                                                                        if (e.key === 'Escape') cancelEdit();
                                                                    }}
                                                                />
                                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(product.id)}>
                                                                    <Check className="h-3 w-3" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="cursor-pointer hover:bg-muted"
                                                                onClick={() => startEdit(variant.id, 'color', variant.color ?? null)}
                                                            >
                                                                {variant.color || 'Add Color'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {editingCell?.variantId === variant.id && editingCell.field === 'price' ? (
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="h-7 w-24"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveEdit(product.id);
                                                                    if (e.key === 'Escape') cancelEdit();
                                                                }}
                                                            />
                                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(product.id)}>
                                                                <Check className="h-3 w-3" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                                                            onClick={() => startEdit(variant.id, 'price', variant.price)}
                                                        >
                                                            <span className="text-sm">{variant.price.toLocaleString()} Birr</span>
                                                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {editingCell?.variantId === variant.id && editingCell.field === 'stock' ? (
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="h-7 w-20"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveEdit(product.id);
                                                                    if (e.key === 'Escape') cancelEdit();
                                                                }}
                                                            />
                                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(product.id)}>
                                                                <Check className="h-3 w-3" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                                                            onClick={() => startEdit(variant.id, 'stock', variant.stock_quantity)}
                                                        >
                                                            <Badge variant={variant.stock_quantity > 0 ? 'default' : 'destructive'}>
                                                                {variant.stock_quantity} in stock
                                                            </Badge>
                                                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleDeleteVariant(product.id, variant.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Bulk Category Assignment Dialog */}
            <Dialog open={isBulkCategoryDialogOpen} onOpenChange={setIsBulkCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Categories</DialogTitle>
                        <DialogDescription>
                            Select categories to assign to {selectedIds.size} selected product(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`bulk-cat-${cat.id}`}
                                    checked={selectedCategoryIds.includes(cat.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                                        } else {
                                            setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                                        }
                                    }}
                                />
                                <Label htmlFor={`bulk-cat-${cat.id}`} className="cursor-pointer">
                                    {cat.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkCategoryDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBulkCategoryAssign}>
                            Assign Categories
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">
                    Page {page} • {products.length} products
                </span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setPage(p => p - 1);
                            fetchProducts(page - 1, false);
                        }}
                        disabled={page === 1 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setPage(p => p + 1);
                            fetchProducts(page + 1, false);
                        }}
                        disabled={!hasMore || isLoading}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Media Picker Modal */}
            <MediaPicker
                isOpen={editingProductId !== null}
                onClose={() => setEditingProductId(null)}
                onSelect={handleImageSelect}
            />
        </div >
    );
}
