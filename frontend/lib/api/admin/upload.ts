import { adminApi } from './client';

export interface UploadResponse {
    url: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
}

export const uploadApi = {
    uploadFile: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/v1/admin/upload`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();
        // Return the URL as-is (relative URLs work better with Next.js Image Optimization)
        return data.url;
    },
};
