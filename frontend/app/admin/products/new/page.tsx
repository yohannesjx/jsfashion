'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCategories, useSetProductCategories } from '@/lib/api/admin/categories';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

// Helper function to generate slug from text
const generateSlug = (text: string): string => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
};

export default function NewProductPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        base_price: '',
        is_active: true,
    });
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

    const { data: categories = [] } = useCategories();
    const setProductCategories = useSetProductCategories();

    // Auto-generate slug from title
    useEffect(() => {
        if (!isSlugManuallyEdited && formData.title) {
            setFormData(prev => ({
                ...prev,
                slug: generateSlug(formData.title)
            }));
        }
    }, [formData.title, isSlugManuallyEdited]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate categories
        if (selectedCategoryIds.length === 0) {
            toast.error('Please select at least one category');
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('access_token');

            // Send price as is (no cents)
            const price = Math.round(parseFloat(formData.base_price)).toString();

            // 1. Create Product
            const response = await fetch(`${API_URL}/api/v1/admin/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: formData.title, // Backend expects 'name'
                    slug: formData.slug || generateSlug(formData.title), // Ensure slug is sent
                    description: formData.description || null,
                    base_price: price, // Backend expects string
                    is_active: formData.is_active,
                }),
            });

            if (response.ok) {
                const data = await response.json();

                // 2. Assign Categories
                try {
                    await setProductCategories.mutateAsync({
                        productId: data.id,
                        categoryIds: selectedCategoryIds,
                    });

                    toast.success('Product created with categories! Now add variants and images.');
                    // Redirect to the product detail page to add variants
                    router.push(`/admin/products/${data.id}`);
                } catch (catError) {
                    console.error('Failed to assign categories:', catError);
                    toast.warning('Product created but failed to assign categories. Please edit the product.');
                    router.push(`/admin/products/${data.id}`);
                }
            } else {
                const error = await response.json();
                console.error('Create error:', error);
                toast.error(error.error || 'Failed to create product');
            }
        } catch (error) {
            console.error('Failed to create product:', error);
            toast.error('Failed to create product');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/products">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">New Product</h1>
                    <p className="text-neutral-500 mt-1">
                        Create a new product
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Product Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Product Name *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">URL Slug *</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => {
                                        setIsSlugManuallyEdited(true);
                                        setFormData({ ...formData, slug: generateSlug(e.target.value) });
                                    }}
                                    placeholder="product-url-slug"
                                    required
                                />
                                <p className="text-xs text-neutral-500">
                                    This will be used in the product URL. Auto-generated from product name.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Price (Birr) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <Label htmlFor="active">Active</Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Categories */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Categories *</CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                <p className="text-xs text-neutral-500 mt-2">
                                    Product MUST belong to at least one category to appear in the shop.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex gap-2 pt-6">
                    <Button type="submit" disabled={isLoading || selectedCategoryIds.length === 0}>
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Product'
                        )}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href="/admin/products">
                            Cancel
                        </Link>
                    </Button>
                </div>
            </form>
        </div>
    );
}
