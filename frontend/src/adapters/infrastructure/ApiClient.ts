import type {
  Route,
  RouteComparison,
  ComplianceBalance,
  BankEntry,
  BankResult,
  PoolMemberInput,
  PoolResult,
} from '@core/domain';
import type { IApiClient, RouteFilters } from '@core/ports/IApiClient';

/**
 * Fetch-based API client implementing the IApiClient port.
 * All HTTP communication with the backend goes through this adapter.
 */
export class ApiClient implements IApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as Record<string, string>).error ?? `HTTP ${res.status}`);
    }
    // 204 No-Content
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async getRoutes(filters?: RouteFilters): Promise<Route[]> {
    const params = new URLSearchParams();
    if (filters?.vesselType) params.set('vesselType', filters.vesselType);
    if (filters?.fuelType) params.set('fuelType', filters.fuelType);
    if (filters?.year) params.set('year', String(filters.year));
    const qs = params.toString();
    return this.request<Route[]>(`/routes${qs ? `?${qs}` : ''}`);
  }

  async setBaseline(routeId: string): Promise<void> {
    await this.request<void>(`/routes/${encodeURIComponent(routeId)}/baseline`, {
      method: 'POST',
    });
  }

  async getComparison(): Promise<RouteComparison[]> {
    return this.request<RouteComparison[]>('/routes/comparison');
  }

  async getCB(shipId: string, year: number): Promise<ComplianceBalance> {
    const params = new URLSearchParams({ shipId, year: String(year) });
    return this.request<ComplianceBalance>(`/compliance/cb?${params}`);
  }

  async getAdjustedCB(shipId: string, year: number): Promise<ComplianceBalance> {
    const params = new URLSearchParams({ shipId, year: String(year) });
    return this.request<ComplianceBalance>(`/compliance/adjusted-cb?${params}`);
  }

  async bankSurplus(shipId: string, year: number, amount: number): Promise<void> {
    await this.request<void>('/banking/bank', {
      method: 'POST',
      body: JSON.stringify({ shipId, year, amount }),
    });
  }

  async getBankRecords(shipId: string, year: number): Promise<BankEntry[]> {
    const params = new URLSearchParams({ shipId, year: String(year) });
    return this.request<BankEntry[]>(`/banking/records?${params}`);
  }

  async applyBanked(shipId: string, year: number, amount: number): Promise<BankResult> {
    return this.request<BankResult>('/banking/apply', {
      method: 'POST',
      body: JSON.stringify({ shipId, year, amount }),
    });
  }

  async createPool(year: number, members: PoolMemberInput[]): Promise<PoolResult> {
    return this.request<PoolResult>('/pools', {
      method: 'POST',
      body: JSON.stringify({ year, members }),
    });
  }
}
