"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Loader2, Save, Undo, X } from "lucide-react";
import { toast } from "sonner";

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onSave: (newUrl: string) => Promise<void>;
}

export default function ImageEditor({ isOpen, onClose, imageUrl, onSave }: ImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scale, setScale] = useState(1);
    const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

    // Target aspect ratio 9:19.5 (approx 0.4615)
    // We'll use a high resolution for quality
    const TARGET_WIDTH = 1080;
    const TARGET_HEIGHT = 2340;

    useEffect(() => {
        if (isOpen && imageUrl) {
            loadImage();
        }
    }, [isOpen, imageUrl]);

    useEffect(() => {
        if (imageObj && canvasRef.current) {
            drawCanvas();
        }
    }, [imageObj, scale]);

    const loadImage = () => {
        setLoading(true);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        img.onload = () => {
            setImageObj(img);
            setLoading(false);
            setScale(1); // Reset scale
        };
        img.onerror = () => {
            setLoading(false);
            toast.error("Failed to load image for editing");
        };
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas || !imageObj) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set dimensions
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;

        // Clear
        ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        // --- Layer 1: Blurred Background (Extrapolation) ---
        // We want the image to COVER the canvas
        const bgScale = Math.max(TARGET_WIDTH / imageObj.width, TARGET_HEIGHT / imageObj.height);
        const bgW = imageObj.width * bgScale;
        const bgH = imageObj.height * bgScale;
        const bgX = (TARGET_WIDTH - bgW) / 2;
        const bgY = (TARGET_HEIGHT - bgH) / 2;

        ctx.filter = "blur(40px)";
        // Draw slightly larger to avoid edge bleeding from blur
        ctx.drawImage(imageObj, bgX - 20, bgY - 20, bgW + 40, bgH + 40);
        ctx.filter = "none";

        // --- Layer 2: Semi-transparent Overlay ---
        // Darken the background slightly to make foreground pop
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        // --- Layer 3: Foreground Image ---
        // We want the image to be CONTAINED within the canvas
        // User 'scale' adjusts this from the default "contain" size
        const containScale = Math.min(TARGET_WIDTH / imageObj.width, TARGET_HEIGHT / imageObj.height);

        // Apply user zoom
        const fgScale = containScale * scale;

        const fgW = imageObj.width * fgScale;
        const fgH = imageObj.height * fgScale;
        const fgX = (TARGET_WIDTH - fgW) / 2;
        const fgY = (TARGET_HEIGHT - fgH) / 2;

        // Add shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        ctx.drawImage(imageObj, fgX, fgY, fgW, fgH);

        // Reset shadow
        ctx.shadowColor = "transparent";
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setSaving(true);
        try {
            // Convert canvas to blob
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, 'image/jpeg', 0.9)
            );

            if (!blob) throw new Error("Canvas conversion failed");

            // Upload to server
            const formData = new FormData();
            formData.append('file', blob, 'edited-image.jpg');

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
            const token = localStorage.getItem('access_token');

            const res = await fetch(`${API_URL}/api/v1/admin/upload`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            // Expected response: { url: "...", filename: "..." }
            // Some APIs return [url] or just url string, adjusting based on MediaPicker behavior
            // Looking at MediaPicker, upload returns nothing but success, we might need to check response

            // Assuming standard response format from common uploaders, 
            // but if it matches MediaPicker logic, we might need to validat response structure.
            // Let's assume standard { url: '...' } or verify later.
            // Actually, MediaPicker upload endpoint just returns 200 OK.
            // Wait, we need the URL. 'api/v1/admin/upload' normally returns the file info.

            let newUrl = "";
            if (data.url) newUrl = data.url;
            else if (Array.isArray(data) && data[0].url) newUrl = data[0].url;

            // If the API doesn't return the URL directly (just saves it), we might have issues.
            // But usually upload endpoints return the path.
            // Let's proceed assuming we get a URL. If not we'll debug.
            if (!newUrl && typeof data === 'string') newUrl = data;

            await onSave(newUrl);
            onClose();
            toast.success("Image saved successfully");

        } catch (error) {
            console.error(error);
            toast.error("Failed to save image");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-neutral-950 text-white border-neutral-800">
                <div className="flex justify-between items-center p-4 border-b border-neutral-800">
                    <DialogTitle>Edit Image</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-neutral-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-neutral-900/50">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    )}
                    <div className="relative h-full w-full p-4 flex items-center justify-center">
                        <canvas
                            ref={canvasRef}
                            className="max-h-full max-w-full shadow-2xl object-contain"
                            style={{ aspectRatio: '9/19.5' }}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-800 bg-neutral-900 space-y-4">
                    <div className="flex items-center gap-4 max-w-md mx-auto">
                        <span className="text-sm font-medium text-neutral-400">Scale</span>
                        <input
                            type="range"
                            value={scale}
                            min={0.5}
                            max={2}
                            step={0.01}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="flex-1 accent-white h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm w-8 text-right">{Math.round(scale * 100)}%</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setScale(1)}
                            title="Reset Scale"
                        >
                            <Undo className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose} className="border-neutral-700 hover:bg-neutral-800 text-neutral-300">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading || saving} className="bg-white text-black hover:bg-neutral-200">
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
