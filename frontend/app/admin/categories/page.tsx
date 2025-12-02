'use client';

import { useState, useEffect } from 'react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus, Loader2, FolderTree, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface Category {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    display_order: number;
    created_at: string;
}

function SortableRow({ category, onEdit, onDelete }: { category: Category; onEdit: (cat: Category) => void; onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
            <TableCell className="w-[50px]">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5 text-neutral-400" />
                </div>
            </TableCell>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell className="font-mono text-sm text-neutral-500">
                {category.slug}
            </TableCell>
            <TableCell>
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                </Badge>
            </TableCell>
            <TableCell className="text-neutral-500">
                {new Date(category.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(category.id)}
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        is_active: true,
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Sort by display_order
                const sorted = (data || []).sort((a: Category, b: Category) => a.display_order - b.display_order);
                setCategories(sorted);
            } else {
                toast.error('Failed to load categories');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = categories.findIndex((cat) => cat.id === active.id);
        const newIndex = categories.findIndex((cat) => cat.id === over.id);

        const newCategories = arrayMove(categories, oldIndex, newIndex);

        // Update display_order for all categories
        const updatedCategories = newCategories.map((cat, index) => ({
            ...cat,
            display_order: index,
        }));

        setCategories(updatedCategories);

        // Save new order to backend
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/categories/reorder`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    categories: updatedCategories.map(cat => ({
                        id: cat.id,
                        display_order: cat.display_order,
                    })),
                }),
            });

            if (!response.ok) {
                toast.error('Failed to save category order');
                fetchCategories(); // Revert on error
            } else {
                toast.success('Category order updated');
            }
        } catch (error) {
            console.error('Error saving category order:', error);
            toast.error('Failed to save category order');
            fetchCategories(); // Revert on error
        }
    };

    const handleOpenDialog = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                slug: category.slug,
                is_active: category.is_active,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                slug: '',
                is_active: true,
            });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            slug: '',
            is_active: true,
        });
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            slug: generateSlug(name),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Category name is required');
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const url = editingCategory
                ? `${API_URL}/api/v1/admin/categories/${editingCategory.id}`
                : `${API_URL}/api/v1/admin/categories`;

            const payload = {
                name: formData.name,
                slug: formData.slug,
                is_active: formData.is_active,
            };

            const response = await fetch(url, {
                method: editingCategory ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success(editingCategory ? 'Category updated' : 'Category created');
                handleCloseDialog();
                fetchCategories();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to save category');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error('Failed to save category');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok || response.status === 204) {
                toast.success('Category deleted');
                fetchCategories();
            } else {
                toast.error('Failed to delete category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Failed to delete category');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
                    <p className="text-neutral-500 mt-1">
                        Manage product categories - drag to reorder
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            </div>

            {/* Categories Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-500" />
                                </TableCell>
                            </TableRow>
                        ) : categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <FolderTree className="h-8 w-8 text-neutral-400" />
                                        <p className="text-neutral-500">No categories yet</p>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
                                            Create your first category
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={categories.map(cat => cat.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {categories.map((category) => (
                                        <SortableRow
                                            key={category.id}
                                            category={category}
                                            onEdit={handleOpenDialog}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Category' : 'Create Category'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? 'Update the category details below.'
                                : 'Add a new category to organize your products.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Category Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., New Arrivals, Accessories"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    placeholder="auto-generated"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-neutral-500">
                                    URL-friendly version of the name
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="is_active" className="cursor-pointer">
                                    Active
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingCategory ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
