import type { ComplianceBalance } from '@core/domain';

/** Outbound port for compliance-balance persistence. */
export interface IComplianceRepository {
  /** Persist a newly computed compliance-balance snapshot. */
  saveCB(cb: Omit<ComplianceBalance, 'id'>): Promise<ComplianceBalance>;

  /** Retrieve the latest CB for a ship in a given year. */
  findCB(shipId: string, year: number): Promise<ComplianceBalance | null>;
}
