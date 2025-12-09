"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Search, X, Check } from "lucide-react";
import { toast } from "sonner";

interface MediaFile {
    url: string;
    filename: string;
    uploadedAt: Date;
    size?: number;
}

interface MediaPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

export function MediaPicker({ isOpen, onClose, onSelect }: MediaPickerProps) {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

    const getAuthHeaders = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        return {
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    };

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
        }
    }, [isOpen]);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/v1/admin/media`, {
                headers: getAuthHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setFiles(data);
            }
        } catch (error) {
            console.error('Failed to fetch media:', error);
            toast.error('Failed to load media files');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        setUploading(true);

        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${API_URL}/api/v1/admin/upload`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload ${file.name}`);
                }
            }

            toast.success(`${fileList.length} file(s) uploaded successfully`);
            fetchMedia();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload files');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSelect = () => {
        if (selectedUrl) {
            onSelect(selectedUrl);
            onClose();
            setSelectedUrl(null);
        }
    };

    const filteredFiles = files.filter(file =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Image from Media Library</DialogTitle>
                </DialogHeader>

                {/* Search and Upload */}
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            placeholder="Search images..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <label htmlFor="media-picker-upload">
                        <Button disabled={uploading} className="cursor-pointer" asChild>
                            <span>
                                <Upload className="w-4 h-4 mr-2" />
                                {uploading ? 'Uploading...' : 'Upload'}
                            </span>
                        </Button>
                    </label>
                    <input
                        id="media-picker-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                    />
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 border-4 border-neutral-200 border-t-black rounded-full animate-spin"></div>
                            <p className="text-neutral-500 mt-4">Loading images...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="text-center py-12 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                            <p className="text-neutral-500">
                                {searchQuery ? 'No images found' : 'No images in library'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredFiles.map((file) => (
                                <div
                                    key={file.url}
                                    onClick={() => setSelectedUrl(file.url)}
                                    className={`relative aspect-square bg-neutral-100 rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${selectedUrl === file.url ? 'ring-2 ring-blue-600' : ''
                                        }`}
                                >
                                    <img
                                        src={file.url}
                                        alt={file.filename}
                                        className="w-full h-full object-cover"
                                    />
                                    {selectedUrl === file.url && (
                                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                                            <div className="bg-blue-600 rounded-full p-2">
                                                <Check className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-neutral-500">
                        {selectedUrl ? 'Image selected' : 'Click an image to select'}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSelect}
                            disabled={!selectedUrl}
                        >
                            Select Image
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
