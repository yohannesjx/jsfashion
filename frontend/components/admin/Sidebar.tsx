"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    BarChart3,
    Settings,
    Percent,
    ChevronLeft,
    Menu
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin" },
    { icon: ShoppingBag, label: "Orders", href: "/admin/orders" },
    { icon: Package, label: "Products", href: "/admin/products" },
    { icon: Users, label: "Customers", href: "/admin/customers" },
    { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
    { icon: Percent, label: "Discounts", href: "/admin/discounts" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "h-screen bg-card text-card-foreground transition-all duration-300 sticky top-0 flex flex-col border-r border-border",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                {!collapsed && (
                    <span className="text-xl font-bold tracking-tighter">JsFashion ADMIN</span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                    {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-2 space-y-1">
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            suppressHydrationWarning={true}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                collapsed && "justify-center px-0"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile (Bottom) */}
            <div className="p-4 border-t border-border">
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        AD
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Admin User</p>
                            <p className="text-xs text-muted-foreground truncate">admin@luxe.com</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
