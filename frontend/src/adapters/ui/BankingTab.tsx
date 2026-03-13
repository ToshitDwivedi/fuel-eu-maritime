import { useState } from 'react';
import type { ComplianceBalance, BankEntry, BankResult } from '@core/domain';
import { ApiClient } from '@adapters/infrastructure/ApiClient';

const api = new ApiClient();

export function BankingTab() {
  // Input fields
  const [shipId, setShipId] = useState('');
  const [year, setYear] = useState<number | ''>('');

  // Data state
  const [cb, setCb] = useState<ComplianceBalance | null>(null);
  const [bankRecords, setBankRecords] = useState<BankEntry[]>([]);
  const [bankResult, setBankResult] = useState<BankResult | null>(null);

  // Action inputs
  const [bankAmount, setBankAmount] = useState<number | ''>('');
  const [applyAmount, setApplyAmount] = useState<number | ''>('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoadData = async () => {
    if (!shipId.trim() || !year) return;
    setLoading(true);
    setError(null);
    setBankResult(null);
    try {
      const [cbData, records] = await Promise.all([
        api.getCB(shipId.trim(), year),
        api.getBankRecords(shipId.trim(), year),
      ]);
      setCb(cbData);
      setBankRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setCb(null);
      setBankRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBankSurplus = async () => {
    if (!shipId.trim() || !year || !bankAmount) return;
    setActionLoading('bank');
    setError(null);
    try {
      await api.bankSurplus(shipId.trim(), year, bankAmount);
      setBankAmount('');
      // Refresh data to show updated records
      const records = await api.getBankRecords(shipId.trim(), year);
      setBankRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bank surplus');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyBanked = async () => {
    if (!shipId.trim() || !year || !applyAmount) return;
    setActionLoading('apply');
    setError(null);
    try {
      const result = await api.applyBanked(shipId.trim(), year, applyAmount);
      setBankResult(result);
      setApplyAmount('');
      // Refresh records to show updated applied status
      const records = await api.getBankRecords(shipId.trim(), year);
      setBankRecords(records);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to apply banked surplus',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const currentCB = cb?.cbGco2eq ?? 0;
  const hasAvailableBanked = bankRecords.some((r) => !r.applied);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Banking (Article 20)
      </h2>

      {/* Input section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Load Compliance Data
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="bank-ship-id"
              className="block text-sm text-gray-600 mb-1"
            >
              Ship ID
            </label>
            <input
              id="bank-ship-id"
              type="text"
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              placeholder="e.g. R001"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>
          <div>
            <label
              htmlFor="bank-year"
              className="block text-sm text-gray-600 mb-1"
            >
              Year
            </label>
            <input
              id="bank-year"
              type="number"
              value={year}
              onChange={(e) =>
                setYear(e.target.value ? Number(e.target.value) : '')
              }
              placeholder="e.g. 2024"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            />
          </div>
          <button
            onClick={() => void handleLoadData()}
            disabled={!shipId.trim() || !year || loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load Data'}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      {/* Only show rest of UI after data is loaded */}
      {cb && (
        <>
          {/* Current CB indicator */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Current Compliance Balance
            </h3>
            <p
              className={`text-2xl font-bold ${currentCB >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {currentCB.toLocaleString()} gCO₂eq
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {currentCB >= 0 ? 'Surplus' : 'Deficit'} — {cb.shipId}, {cb.year}
            </p>
          </div>

          {/* KPI cards (visible after an apply action) */}
          {bankResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  CB Before
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {bankResult.cbBefore.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Applied
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {bankResult.applied.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  CB After
                </p>
                <p
                  className={`text-lg font-bold ${bankResult.cbAfter >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {bankResult.cbAfter.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Bank Surplus */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Bank Surplus
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="bank-amount"
                    className="block text-sm text-gray-600 mb-1"
                  >
                    Amount (gCO₂eq)
                  </label>
                  <input
                    id="bank-amount"
                    type="number"
                    value={bankAmount}
                    onChange={(e) =>
                      setBankAmount(
                        e.target.value ? Number(e.target.value) : '',
                      )
                    }
                    placeholder="Amount to bank"
                    disabled={currentCB <= 0}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <button
                  onClick={() => void handleBankSurplus()}
                  disabled={
                    currentCB <= 0 ||
                    !bankAmount ||
                    actionLoading !== null
                  }
                  className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'bank' ? 'Banking...' : 'Bank Surplus'}
                </button>
              </div>
              {currentCB <= 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Cannot bank — CB is not positive.
                </p>
              )}
            </div>

            {/* Apply Banked Surplus */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Apply Banked Surplus
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="apply-amount"
                    className="block text-sm text-gray-600 mb-1"
                  >
                    Amount (gCO₂eq)
                  </label>
                  <input
                    id="apply-amount"
                    type="number"
                    value={applyAmount}
                    onChange={(e) =>
                      setApplyAmount(
                        e.target.value ? Number(e.target.value) : '',
                      )
                    }
                    placeholder="Amount to apply"
                    disabled={!hasAvailableBanked}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <button
                  onClick={() => void handleApplyBanked()}
                  disabled={
                    !hasAvailableBanked ||
                    !applyAmount ||
                    actionLoading !== null
                  }
                  className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'apply' ? 'Applying...' : 'Apply Banked'}
                </button>
              </div>
              {!hasAvailableBanked && (
                <p className="text-xs text-gray-400 mt-2">
                  No unapplied bank records available.
                </p>
              )}
            </div>
          </div>

          {/* Bank records table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Bank Records
            </h3>
            {bankRecords.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No bank records for this ship and year.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['ID', 'Amount (gCO₂eq)', 'Applied'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {bankRecords.map((entry) => (
                      <tr
                        key={entry.id}
                        className={
                          entry.applied
                            ? 'bg-gray-50 text-gray-400'
                            : 'hover:bg-gray-50'
                        }
                      >
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-700">
                          {entry.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {entry.amountGco2eq.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-lg">
                          {entry.applied ? '✅' : '⏳'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
