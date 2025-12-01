'use client';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();

    // Don't show sidebar/topbar on login page
    const isLoginPage = pathname === '/admin/login';

    return (
        <AuthProvider>
            {isLoginPage ? (
                // Login page - no sidebar/topbar
                children
            ) : (
                // Admin pages - with sidebar/topbar
                <div className="flex h-screen bg-neutral-50">
                    {/* Sidebar */}
                    <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Topbar */}
                        <AdminTopbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

                        {/* Page Content */}
                        <main className="flex-1 overflow-y-auto p-6">
                            {children}
                        </main>
                    </div>
                </div>
            )}
        </AuthProvider>
    );
}
