import React, { useState, useEffect, useMemo } from 'react';
import { getPayments } from '../services/gameForgeService';
import type { GameForgePayment, PaymentType } from '../types/gameForge';
import { Loader2, DollarSign } from 'lucide-react';

const formatCurrency = (amount: number, currency: string): string =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(amount / 100); // assume cents

const formatDate = (ts: { seconds: number } | null | undefined): string => {
    if (!ts || typeof ts.seconds !== 'number') return '--';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const typeLabel: Record<PaymentType, { text: string; color: string }> = {
    subscription: { text: 'Subscription', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    iap: { text: 'In-App Purchase', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    credit: { text: 'Credit', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
};

const GameForgePayments: React.FC = () => {
    const [payments, setPayments] = useState<GameForgePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<PaymentType | 'all'>('all');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setLoading(true);
        setError(null);
        getPayments()
            .then((data) => setPayments(data as unknown as GameForgePayment[]))
            .catch((err) => setError(err?.message || 'Failed to load payments.'))
            .finally(() => setLoading(false));
    }, []);

    // Total revenue
    const totalRevenue = useMemo(
        () => payments.reduce((sum, p) => sum + p.amount, 0),
        [payments],
    );

    // Primary currency (most common)
    const primaryCurrency = useMemo(() => {
        if (payments.length === 0) return 'usd';
        const counts: Record<string, number> = {};
        for (const p of payments) {
            counts[p.currency] = (counts[p.currency] || 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }, [payments]);

    // Filtered & sorted (newest first -- service already sorts desc)
    const filtered = useMemo(
        () => payments.filter((p) => typeFilter === 'all' || p.type === typeFilter),
        [payments, typeFilter],
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                <span>Loading payments...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Payments</h1>
                    <p className="text-slate-400 text-sm mt-1">Transaction history and revenue</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    <div>
                        <p className="text-slate-400 text-xs">Total Revenue</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(totalRevenue, primaryCurrency)}</p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as PaymentType | 'all')}
                    className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                    <option value="all">All Types</option>
                    <option value="subscription">Subscription</option>
                    <option value="iap">In-App Purchase</option>
                    <option value="credit">Credit</option>
                </select>
            </div>

            {/* Payment table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-5 py-3">Player ID</th>
                                <th className="px-5 py-3">Amount</th>
                                <th className="px-5 py-3">Currency</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Stripe Payment ID</th>
                                <th className="px-5 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                                        No payments found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((pmt) => {
                                    const tl = typeLabel[pmt.type] ?? typeLabel.subscription;
                                    return (
                                        <tr key={pmt.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3 text-white font-medium truncate max-w-[180px]">{pmt.playerId}</td>
                                            <td className="px-5 py-3 text-white font-semibold">{formatCurrency(pmt.amount, pmt.currency)}</td>
                                            <td className="px-5 py-3 text-slate-400 uppercase">{pmt.currency}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tl.color}`}>
                                                    {tl.text}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-slate-500 font-mono text-xs truncate max-w-[200px]">{pmt.stripePaymentId}</td>
                                            <td className="px-5 py-3 text-slate-300">{formatDate(pmt.createdAt as unknown as { seconds: number })}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GameForgePayments;
