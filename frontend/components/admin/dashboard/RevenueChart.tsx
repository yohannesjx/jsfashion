"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface RevenueChartProps {
    data: any[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(64 64 64)" />
                <XAxis
                    dataKey="date"
                    stroke="rgb(163 163 163)"
                    tickFormatter={(value) => {
                        try {
                            return format(new Date(value + 'T00:00:00'), 'MMM dd');
                        } catch {
                            return value;
                        }
                    }}
                />
                <YAxis 
                    stroke="rgb(163 163 163)"
                    tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgb(23 23 23)',
                        border: '1px solid rgb(64 64 64)',
                        borderRadius: '8px'
                    }}
                    formatter={(value: any) => `$${parseFloat(value).toFixed(2)}`}
                    labelFormatter={(label: string) => {
                        try {
                            return format(new Date(label + 'T00:00:00'), 'MMM dd, yyyy');
                        } catch {
                            return label;
                        }
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="rgb(59 130 246)"
                    fill="rgba(59, 130, 246, 0.1)"
                    name="Revenue"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
