"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
            <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
            <p className="text-neutral-500 max-w-md">
                We apologize for the inconvenience. Please try again later.
            </p>
            <Button
                onClick={() => reset()}
                className="bg-black text-white hover:bg-neutral-800 rounded-none px-8"
            >
                Try again
            </Button>
        </div>
    );
}
