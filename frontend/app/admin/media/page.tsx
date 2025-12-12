"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Copy, Check, Search, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface MediaFile {
    url: string;
    filename: string;
    uploadedAt: Date;
    size?: number;
}

export default function MediaLibraryPage() {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

    // Get auth headers with token from localStorage
    const getAuthHeaders = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        return {
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    };

    // Fetch all uploaded images
    useEffect(() => {
        fetchMedia();
    }, []);

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
            // Upload files one by one
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
            fetchMedia(); // Refresh the list
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload files');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDelete = async (url: string) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const filename = url.split('/').pop();
            const response = await fetch(`${API_URL}/api/v1/admin/media/${filename}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (response.ok) {
                toast.success('Image deleted successfully');
                fetchMedia();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete image');
        }
    };

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        toast.success('URL copied to clipboard');
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    const filteredFiles = files.filter(file =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
                        <p className="text-neutral-500 mt-1">Manage your uploaded images</p>
                    </div>

                    <div className="flex gap-3">
                        <label htmlFor="file-upload">
                            <Button disabled={uploading} className="cursor-pointer" asChild>
                                <span>
                                    <Upload className="w-4 h-4 mr-2" />
                                    {uploading ? 'Uploading...' : 'Upload Images'}
                                </span>
                            </Button>
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            placeholder="Search images..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{files.length}</p>
                                <p className="text-sm text-neutral-500">Total Images</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
                                <Upload className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{filteredFiles.length}</p>
                                <p className="text-sm text-neutral-500">Filtered Results</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {(files.reduce((acc, f) => acc + (f.size || 0), 0) / 1024 / 1024).toFixed(1)} MB
                                </p>
                                <p className="text-sm text-neutral-500">Total Size</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Image Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-4 border-neutral-200 border-t-black rounded-full animate-spin"></div>
                        <p className="text-neutral-500 mt-4">Loading images...</p>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-12 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                        <ImageIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No images found</h3>
                        <p className="text-neutral-500 mb-4">
                            {searchQuery ? 'Try a different search term' : 'Upload your first image to get started'}
                        </p>
                        {!searchQuery && (
                            <label htmlFor="file-upload-empty">
                                <Button variant="outline" className="cursor-pointer" asChild>
                                    <span>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Images
                                    </span>
                                </Button>
                            </label>
                        )}
                        <input
                            id="file-upload-empty"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleUpload}
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.url}
                                className="group relative bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Image */}
                                <div className="aspect-square bg-neutral-100 relative">
                                    <img
                                        src={file.url}
                                        alt={file.filename}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Overlay on hover */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleCopyUrl(file.url)}
                                            className="bg-white hover:bg-neutral-100"
                                        >
                                            {copiedUrl === file.url ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDelete(file.url)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <p className="text-xs font-medium truncate" title={file.filename}>
                                        {file.filename}
                                    </p>
                                    {file.size && (
                                        <p className="text-xs text-neutral-500 mt-1">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
