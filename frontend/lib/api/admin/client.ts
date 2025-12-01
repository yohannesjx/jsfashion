const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
const API_BASE = `${API_URL}/api/v1/admin`;

export interface ApiError {
    error: string;
    message?: string;
}

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || response.statusText);
    }
    return response.json();
}

export const adminApi = {
    get: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            cache: 'no-store',
            headers: getAuthHeaders(),
        });
        return handleResponse<T>(response);
    },

    post: async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse<T>(response);
    },

    put: async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse<T>(response);
    },

    patch: async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse<T>(response);
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        return handleResponse<T>(response);
    },
};
