"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<string>("newest");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

    const getAuthHeaders = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        return {
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    };

    // Only fetch when modal opens
    useEffect(() => {
        if (isOpen && files.length === 0) {
            fetchMedia();
        }
    }, [isOpen]); // Remove files dependency to prevent infinite loop

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/v1/admin/media`, {
                headers: getAuthHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setFiles(data || []); // Ensure it's always an array
            } else {
                console.error('Failed to fetch media:', response.status);
                setFiles([]);
            }
        } catch (error) {
            console.error('Failed to fetch media:', error);
            setFiles([]);
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

    const handleDelete = async () => {
        if (selectedUrls.length === 0) return;

        if (!confirm(`Delete ${selectedUrls.length} image(s)?`)) return;

        setDeleting(true);
        try {
            let successCount = 0;
            for (const url of selectedUrls) {
                const filename = url.split('/').pop();
                if (!filename) continue;

                const response = await fetch(`${API_URL}/api/v1/admin/media/${filename}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                });

                if (response.ok) {
                    successCount++;
                }
            }

            toast.success(`${successCount} image(s) deleted successfully`);
            setSelectedUrls([]);
            fetchMedia();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete images');
        } finally {
            setDeleting(false);
        }
    };

    const toggleSelection = (url: string) => {
        setSelectedUrls(prev =>
            prev.includes(url)
                ? prev.filter(u => u !== url)
                : [...prev, url]
        );
    };

    const handleSelectAll = () => {
        if (selectedUrls.length === filteredFiles.length) {
            setSelectedUrls([]);
        } else {
            setSelectedUrls(filteredFiles.map(f => f.url));
        }
    };

    const handleAddSelected = () => {
        if (selectedUrls.length === 0) {
            toast.error('No images selected');
            return;
        }

        selectedUrls.forEach(url => onSelect(url));
        toast.success(`${selectedUrls.length} image(s) added`);
        setSelectedUrls([]);
        onClose();
    };

    // Helper function to get date category
    const getDateCategory = (date: Date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const thisWeek = new Date(today);
        thisWeek.setDate(thisWeek.getDate() - 7);
        const thisMonth = new Date(today);
        thisMonth.setDate(thisMonth.getDate() - 30);

        const uploadDate = new Date(date);

        if (uploadDate >= today) return 'today';
        if (uploadDate >= yesterday) return 'yesterday';
        if (uploadDate >= thisWeek) return 'thisWeek';
        if (uploadDate >= thisMonth) return 'thisMonth';
        return 'older';
    };

    // Filter and sort files
    const getFilteredAndSortedFiles = () => {
        let filtered = files.filter(file =>
            file.filename.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Apply date filter
        if (sortBy !== 'newest' && sortBy !== 'oldest' && sortBy !== 'nameAZ' && sortBy !== 'nameZA') {
            filtered = filtered.filter(file => {
                const category = getDateCategory(new Date(file.uploadedAt));
                return category === sortBy;
            });
        }

        // Sort
        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
                case 'nameAZ':
                    return a.filename.localeCompare(b.filename);
                case 'nameZA':
                    return b.filename.localeCompare(a.filename);
                case 'newest':
                default:
                    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
            }
        });

        return sorted;
    };

    const filteredFiles = getFilteredAndSortedFiles();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Images from Media Library</DialogTitle>
                </DialogHeader>

                {/* Search and Actions */}
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

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="thisWeek">This Week</SelectItem>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                            <SelectItem value="older">Older</SelectItem>
                            <SelectItem value="nameAZ">Name A-Z</SelectItem>
                            <SelectItem value="nameZA">Name Z-A</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        onClick={handleSelectAll}
                        disabled={loading || filteredFiles.length === 0}
                    >
                        {selectedUrls.length === filteredFiles.length && filteredFiles.length > 0
                            ? 'Deselect All'
                            : 'Select All'}
                    </Button>

                    {selectedUrls.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Delete ({selectedUrls.length})
                        </Button>
                    )}

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
                            {filteredFiles.map((file) => {
                                const isSelected = selectedUrls.includes(file.url);
                                return (
                                    <div
                                        key={file.url}
                                        onClick={() => toggleSelection(file.url)}
                                        className={`relative aspect-square bg-neutral-100 rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${isSelected ? 'ring-2 ring-blue-600' : ''
                                            }`}
                                    >
                                        <img
                                            src={file.url}
                                            alt={file.filename}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className={`absolute top-2 right-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'bg-white border-neutral-300'
                                            }`}>
                                            {isSelected && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-neutral-500">
                        {selectedUrls.length > 0
                            ? `${selectedUrls.length} image(s) selected`
                            : 'Click images to select'}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddSelected}
                            disabled={selectedUrls.length === 0}
                        >
                            Add Selected ({selectedUrls.length})
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
