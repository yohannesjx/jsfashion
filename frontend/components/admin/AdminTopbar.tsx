'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    Menu,
    Search,
    Bell,
    User,
    LogOut,
    Moon,
    Sun,
} from 'lucide-react';
import { useState } from 'react';

interface TopbarProps {
    onMenuClick: () => void;
}

export function AdminTopbar({ onMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
    const [darkMode, setDarkMode] = useState(false);
    const [unreadNotifications] = useState(3); // TODO: Connect to real notifications

    const handleLogout = async () => {
        await logout();
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        // TODO: Implement dark mode toggle
        document.documentElement.classList.toggle('dark');
    };

    return (
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
            {/* Left: Menu + Search */}
            <div className="flex items-center gap-4 flex-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="relative w-full max-w-md hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                        type="search"
                        placeholder="Search products, orders, customers..."
                        className="pl-10 bg-neutral-50 border-neutral-200"
                    />
                </div>
            </div>

            {/* Right: Notifications + Dark Mode + User Menu */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {unreadNotifications > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                >
                                    {unreadNotifications}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="p-4 text-sm text-neutral-500 text-center">
                            No new notifications
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Dark Mode Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDarkMode}
                >
                    {darkMode ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold text-sm">
                                {user?.first_name?.[0] || user?.email[0].toUpperCase()}
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium">
                                    {user?.first_name} {user?.last_name}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {user?.email}
                                </p>
                                <Badge variant="outline" className="w-fit text-xs capitalize">
                                    {user?.role.replace('_', ' ')}
                                </Badge>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
