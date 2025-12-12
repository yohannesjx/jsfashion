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
                'bg-white m-4 rounded-3xl shadow-2xl transition-all duration-300 flex flex-col h-[calc(100vh-2rem)]',
                isOpen ? 'w-72' : 'w-24 items-center'
            )}
        >
            {/* Logo */}
            <div className={cn("h-20 flex items-center px-6", isOpen ? "justify-between" : "justify-center")}>
                {isOpen && (
                    <span className="text-xl font-extrabold tracking-tight text-neutral-900">
                        JsFashion
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className={cn("rounded-full hover:bg-neutral-100 text-neutral-500", !isOpen && "mt-2")}
                >
                    {isOpen ? (
                        <ChevronLeft className="h-5 w-5" />
                    ) : (
                        <ChevronRight className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4 px-3 w-full">
                <nav className="space-y-2">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-neutral-900 text-white shadow-md'
                                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                                    !isOpen && 'justify-center w-12 h-12 px-0 mx-auto'
                                )}
                                title={!isOpen ? item.title : undefined}
                            >
                                <Icon className={cn("flex-shrink-0 transition-transform", isOpen ? "h-5 w-5" : "h-6 w-6", isActive && !isOpen && "scale-110")} />
                                {isOpen && <span>{item.title}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* User Info */}
            {user && (
                <div className="p-4 mt-auto">
                    <div className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100",
                        !isOpen && "justify-center bg-transparent border-none p-0"
                    )}>
                        <div className="h-9 w-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold shadow-md">
                            {user.first_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        {isOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate leading-none mb-1">
                                    {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-neutral-500 truncate capitalize">
                                    {user.role}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}
