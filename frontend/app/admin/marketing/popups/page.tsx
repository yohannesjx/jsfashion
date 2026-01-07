'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Megaphone, Calendar, CheckCircle2, XCircle, Image as ImageIcon, Link as LinkIcon, ShoppingBag } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useRouter } from 'next/navigation';

interface Popup {
    id: string;
    title: string;
    image_url: string;
    action_type: string;
    action_target: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    frequency: string;
}

export default function PopupsPage() {
    const router = useRouter();
    const [popups, setPopups] = useState<Popup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentPopup, setCurrentPopup] = useState<Partial<Popup>>({
        action_type: 'none',
        frequency: 'once_per_session',
        is_active: true
    });
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    // Fetch popups
    const fetchPopups = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/popups`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setPopups(data.popups || []);
            }
        } catch (err) {
            console.error('Failed to fetch popups', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPopups();
    }, []);

    // Handlers
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setError('Session expired');
                setUploading(false);
                return;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentPopup({ ...currentPopup, image_url: data.url });
            }
        } catch (err) {
            console.error('Upload failed', err);
            setError('Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!currentPopup.image_url) {
            setError('Please upload an image');
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setError('Session expired. Please log in again.');
                return;
            }

            const url = isEditMode
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/popups/${currentPopup.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/popups`;

            const method = isEditMode ? 'PUT' : 'POST';

            // Convert dates to proper ISO format or null
            const payload = {
                ...currentPopup,
                start_date: currentPopup.start_date ? new Date(currentPopup.start_date).toISOString() : null,
                end_date: currentPopup.end_date ? new Date(currentPopup.end_date).toISOString() : null,
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchPopups();
                setCurrentPopup({
                    action_type: 'none',
                    frequency: 'once_per_session',
                    is_active: true
                });
            } else {
                setError('Failed to save popup');
            }
        } catch (err) {
            setError('An error occurred');
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/popups/${id}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            fetchPopups();
        } catch (err) {
            console.error('Failed to toggle status', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;

        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/popups/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchPopups();
        } catch (err) {
            console.error('Failed to delete popup', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Marketing Popups</h1>
                            <p className="text-gray-500 mt-1">Manage in-app promotional popups and deals</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsEditMode(false);
                                setCurrentPopup({
                                    action_type: 'none',
                                    frequency: 'once_per_session',
                                    is_active: true
                                });
                                setIsModalOpen(true);
                            }}
                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Create Campaign
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">Loading...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {popups.map((popup) => (
                                <div
                                    key={popup.id}
                                    className={`bg-white rounded-xl overflow-hidden border transition-all ${popup.is_active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'}`}
                                >
                                    {/* Image Preview */}
                                    <div className="aspect-[4/5] bg-gray-100 relative group">
                                        <img
                                            src={popup.image_url}
                                            alt={popup.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setIsEditMode(true);
                                                    setCurrentPopup(popup);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 bg-white rounded-full hover:bg-gray-100"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(popup.id)}
                                                className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleActive(popup.id, popup.is_active);
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${popup.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {popup.is_active ? (
                                                    <><CheckCircle2 size={12} /> Active</>
                                                ) : (
                                                    <><XCircle size={12} /> Inactive</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 mb-1">{popup.title}</h3>
                                        <div className="space-y-2 text-sm text-gray-500">
                                            {/* Schedule Info */}
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {popup.start_date ? (
                                                    <span>
                                                        {new Date(popup.start_date).toLocaleDateString()}
                                                        {popup.end_date && ` - ${new Date(popup.end_date).toLocaleDateString()}`}
                                                    </span>
                                                ) : (
                                                    <span>Always Active</span>
                                                )}
                                            </div>

                                            {/* Action Info */}
                                            <div className="flex items-center gap-2">
                                                {popup.action_type === 'product' && <ShoppingBag size={14} />}
                                                {popup.action_type === 'link' && <LinkIcon size={14} />}
                                                {popup.action_type === 'none' && <ImageIcon size={14} />}
                                                <span className="capitalize">
                                                    {popup.action_type === 'none' ? 'View Only' : `${popup.action_type}: ${popup.action_target}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {popups.length === 0 && (
                                <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                                    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Megaphone className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No active campaigns</h3>
                                    <p className="text-gray-500 mt-1 mb-6">Create a popup campaign to engage your users</p>
                                    <button
                                        onClick={() => {
                                            setIsEditMode(false);
                                            setCurrentPopup({
                                                action_type: 'none',
                                                frequency: 'once_per_session',
                                                is_active: true
                                            });
                                            setIsModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                                    >
                                        <Plus size={20} />
                                        Create First Campaign
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl my-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">
                                {isEditMode ? 'Edit Campaign' : 'New Popup Campaign'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Image */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Popup Image</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl aspect-[4/5] flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden group">
                                        {currentPopup.image_url ? (
                                            <>
                                                <img
                                                    src={currentPopup.image_url}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-white font-medium">Click to change</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                                <p className="text-sm text-gray-500">Upload portrait image</p>
                                                <p className="text-xs text-gray-400 mt-1">Recommended: 800x1000px</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            disabled={uploading}
                                        />
                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Details */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={currentPopup.title || ''}
                                            onChange={e => setCurrentPopup({ ...currentPopup, title: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                            placeholder="e.g. Summer Sale Alert"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={currentPopup.start_date ? new Date(currentPopup.start_date).toISOString().slice(0, 16) : ''}
                                                onChange={e => setCurrentPopup({ ...currentPopup, start_date: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                            <input
                                                type="datetime-local"
                                                value={currentPopup.end_date ? new Date(currentPopup.end_date).toISOString().slice(0, 16) : ''}
                                                onChange={e => setCurrentPopup({ ...currentPopup, end_date: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">On Tap / Action</label>
                                        <div className="space-y-3">
                                            <select
                                                value={currentPopup.action_type || 'none'}
                                                onChange={e => setCurrentPopup({ ...currentPopup, action_type: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                            >
                                                <option value="none">Close / View Only</option>
                                                <option value="product">Open Product</option>
                                                <option value="category">Open Category</option>
                                                <option value="link">Open Web Link</option>
                                            </select>

                                            {currentPopup.action_type !== 'none' && (
                                                <input
                                                    type="text"
                                                    required
                                                    value={currentPopup.action_target || ''}
                                                    onChange={e => setCurrentPopup({ ...currentPopup, action_target: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                                    placeholder={
                                                        currentPopup.action_type === 'product' ? 'Product ID' :
                                                            currentPopup.action_type === 'category' ? 'Category ID' :
                                                                'https://example.com'
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Frequency</label>
                                        <select
                                            value={currentPopup.frequency || 'once_per_session'}
                                            onChange={e => setCurrentPopup({ ...currentPopup, frequency: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                        >
                                            <option value="once_per_session">Once per App Session</option>
                                            <option value="once_per_day">Once per Day</option>
                                            <option value="always">Always (Test)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPopup({ ...currentPopup, is_active: !currentPopup.is_active })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${currentPopup.is_active ? 'bg-black' : 'bg-gray-200'
                                                }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentPopup.is_active ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                        </button>
                                        <span className="text-sm font-medium text-gray-700">
                                            {currentPopup.is_active ? 'Active Campaign' : 'Draft / Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                                    disabled={uploading}
                                >
                                    {isEditMode ? 'Update Campaign' : 'Launch Campaign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
