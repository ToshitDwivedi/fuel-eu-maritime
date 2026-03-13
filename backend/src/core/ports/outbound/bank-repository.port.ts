import type { BankEntry } from '@core/domain';

/** Outbound port for banking persistence (Article 20). */
export interface IBankRepository {
  /** Persist a new banked-surplus entry. */
  save(entry: Omit<BankEntry, 'id'>): Promise<BankEntry>;

  /** Return all bank entries for a ship in a given year. */
  findByShip(shipId: string, year: number): Promise<BankEntry[]>;

  /** Return un-applied entries available for offsetting a deficit. */
  findAvailable(shipId: string): Promise<BankEntry[]>;

  /** Mark a bank entry as applied (consumed to offset deficit). */
  markApplied(id: string): Promise<BankEntry>;
}
