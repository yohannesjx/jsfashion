'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface AdminUser {
    id: number;
    email: string;
    first_name?: { String: string; Valid: boolean };
    last_name?: { String: string; Valid: boolean };
    role: string;
    is_active: { Bool: boolean; Valid: boolean };
    created_at: { Time: string; Valid: boolean };
}

export default function TeamPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'viewer'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data || []);
            } else {
                toast.error('Failed to fetch users');
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: newUser.email,
                    password: newUser.password,
                    first_name: newUser.first_name || null,
                    last_name: newUser.last_name || null,
                    role: newUser.role
                }),
            });

            if (response.ok) {
                toast.success('User invited successfully');
                setIsDialogOpen(false);
                setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'viewer' });
                fetchUsers();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to invite user');
            }
        } catch (error) {
            console.error('Failed to invite user:', error);
            toast.error('Failed to invite user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to remove this user?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== id));
                toast.success('User removed successfully');
            } else {
                toast.error('Failed to remove user');
            }
        } catch (error) {
            console.error('Failed to remove user:', error);
            toast.error('Failed to remove user');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="text-neutral-500 mt-1">
                        Manage admin users and their roles
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New User</DialogTitle>
                            <DialogDescription>
                                Add a new member to your team. They will receive an email with login details.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={newUser.first_name}
                                        onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={newUser.last_name}
                                        onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Temporary Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={newUser.role}
                                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send Invitation
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-500" />
                                </TableCell>
                            </TableRow>
                        ) : users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {user.first_name?.Valid ? `${user.first_name.String} ${user.last_name?.String || ''}` : 'Unknown'}
                                        </span>
                                        <span className="text-sm text-neutral-500">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {user.role.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.is_active?.Bool ? 'default' : 'secondary'}>
                                        {user.is_active?.Bool ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-neutral-500 text-sm">
                                    {user.created_at?.Valid ? new Date(user.created_at.Time).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeleteUser(user.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
