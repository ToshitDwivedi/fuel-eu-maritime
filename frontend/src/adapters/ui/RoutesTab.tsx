import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Route, VesselType, FuelType } from '@core/domain';
import { ApiClient } from '@adapters/infrastructure/ApiClient';

const api = new ApiClient();

export function RoutesTab() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingBaseline, setSettingBaseline] = useState<string | null>(null);

  // Filter state
  const [vesselFilter, setVesselFilter] = useState<VesselType | ''>('');
  const [fuelFilter, setFuelFilter] = useState<FuelType | ''>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRoutes({
        ...(vesselFilter ? { vesselType: vesselFilter } : {}),
        ...(fuelFilter ? { fuelType: fuelFilter } : {}),
        ...(yearFilter ? { year: yearFilter } : {}),
      });
      setRoutes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  }, [vesselFilter, fuelFilter, yearFilter]);

  useEffect(() => {
    void fetchRoutes();
  }, [fetchRoutes]);

  // Derive unique filter options from the full dataset
  const vesselTypes = useMemo(
    () => [...new Set(routes.map((r) => r.vesselType))].sort(),
    [routes],
  );
  const fuelTypes = useMemo(
    () => [...new Set(routes.map((r) => r.fuelType))].sort(),
    [routes],
  );
  const years = useMemo(
    () => [...new Set(routes.map((r) => r.year))].sort((a, b) => a - b),
    [routes],
  );

  const handleSetBaseline = async (routeId: string) => {
    setSettingBaseline(routeId);
    setError(null);
    try {
      await api.setBaseline(routeId);
      await fetchRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set baseline');
    } finally {
      setSettingBaseline(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Routes</h2>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={vesselFilter}
          onChange={(e) => setVesselFilter(e.target.value as VesselType | '')}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Vessel Types</option>
          {vesselTypes.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={fuelFilter}
          onChange={(e) => setFuelFilter(e.target.value as FuelType | '')}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Fuel Types</option>
          {fuelTypes.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : '')}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
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
          <span className="ml-3 text-gray-500">Loading routes...</span>
        </div>
      ) : routes.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No routes found.</p>
      ) : (
        /* Table with horizontal scroll on mobile */
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Route ID',
                  'Vessel Type',
                  'Fuel Type',
                  'Year',
                  'GHG Intensity (gCO\u2082e/MJ)',
                  'Fuel Consumption (t)',
                  'Distance (km)',
                  'Total Emissions (t)',
                  'Actions',
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
            <tbody className="divide-y divide-gray-100 bg-white">
              {routes.map((route) => (
                <tr
                  key={route.id}
                  className={
                    route.isBaseline ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                    {route.routeId}
                    {route.isBaseline && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Baseline
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {route.vesselType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {route.fuelType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {route.year}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {route.ghgIntensity.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {route.fuelConsumption.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {route.distance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {route.totalEmissions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {route.isBaseline ? (
                      <span className="text-xs text-gray-400">Current baseline</span>
                    ) : (
                      <button
                        onClick={() => void handleSetBaseline(route.id)}
                        disabled={settingBaseline !== null}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {settingBaseline === route.id
                          ? 'Setting...'
                          : 'Set Baseline'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
