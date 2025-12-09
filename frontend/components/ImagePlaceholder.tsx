export default function ImagePlaceholder({ className = "" }: { className?: string }) {
    return (
        <div className={`relative bg-neutral-100 overflow-hidden ${className}`}>
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100 animate-shimmer"
                style={{ backgroundSize: '200% 100%' }} />

            {/* JsFashion Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-neutral-300">
                        JsFashion
                    </h2>
                </div>
            </div>
        </div>
    );
}
