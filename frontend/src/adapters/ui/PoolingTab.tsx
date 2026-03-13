import { useMemo, useState } from 'react';
import type { PoolMemberInput, PoolResult } from '@core/domain';
import { validatePool } from '@core/application';
import { ApiClient } from '@adapters/infrastructure/ApiClient';

const api = new ApiClient();

/** Local mutable row used while editing the form. */
interface MemberRow {
  readonly key: number;
  shipId: string;
  cbBefore: string; // kept as string for controlled input
}

let nextKey = 0;

function emptyRow(): MemberRow {
  return { key: nextKey++, shipId: '', cbBefore: '' };
}

export function PoolingTab() {
  const [year, setYear] = useState<number | ''>('');
  const [members, setMembers] = useState<MemberRow[]>([emptyRow(), emptyRow()]);
  const [poolResult, setPoolResult] = useState<PoolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Convert form rows to domain inputs (only rows with numeric cbBefore)
  const parsedMembers: PoolMemberInput[] = useMemo(
    () =>
      members
        .filter((m) => m.shipId.trim() !== '' && m.cbBefore !== '')
        .map((m) => ({ shipId: m.shipId.trim(), cbBefore: Number(m.cbBefore) })),
    [members],
  );

  const poolSum = useMemo(
    () => parsedMembers.reduce((acc, m) => acc + m.cbBefore, 0),
    [parsedMembers],
  );

  const validation = useMemo(() => validatePool(parsedMembers), [parsedMembers]);

  const hasEmptyShipId = members.some(
    (m) => m.shipId.trim() === '' && m.cbBefore !== '',
  );

  const canSubmit =
    !!year &&
    validation.valid &&
    !hasEmptyShipId &&
    !submitting;

  // --- Handlers ---

  const addMember = () => {
    setMembers((prev) => [...prev, emptyRow()]);
  };

  const removeMember = (key: number) => {
    setMembers((prev) => prev.filter((m) => m.key !== key));
    setPoolResult(null);
  };

  const updateMember = (
    key: number,
    field: 'shipId' | 'cbBefore',
    value: string,
  ) => {
    setMembers((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)),
    );
    setPoolResult(null);
  };

  const handleCreatePool = async () => {
    if (!year || !validation.valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.createPool(year, parsedMembers);
      setPoolResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pool');
    } finally {
      setSubmitting(false);
    }
  };

  // Build a lookup from poolResult for cbAfter values
  const cbAfterMap = useMemo(() => {
    if (!poolResult) return new Map<string, number>();
    return new Map(
      poolResult.pool.members.map((m) => [m.shipId, m.cbAfter]),
    );
  }, [poolResult]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Pooling (Article 21)
      </h2>

      {/* Year selector */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pool Configuration
        </h3>
        <div className="flex items-end gap-3">
          <div>
            <label
              htmlFor="pool-year"
              className="block text-sm text-gray-600 mb-1"
            >
              Year
            </label>
            <input
              id="pool-year"
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
            onClick={addMember}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pool Members
        </h3>
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Add at least 2 members to create a pool.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Ship ID', 'CB Before (gCO₂eq)', 'CB After (gCO₂eq)', ''].map(
                    (h) => (
                      <th
                        key={h || 'actions'}
                        className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {members.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={row.shipId}
                        onChange={(e) =>
                          updateMember(row.key, 'shipId', e.target.value)
                        }
                        placeholder="e.g. R001"
                        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={row.cbBefore}
                        onChange={(e) =>
                          updateMember(row.key, 'cbBefore', e.target.value)
                        }
                        placeholder="e.g. 500000"
                        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                      {cbAfterMap.has(row.shipId.trim()) ? (
                        <span
                          className={`font-medium ${
                            cbAfterMap.get(row.shipId.trim())! >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {cbAfterMap.get(row.shipId.trim())!.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeMember(row.key)}
                        disabled={members.length <= 2}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pool Sum indicator */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pool Sum
        </h3>
        <p
          className={`text-2xl font-bold ${poolSum >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          {poolSum.toLocaleString()} gCO₂eq
        </p>
        <p
          className={`text-sm mt-1 ${poolSum >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          {poolSum >= 0 ? 'Pool is valid \u2713' : 'Pool invalid \u2014 sum must be \u2265 0 \u2717'}
        </p>
        {!validation.valid && validation.reason && (
          <p className="text-xs text-gray-500 mt-1">{validation.reason}</p>
        )}
      </div>

      {/* Error display */}
      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      {/* Create Pool button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => void handleCreatePool()}
          disabled={!canSubmit}
          className="rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creating Pool...' : 'Create Pool'}
        </button>
        {!canSubmit && !submitting && (
          <span className="text-xs text-gray-400">
            {!year
              ? 'Enter a year'
              : parsedMembers.length < 2
                ? 'Add at least 2 complete members'
                : hasEmptyShipId
                  ? 'Fill in all Ship IDs'
                  : validation.reason ?? ''}
          </span>
        )}
      </div>

      {/* Pool result summary */}
      {poolResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-2">
            Pool Created Successfully
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-700">Pool ID:</span>{' '}
              <span className="font-mono font-medium text-green-900">
                {poolResult.pool.id}
              </span>
            </div>
            <div>
              <span className="text-green-700">Total CB Before:</span>{' '}
              <span className="font-medium text-green-900">
                {poolResult.totalCbBefore.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-green-700">Total CB After:</span>{' '}
              <span className="font-medium text-green-900">
                {poolResult.totalCbAfter.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
