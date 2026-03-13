import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';
import type { RouteComparison } from '@core/domain';
import { TARGET_INTENSITY } from '@shared/constants';
import { ApiClient } from '@adapters/infrastructure/ApiClient';

// Register only the Chart.js components we need (tree-shaking)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  annotationPlugin,
);

const api = new ApiClient();

export function CompareTab() {
  const [comparisons, setComparisons] = useState<RouteComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparisons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getComparison();
      setComparisons(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch comparisons',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchComparisons();
  }, [fetchComparisons]);

  // Derive the baseline entry (the route flagged as baseline in the comparison data)
  const baseline = useMemo(
    () => comparisons.find((c) => c.route.isBaseline),
    [comparisons],
  );

  // Chart data
  const chartData = useMemo(() => {
    const labels = comparisons.map((c) => c.route.routeId);
    const intensities = comparisons.map((c) => c.route.ghgIntensity);
    const backgroundColors = comparisons.map((c) => {
      if (c.route.isBaseline) return 'rgba(59, 130, 246, 0.7)'; // blue
      return c.compliant
        ? 'rgba(34, 197, 94, 0.7)' // green
        : 'rgba(239, 68, 68, 0.7)'; // red
    });
    const borderColors = comparisons.map((c) => {
      if (c.route.isBaseline) return 'rgb(59, 130, 246)';
      return c.compliant ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    });

    return {
      labels,
      datasets: [
        {
          label: 'GHG Intensity (gCO\u2082e/MJ)',
          data: intensities,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  }, [comparisons]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' as const },
        annotation: {
          annotations: {
            targetLine: {
              type: 'line' as const,
              yMin: TARGET_INTENSITY,
              yMax: TARGET_INTENSITY,
              borderColor: 'rgb(234, 88, 12)',
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: `Target: ${TARGET_INTENSITY}`,
                position: 'end' as const,
                backgroundColor: 'rgb(234, 88, 12)',
                color: '#fff',
                font: { size: 11 },
              },
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'gCO\u2082e/MJ' },
        },
        x: {
          title: { display: true, text: 'Route ID' },
        },
      },
    }),
    [],
  );

  /** Format percent difference with sign and 2 decimals */
  const formatDiff = (val: number): string => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Compare Routes
      </h2>

      {/* Summary card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Comparison Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Baseline Route:</span>{' '}
            <span className="font-medium text-gray-900">
              {baseline ? baseline.route.routeId : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Baseline GHG Intensity:</span>{' '}
            <span className="font-medium text-gray-900">
              {baseline ? `${baseline.route.ghgIntensity.toFixed(2)} gCO\u2082e/MJ` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Target Intensity:</span>{' '}
            <span className="font-medium text-orange-600">
              {TARGET_INTENSITY} gCO₂e/MJ
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading comparisons...</span>
        </div>
      ) : comparisons.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">
          No comparison data available. Set a baseline route in the Routes tab
          first.
        </p>
      ) : (
        <>
          {/* Comparison table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 mb-8">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Route ID',
                    'Vessel Type',
                    'GHG Intensity (gCO\u2082e/MJ)',
                    '% Difference',
                    'Compliant',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisons.map((c) => (
                  <tr
                    key={c.route.id}
                    className={
                      c.route.isBaseline
                        ? 'bg-blue-50'
                        : c.compliant
                          ? 'bg-green-50'
                          : 'bg-red-50'
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                      {c.route.routeId}
                      {c.route.isBaseline && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Baseline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {c.route.vesselType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {c.route.ghgIntensity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {c.route.isBaseline ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span
                          className={
                            c.percentDiff > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {formatDiff(c.percentDiff)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-lg">
                      {c.compliant ? '✅' : '❌'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              GHG Intensity Comparison
            </h3>
            <div className="h-80">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-blue-500" />
                Baseline
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-green-500" />
                Compliant
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-red-500" />
                Non-compliant
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded border-2 border-dashed border-orange-500" />
                Target ({TARGET_INTENSITY})
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
