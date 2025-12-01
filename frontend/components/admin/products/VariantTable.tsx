"use client";

import React, { useState, useEffect } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    RowData,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GripVertical, Trash2, Plus, Copy, Image as ImageIcon, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
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

// Define Variant Type
export type Variant = {
    id: string;
    image: string | null;
    name: string;
    sku: string;
    price: number;
    stock: number;
    selected?: boolean;
};

// Editable Cell Component
const EditableCell = ({
    getValue,
    row,
    column,
    table,
}: any) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);

    // When the input is blurred, we'll call our table meta's updateData function
    const onBlur = () => {
        table.options.meta?.updateData(row.index, column.id, value);
    };

    // If the initialValue is changed external, sync it up with our state
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    return (
        <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            className="w-full bg-transparent border-none focus:ring-0 p-2 h-full"
        />
    );
};

// Main Component
export function VariantTable({
    data,
    setData
}: {
    data: Variant[];
    setData: React.Dispatch<React.SetStateAction<Variant[]>>;
}) {
    const [rowSelection, setRowSelection] = useState({});
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
    const [bulkPrice, setBulkPrice] = useState("");
    const [bulkStock, setBulkStock] = useState("");

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
            enableSorting: false,
            enableHiding: false,
            size: 40,
        },
        {
            id: "drag",
            header: "",
            cell: ({ row }) => (
                <div className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-black">
                    <GripVertical className="w-4 h-4" />
                </div>
            ),
            size: 40,
        },
        {
            accessorKey: "image",
            header: "Image",
            cell: ({ row }) => (
                <div className="w-10 h-10 bg-neutral-100 rounded border border-neutral-200 flex items-center justify-center overflow-hidden group relative cursor-pointer">
                    {row.original.image ? (
                        <img src={row.original.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="w-4 h-4 text-neutral-400" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                        Edit
                    </div>
                </div>
            ),
            size: 60,
        },
        {
            accessorKey: "name",
            header: "Variant Name",
            cell: EditableCell,
        },
        {
            accessorKey: "sku",
            header: "SKU",
            cell: EditableCell,
        },
        {
            accessorKey: "price",
            header: "Price",
            cell: EditableCell,
        },
        {
            accessorKey: "stock",
            header: "Stock",
            cell: EditableCell,
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        const newData = [...data];
                        newData.splice(row.index, 1);
                        setData(newData);
                    }}
                    className="text-neutral-400 hover:text-red-600"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            ),
            size: 40,
        },
    ];

    const table = useReactTable({
        data,
        columns,
        state: {
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            updateData: (rowIndex: number, columnId: string, value: any) => {
                setData((old) =>
                    old.map((row, index) => {
                        if (index === rowIndex) {
                            return {
                                ...old[rowIndex]!,
                                [columnId]: value,
                            };
                        }
                        return row;
                    })
                );
            },
        },
    });

    const handleBulkUpdate = () => {
        const selectedIndices = Object.keys(rowSelection).map(Number);
        if (selectedIndices.length === 0) return;

        setData((old) =>
            old.map((row, index) => {
                if (selectedIndices.includes(index)) {
                    return {
                        ...row,
                        price: bulkPrice ? Number(bulkPrice) : row.price,
                        stock: bulkStock ? Number(bulkStock) : row.stock,
                    };
                }
                return row;
            })
        );

        setIsBulkEditDialogOpen(false);
        setBulkPrice("");
        setBulkStock("");
        setRowSelection({});
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Variants</h3>
                <div className="flex gap-2">
                    {Object.keys(rowSelection).length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setIsBulkEditDialogOpen(true)}>
                            <CheckSquare className="w-4 h-4 mr-2" />
                            Edit Selected ({Object.keys(rowSelection).length})
                        </Button>
                    )}
                    <Button size="sm" onClick={() => {
                        setData([...data, {
                            id: Math.random().toString(),
                            image: null,
                            name: "New Variant",
                            sku: "",
                            price: 0,
                            stock: 0
                        }])
                    }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variant
                    </Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-neutral-50">
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
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="p-0 h-12 border-r last:border-r-0 border-neutral-100 px-2">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="text-xs text-neutral-500">
                Tip: Click on any cell to edit. Changes are saved automatically.
            </div>

            <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Edit Variants</DialogTitle>
                        <DialogDescription>
                            Update price and stock for {Object.keys(rowSelection).length} selected variants.
                            Leave empty to keep existing values.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">
                                Price
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                value={bulkPrice}
                                onChange={(e) => setBulkPrice(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter new price"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stock" className="text-right">
                                Stock
                            </Label>
                            <Input
                                id="stock"
                                type="number"
                                value={bulkStock}
                                onChange={(e) => setBulkStock(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter new stock"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkUpdate}>Update Variants</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
