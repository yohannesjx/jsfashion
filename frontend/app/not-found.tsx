import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
            <h2 className="text-4xl font-black tracking-tighter">404</h2>
            <p className="text-xl font-medium">Page Not Found</p>
            <p className="text-neutral-500 max-w-md">
                The page you are looking for does not exist or has been moved.
            </p>
            <Button asChild className="bg-black text-white hover:bg-neutral-800 rounded-none px-8 mt-4">
                <Link href="/">Return Home</Link>
            </Button>
        </div>
    );
}
