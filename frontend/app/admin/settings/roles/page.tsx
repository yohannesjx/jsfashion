"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const MOCK_ROLES = [
    { id: 1, name: "Super Admin", users: 2, permissions: ["all"] },
    { id: 2, name: "Store Manager", users: 5, permissions: ["products.manage", "orders.manage"] },
    { id: 3, name: "Support Agent", users: 12, permissions: ["orders.view", "customers.view"] },
];

export default function RolesPage() {
    const [roles, setRoles] = useState(MOCK_ROLES);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");

    const handleCreateRole = () => {
        if (!newRoleName) return;
        setRoles([...roles, {
            id: roles.length + 1,
            name: newRoleName,
            users: 0,
            permissions: []
        }]);
        setIsCreateOpen(false);
        setNewRoleName("");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage user roles and access permissions
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role
                </Button>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Role Name</TableHead>
                            <TableHead>Active Users</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                        {role.name}
                                    </div>
                                </TableCell>
                                <TableCell>{role.users} users</TableCell>
                                <TableCell>
                                    <div className="flex gap-2 flex-wrap">
                                        {role.permissions.includes("all") ? (
                                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20">Full Access</Badge>
                                        ) : (
                                            <>
                                                {role.permissions.slice(0, 3).map(p => (
                                                    <Badge key={p} variant="outline">{p}</Badge>
                                                ))}
                                                {role.permissions.length > 3 && (
                                                    <Badge variant="outline">+{role.permissions.length - 3}</Badge>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">Edit</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                        <DialogDescription>
                            Define a new role and assign permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Content Editor"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right mt-2">
                                Permissions
                            </Label>
                            <div className="col-span-3 space-y-2">
                                {["products.manage", "orders.manage", "customers.view", "settings.manage"].map((perm) => (
                                    <div key={perm} className="flex items-center space-x-2">
                                        <Checkbox id={perm} />
                                        <label
                                            htmlFor={perm}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {perm}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateRole}>Create Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
