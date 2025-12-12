'use client';

import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, RefreshCcw } from 'lucide-react';

interface OrderItem {
    id: number; // or string depending on backend
    product_name: string;
    variant_name: string;
    sku: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
}

interface RefundDialogProps {
    orderId: string;
    items: OrderItem[];
    currency?: string;
    onSuccess?: () => void;
}

export function RefundDialog({ orderId, items, currency = 'Birr', onSuccess }: RefundDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [restock, setRestock] = useState(true);

    // Track selected quantities: { [itemId]: quantity_to_refund }
    const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});

    const handleQuantityChange = (itemId: string, qty: number, max: number) => {
        if (qty < 0) qty = 0;
        if (qty > max) qty = max;

        setRefundQuantities(prev => {
            const next = { ...prev };
            if (qty === 0) {
                delete next[itemId];
            } else {
                next[itemId] = qty;
            }
            return next;
        });
    };

    const toggleItem = (itemId: string, max: number) => {
        setRefundQuantities(prev => {
            const next = { ...prev };
            if (next[itemId]) {
                delete next[itemId];
            } else {
                next[itemId] = max; // Default to full refund
            }
            return next;
        });
    };

    const totalRefundAmount = useMemo(() => {
        let total = 0;
        Object.entries(refundQuantities).forEach(([itemId, qty]) => {
            const item = items.find(i => String(i.id) === itemId);
            if (item) {
                const price = typeof item.unit_price === 'string'
                    ? parseFloat(item.unit_price.replace(/[^0-9.-]+/g, ''))
                    : Number(item.unit_price);
                total += price * qty;
            }
        });
        return total;
    }, [refundQuantities, items]);

    const handleRefund = async () => {
        if (Object.keys(refundQuantities).length === 0) {
            toast.error("Please select at least one item to refund");
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'; // Should use context or prop, but hardcoded for safety

            const payload = {
                order_id: orderId,
                amount: totalRefundAmount,
                reason: reason,
                restock: restock,
                items: Object.entries(refundQuantities).map(([id, qty]) => ({
                    order_item_id: id, // Ensure ID format matches backend expectations
                    quantity: qty
                }))
            };

            const response = await fetch(`${API_URL}/api/v1/admin/orders/${orderId}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success('Refund processed successfully');
                setOpen(false);
                setRefundQuantities({});
                setReason('');
                if (onSuccess) onSuccess();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Failed to process refund');
            }
        } catch (error) {
            toast.error('An error occurred during refund');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                    <RefreshCcw className="h-4 w-4" />
                    Refund Items
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Process Refund</DialogTitle>
                    <DialogDescription>
                        Select items to refund. This will create a refund record and optionally restock inventory.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Items Table */}
                    <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Select</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-center w-[100px]">Qty to Refund</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => {
                                    const itemId = String(item.id);
                                    const isSelected = !!refundQuantities[itemId];
                                    const quantity = refundQuantities[itemId] || 0;
                                    const price = typeof item.unit_price === 'string'
                                        ? parseFloat(item.unit_price.replace(/[^0-9.-]+/g, ''))
                                        : Number(item.unit_price);

                                    return (
                                        <TableRow key={itemId} className={isSelected ? "bg-muted/50" : ""}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleItem(itemId, item.quantity)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.product_name}</div>
                                                <div className="text-xs text-muted-foreground">{item.variant_name}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {price.toLocaleString()} {currency}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    value={isSelected ? quantity : ''}
                                                    disabled={!isSelected}
                                                    onChange={(e) => handleQuantityChange(itemId, parseInt(e.target.value) || 0, item.quantity)}
                                                    className="h-8 text-center"
                                                />
                                                <div className="text-[10px] text-muted-foreground text-center mt-1">
                                                    Max: {item.quantity}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {(price * quantity).toLocaleString()} {currency}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Reason for Refund</Label>
                            <Textarea
                                placeholder="Damaged, Returned, Mistake..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="resize-none"
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Items Selected:</span>
                                    <span className="font-medium">{Object.keys(refundQuantities).length}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>Total Refund:</span>
                                    <span className="text-primary">{totalRefundAmount.toLocaleString()} {currency}</span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 border p-3 rounded-md">
                                <Checkbox
                                    id="restock"
                                    checked={restock}
                                    onCheckedChange={(c) => setRestock(!!c)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="restock" className="cursor-pointer">
                                        Restock Items
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Return selected items to inventory count.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleRefund}
                        disabled={isLoading || totalRefundAmount <= 0}
                        variant="destructive"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Refund
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
