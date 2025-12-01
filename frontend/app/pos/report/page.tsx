"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSalesData, useDashboardStats } from "@/lib/api/admin/dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, ShoppingCart } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const RevenueChart = dynamic(() => import("@/components/admin/dashboard/RevenueChart"), { ssr: false });

export default function POSReportPage() {
    const { data: salesData, isLoading: salesLoading } = useSalesData('month');
    const { data: stats, isLoading: statsLoading } = useDashboardStats();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/pos">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Sales Report</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue (Today)</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    ${parseFloat(stats?.revenue_today || '0').toFixed(2)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Orders (Today)</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    {stats?.orders_today || 0}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Sales performance over time</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {salesLoading ? (
                            <Skeleton className="h-[350px] w-full" />
                        ) : (
                            <RevenueChart data={salesData || []} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
