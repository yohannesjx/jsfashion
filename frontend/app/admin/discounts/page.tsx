"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDiscounts, useDeleteDiscount } from "@/lib/api/admin/discounts";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useCreateDiscount } from "@/lib/api/admin/discounts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function DiscountsPage() {
    const { data: discounts = [], isLoading } = useDiscounts();
    const createDiscount = useCreateDiscount();
    const deleteDiscount = useDeleteDiscount();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage' as 'percentage' | 'fixed',
        value: '',
        minimum_amount: '',
        usage_limit: '',
        is_active: true,
    });

    const handleCreate = async () => {
        try {
            await createDiscount.mutateAsync({
                ...formData,
                minimum_amount: formData.minimum_amount || undefined,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : undefined,
            });
            toast.success('Discount created');
            setIsCreateOpen(false);
            setFormData({
                code: '',
                type: 'percentage',
                value: '',
                minimum_amount: '',
                usage_limit: '',
                is_active: true,
            });
        } catch (error) {
            toast.error('Failed to create discount');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Discounts</h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage discount codes
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Discount
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Discount</DialogTitle>
                            <DialogDescription>
                                Create a new discount code for your store
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Code</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="SUMMER2024"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v: 'percentage' | 'fixed') => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Value</Label>
                                <Input
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    placeholder={formData.type === 'percentage' ? '10' : '5.00'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Minimum Amount (optional)</Label>
                                <Input
                                    type="number"
                                    value={formData.minimum_amount}
                                    onChange={(e) => setFormData({ ...formData, minimum_amount: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Usage Limit (optional)</Label>
                                <Input
                                    type="number"
                                    value={formData.usage_limit}
                                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                                    placeholder="Unlimited"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={createDiscount.isPending}>
                                {createDiscount.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
                {isLoading ? (
                    <div className="p-8">
                        <Skeleton className="h-12 w-full mb-4" />
                        <Skeleton className="h-12 w-full mb-4" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : discounts.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-muted-foreground">No active discounts found.</p>
                        <p className="text-sm text-muted-foreground mt-2">Create your first discount code to get started</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {discounts.map((discount) => (
                                <TableRow key={discount.id}>
                                    <TableCell className="font-medium">{discount.code}</TableCell>
                                    <TableCell>{discount.type}</TableCell>
                                    <TableCell>
                                        {discount.type === 'percentage' 
                                            ? `${discount.value}%`
                                            : `$${parseFloat(discount.value).toFixed(2)}`}
                                    </TableCell>
                                    <TableCell>
                                        {discount.usage_limit 
                                            ? `${discount.usage_count || 0} / ${discount.usage_limit}`
                                            : `${discount.usage_count || 0}`}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={discount.is_active ? "default" : "secondary"}>
                                            {discount.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                                if (confirm('Are you sure you want to delete this discount?')) {
                                                    try {
                                                        await deleteDiscount.mutateAsync(discount.id);
                                                        toast.success('Discount deleted');
                                                    } catch (error) {
                                                        toast.error('Failed to delete discount');
                                                    }
                                                }
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
