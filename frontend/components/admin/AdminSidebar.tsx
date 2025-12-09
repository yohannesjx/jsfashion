'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Tag,
    BarChart3,
    Settings,
    Warehouse,
    Bell,
    ChevronLeft,
    ChevronRight,
    FolderTree,
    Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles?: string[]; // If undefined, visible to all
}

const navItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
    },
    {
        title: 'Products',
        href: '/admin/products',
        icon: Package,
        roles: ['super_admin', 'admin', 'editor'],
    },
    {
        title: 'Categories',
        href: '/admin/categories',
        icon: FolderTree,
        roles: ['super_admin', 'admin', 'editor'],
    },
    {
        title: 'Media',
        href: '/admin/media',
        icon: Image,
        roles: ['super_admin', 'admin', 'editor'],
    },
    {
        title: 'Orders',
        href: '/admin/orders',
        icon: ShoppingCart,
    },
    {
        title: 'Customers',
        href: '/admin/customers',
        icon: Users,
    },
    {
        title: 'Coupons',
        href: '/admin/coupons',
        icon: Tag,
        roles: ['super_admin', 'admin'],
    },
    {
        title: 'Inventory',
        href: '/admin/inventory',
        icon: Warehouse,
        roles: ['super_admin', 'admin', 'editor'],
    },
    {
        title: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
    },
    {
        title: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
    },
    {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        roles: ['super_admin', 'admin'],
    },
];

export function AdminSidebar({ isOpen, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    // Filter nav items based on user role
    const visibleNavItems = navItems.filter(item => {
        if (!item.roles) return true; // Visible to all
        if (!user) return false;
        return item.roles.includes(user.role);
    });

    return (
        <aside
            className={cn(
                'bg-white border-r border-neutral-200 transition-all duration-300 flex flex-col',
                isOpen ? 'w-64' : 'w-20'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
                {isOpen && (
                    <Link href="/admin" className="text-xl font-bold tracking-tight">
                        JsFashion ADMIN
                    </Link>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="ml-auto"
                >
                    {isOpen ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4">
                <nav className="space-y-1 px-2">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-neutral-900 text-white'
                                        : 'text-neutral-700 hover:bg-neutral-100',
                                    !isOpen && 'justify-center'
                                )}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                {isOpen && <span>{item.title}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* User Info */}
            {isOpen && user && (
                <div className="p-4 border-t border-neutral-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold">
                            {user.first_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-neutral-500 truncate capitalize">
                                {user.role.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
