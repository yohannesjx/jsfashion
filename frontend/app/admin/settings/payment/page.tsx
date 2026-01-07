import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Move, Banknote, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaymentAccount {
    id: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    account_type: string;
    is_active: boolean;
    display_order: number;
}

export default function PaymentAccountsPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentAccount, setCurrentAccount] = useState<Partial<PaymentAccount>>({});
    const [error, setError] = useState('');

    // Fetch accounts
    const fetchAccounts = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/payment-accounts`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAccounts(data.accounts || []);
            }
        } catch (err) {
            console.error('Failed to fetch accounts', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Handlers
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const url = isEditMode
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/payment-accounts/${currentAccount.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/payment-accounts`;

            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...currentAccount,
                    display_order: Number(currentAccount.display_order || 0)
                })
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchAccounts();
                setCurrentAccount({});
            } else {
                setError('Failed to save account');
            }
        } catch (err) {
            setError('An error occurred');
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/payment-accounts/${id}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            fetchAccounts();
        } catch (err) {
            console.error('Failed to toggle status', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this account?')) return;

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/payment-accounts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchAccounts();
        } catch (err) {
            console.error('Failed to delete account', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Payment Accounts</h1>
                            <p className="text-gray-500 mt-1">Manage bank accounts for customer payments</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsEditMode(false);
                                setCurrentAccount({ display_order: accounts.length + 1 });
                                setIsModalOpen(true);
                            }}
                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add Account
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">Loading...</div>
                    ) : (
                        <div className="space-y-4">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={`bg-white rounded-xl p-6 border transition-all ${account.is_active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg h-fit">
                                                <Banknote size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-900">
                                                    {account.bank_name}
                                                    {!account.is_active && (
                                                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Inactive</span>
                                                    )}
                                                </h3>
                                                <div className="flex gap-6 mt-2 text-sm text-gray-600">
                                                    <div>
                                                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-0.5">Account Name</span>
                                                        {account.account_name}
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-0.5">Account Number</span>
                                                        <span className="font-mono">{account.account_number}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-0.5">Type</span>
                                                        {account.account_type || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleActive(account.id, account.is_active)}
                                                className={`p-2 rounded-lg transition-colors ${account.is_active
                                                    ? 'text-green-600 hover:bg-green-50'
                                                    : 'text-gray-400 hover:bg-gray-100'
                                                    }`}
                                                title={account.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {account.is_active ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditMode(true);
                                                    setCurrentAccount(account);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(account.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {accounts.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                                    No payment accounts found. Add one to get started.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-6">
                            {isEditMode ? 'Edit Account' : 'New Payment Account'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    required
                                    value={currentAccount.bank_name || ''}
                                    onChange={e => setCurrentAccount({ ...currentAccount, bank_name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                    placeholder="e.g. CBE, Telebirr"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                                <input
                                    type="text"
                                    required
                                    value={currentAccount.account_name || ''}
                                    onChange={e => setCurrentAccount({ ...currentAccount, account_name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                    placeholder="e.g. Js Fashion"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    required
                                    value={currentAccount.account_number || ''}
                                    onChange={e => setCurrentAccount({ ...currentAccount, account_number: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                    placeholder="e.g. 1000..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type (Optional)</label>
                                    <input
                                        type="text"
                                        value={currentAccount.account_type || ''}
                                        onChange={e => setCurrentAccount({ ...currentAccount, account_type: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                        placeholder="e.g. CBE, Telebirr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        value={currentAccount.display_order || 0}
                                        onChange={e => setCurrentAccount({ ...currentAccount, display_order: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                                >
                                    {isEditMode ? 'Update' : 'Create'} Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
