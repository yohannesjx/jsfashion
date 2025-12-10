"use client";

import { useState, useEffect, useRef } from "react";
import { useProduct, useUpdateProduct, productKeys } from "@/lib/api/admin/products";
import { useCategories, useProductCategories, useSetProductCategories } from "@/lib/api/admin/categories";
import { VariantTableEnhanced } from "@/components/admin/products/VariantTableEnhanced";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { uploadApi } from "@/lib/api/admin/upload";
import { useQueryClient } from "@tanstack/react-query";

export default function EditProductPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: productData, isLoading, error, refetch } = useProduct(params.id);
    const updateProduct = useUpdateProduct();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [basePrice, setBasePrice] = useState("");
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [status, setStatus] = useState<"active" | "draft">("active");
    const [images, setImages] = useState<string[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number }[]>([]);
    const productImageInputRef = useRef<HTMLInputElement>(null);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    const { data: categories = [] } = useCategories();
    const { data: productCategories = [] } = useProductCategories(params.id);
    const setProductCategories = useSetProductCategories();

    // Initialize form when data loads
    useEffect(() => {
        if (productData) {
            setName(productData.product.name);
            setDescription(productData.product.description || "");
            setBasePrice(productData.product.base_price);
            setStatus(productData.product.is_active ? "active" : "draft");
            if (productData.images && productData.images.length > 0) {
                setImages(productData.images.map((img: any) => img.url));
            } else if (productData.product.image_url) {
                setImages([productData.product.image_url]);
            }
        }
    }, [productData]);

    // Update selected categories when product categories load
    useEffect(() => {
        if (productCategories && productCategories.length > 0) {
            setSelectedCategoryIds(productCategories.map(c => c.id));
        }
    }, [productCategories]);

    const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setIsUploadingImage(true);
            const fileArray = Array.from(files);

            // Initialize progress for all files
            setUploadProgress(fileArray.map(f => ({ fileName: f.name, progress: 0 })));

            toast.info(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}...`);

            const newUrls: string[] = [];
            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];

                // Update progress for current file
                setUploadProgress(prev =>
                    prev.map((p, idx) =>
                        idx === i ? { ...p, progress: 50 } : p
                    )
                );

                const url = await uploadApi.uploadFile(file);
                newUrls.push(url);

                // Mark as complete
                setUploadProgress(prev =>
                    prev.map((p, idx) =>
                        idx === i ? { ...p, progress: 100 } : p
                    )
                );
            }

            setImages(prev => [...prev, ...newUrls]);
            toast.success(`${newUrls.length} image${newUrls.length > 1 ? 's' : ''} uploaded successfully`);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload images');
        } finally {
            setIsUploadingImage(false);
            setUploadProgress([]);
            if (productImageInputRef.current) {
                productImageInputRef.current.value = '';
            }
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (updateProduct.isPending || setProductCategories.isPending) {
            return; // Prevent double-click
        }

        // Validate categories
        if (selectedCategoryIds.length === 0) {
            toast.error('Please select at least one category to save the product.');
            return;
        }

        try {
            console.log('Saving product...', { name, description, basePrice, status, selectedCategoryIds, images });

            await updateProduct.mutateAsync({
                id: params.id,
                name,
                description,
                base_price: basePrice,
                is_active: status === "active",
                image_url: images[0] || undefined,
                images: images,
            });

            // Update product categories
            await setProductCategories.mutateAsync({
                productId: params.id,
                categoryIds: selectedCategoryIds,
            });

            toast.success('Product updated successfully');
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error?.message || 'Failed to update product');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-3 gap-8">
                    <div className="col-span-2 space-y-6">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !productData) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Product not found</p>
                    <Button variant="outline" className="mt-4" asChild>
                        <Link href="/admin/products">Back to Products</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/products">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
                        <p className="text-sm text-muted-foreground">ID: {params.id}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.back()}>Discard</Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateProduct.isPending || setProductCategories.isPending}
                    >
                        {(updateProduct.isPending || setProductCategories.isPending) ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="col-span-2 space-y-8">
                    {/* Basic Info */}
                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
                        <h2 className="font-semibold text-lg">Basic Information</h2>
                        <div className="space-y-2">
                            <Label>Product Title</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter product name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                className="min-h-[150px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter product description"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Price</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={basePrice}
                                    onChange={(e) => setBasePrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Media */}
                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
                        <h2 className="font-semibold text-lg">Media</h2>
                        <div className="grid grid-cols-4 gap-4">
                            {images.map((url, index) => (
                                <div key={index} className="aspect-square bg-muted rounded-lg border border-border flex items-center justify-center relative group cursor-pointer overflow-hidden">
                                    <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => removeImage(index)}
                                            className="h-8 w-8"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div
                                className="aspect-square bg-muted/50 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted hover:border-primary/50 transition-all cursor-pointer"
                                onClick={() => setShowMediaPicker(true)}
                            >
                                <ImageIcon className="h-6 w-6 mb-2" />
                                <span className="text-xs font-medium">Select from Media</span>
                            </div>
                        </div>

                        {/* Upload Progress */}
                        {uploadProgress.length > 0 && (
                            <div className="space-y-2 mt-4">
                                <p className="text-sm font-medium text-muted-foreground">Uploading...</p>
                                {uploadProgress.map((file, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span className="truncate max-w-[200px]">{file.fileName}</span>
                                            <span>{file.progress}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-primary h-full transition-all duration-300 ease-out"
                                                style={{ width: `${file.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Variants - The Star of the Show */}
                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                        <VariantTableEnhanced
                            productId={params.id}
                            variants={productData.variants || []}
                            basePrice={parseFloat(basePrice || '0')}
                            productImageUrl={productData.product.image_url || (productData.images && productData.images[0]?.url) || null}
                            onVariantsChange={() => {
                                // Refetch product data without reloading the page
                                refetch();
                            }}
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
                        <h2 className="font-semibold text-lg">Organization</h2>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v: "active" | "draft") => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Categories */}
                        <div className="space-y-2 pt-2 border-t">
                            <Label>Categories *</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                                {categories.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No categories available</div>
                                ) : (
                                    categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`cat-${cat.id}`}
                                                checked={selectedCategoryIds.includes(cat.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                                                    } else {
                                                        setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`cat-${cat.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {cat.name}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-neutral-500">
                                Product MUST belong to at least one category to appear in the shop.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Picker Modal */}
            <MediaPicker
                isOpen={showMediaPicker}
                onClose={() => setShowMediaPicker(false)}
                onSelect={(url) => {
                    setImages(prev => [...prev, url]);
                    toast.success('Image added successfully');
                }}
            />
        </div>
    );
}
