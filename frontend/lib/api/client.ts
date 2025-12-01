const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const API_BASE = `${API_URL}/api/v1`;

export interface ApiError {
    error: string;
    message?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || response.statusText);
    }
    return response.json();
}

export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return handleResponse<T>(response);
    },

    post: async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return handleResponse<T>(response);
    },
};
