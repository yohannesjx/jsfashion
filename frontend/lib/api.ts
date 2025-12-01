const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function fetchProduct(id: string) {
    const res = await fetch(`${API_URL}/api/v1/products/${id}`, {
        cache: 'no-store', // For now, ensure fresh data
    });
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch product');
    }
    return res.json();
}

export async function fetchProducts() {
    const res = await fetch(`${API_URL}/api/v1/products`, {
        cache: 'no-store',
    });
    if (!res.ok) {
        throw new Error('Failed to fetch products');
    }
    return res.json();
}

// API client for admin pages
export const api = {
    get: async (endpoint: string) => {
        const res = await fetch(`${API_URL}/api/v1${endpoint}`, {
            cache: 'no-store',
        });
        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }
        return { data: await res.json() };
    },
    post: async (endpoint: string, data: any) => {
        const res = await fetch(`${API_URL}/api/v1${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }
        return { data: await res.json() };
    },
    put: async (endpoint: string, data: any) => {
        const res = await fetch(`${API_URL}/api/v1${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }
        return { data: await res.json() };
    },
    delete: async (endpoint: string) => {
        const res = await fetch(`${API_URL}/api/v1${endpoint}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }
        return { data: await res.json() };
    },
};
