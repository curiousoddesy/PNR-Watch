import DatabaseConnection from '../config/database';
import { PNRStatusResult } from '../types';

export interface PNRStatusHistoryData {
  id?: string;
  trackedPnrId: string;
  statusData: PNRStatusResult;
  checkedAt?: Date;
  statusChanged?: boolean;
}

export interface PNRStatusHistoryCreate {
  trackedPnrId: string;
  statusData: PNRStatusResult;
  statusChanged?: boolean;
}

export class PNRStatusHistory {
  public id?: string;
  public trackedPnrId: string;
  public statusData: PNRStatusResult;
  public checkedAt?: Date;
  public statusChanged: boolean;

  private db: DatabaseConnection;

  constructor(data: PNRStatusHistoryData) {
    this.id = data.id;
    this.trackedPnrId = data.trackedPnrId;
    this.statusData = data.statusData;
    this.checkedAt = data.checkedAt;
    this.statusChanged = data.statusChanged || false;
    this.db = DatabaseConnection.getInstance();
  }

  // Static method to create a new status history entry
  static async create(data: PNRStatusHistoryCreate): Promise<PNRStatusHistory> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      INSERT INTO pnr_status_history (tracked_pnr_id, status_data, status_changed)
      VALUES ($1, $2, $3)
      RETURNING id, tracked_pnr_id, status_data, checked_at, status_changed
    `;
    
    const values = [
      data.trackedPnrId,
      JSON.stringify(data.statusData),
      data.statusChanged || false
    ];

    const result = await db.query(query, values);
    const row = result.rows[0];

    return new PNRStatusHistory({
      id: row.id,
      trackedPnrId: row.tracked_pnr_id,
      statusData: row.status_data,
      checkedAt: row.checked_at,
      statusChanged: row.status_changed
    });
  }

  // Static method to find history by tracked PNR ID
  static async findByTrackedPNRId(
    trackedPnrId: string, 
    limit?: number, 
    offset?: number
  ): Promise<PNRStatusHistory[]> {
    const db = DatabaseConnection.getInstance();
    
    let query = `
      SELECT id, tracked_pnr_id, status_data, checked_at, status_changed
      FROM pnr_status_history 
      WHERE tracked_pnr_id = $1
      ORDER BY checked_at DESC
    `;
    
    const values: any[] = [trackedPnrId];
    
    if (limit) {
      query += ` LIMIT $2`;
      values.push(limit);
      
      if (offset) {
        query += ` OFFSET $3`;
        values.push(offset);
      }
    }
    
    const result = await db.query(query, values);
    
    return result.rows.map((row: any) => new PNRStatusHistory({
      id: row.id,
      trackedPnrId: row.tracked_pnr_id,
      statusData: row.status_data,
      checkedAt: row.checked_at,
      statusChanged: row.status_changed
    }));
  }

  // Static method to find history by ID
  static async findById(id: string): Promise<PNRStatusHistory | null> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, tracked_pnr_id, status_data, checked_at, status_changed
      FROM pnr_status_history 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new PNRStatusHistory({
      id: row.id,
      trackedPnrId: row.tracked_pnr_id,
      statusData: row.status_data,
      checkedAt: row.checked_at,
      statusChanged: row.status_changed
    });
  }

  // Static method to get latest status for a tracked PNR
  static async getLatestStatus(trackedPnrId: string): Promise<PNRStatusHistory | null> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, tracked_pnr_id, status_data, checked_at, status_changed
      FROM pnr_status_history 
      WHERE tracked_pnr_id = $1
      ORDER BY checked_at DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, [trackedPnrId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new PNRStatusHistory({
      id: row.id,
      trackedPnrId: row.tracked_pnr_id,
      statusData: row.status_data,
      checkedAt: row.checked_at,
      statusChanged: row.status_changed
    });
  }

  // Static method to get status changes only
  static async getStatusChanges(
    trackedPnrId: string, 
    limit?: number, 
    offset?: number
  ): Promise<PNRStatusHistory[]> {
    const db = DatabaseConnection.getInstance();
    
    let query = `
      SELECT id, tracked_pnr_id, status_data, checked_at, status_changed
      FROM pnr_status_history 
      WHERE tracked_pnr_id = $1 AND status_changed = true
      ORDER BY checked_at DESC
    `;
    
    const values: any[] = [trackedPnrId];
    
    if (limit) {
      query += ` LIMIT $2`;
      values.push(limit);
      
      if (offset) {
        query += ` OFFSET $3`;
        values.push(offset);
      }
    }
    
    const result = await db.query(query, values);
    
    return result.rows.map((row: any) => new PNRStatusHistory({
      id: row.id,
      trackedPnrId: row.tracked_pnr_id,
      statusData: row.status_data,
      checkedAt: row.checked_at,
      statusChanged: row.status_changed
    }));
  }

  // Static method to count total history entries for a tracked PNR
  static async countByTrackedPNRId(trackedPnrId: string): Promise<number> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT COUNT(*) as count
      FROM pnr_status_history 
      WHERE tracked_pnr_id = $1
    `;
    
    const result = await db.query(query, [trackedPnrId]);
    return parseInt(result.rows[0].count);
  }

  // Static method to delete old history entries (cleanup)
  static async deleteOldEntries(daysOld: number): Promise<number> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      DELETE FROM pnr_status_history 
      WHERE checked_at < NOW() - INTERVAL '${daysOld} days'
      AND status_changed = false
    `;
    
    const result = await db.query(query);
    return result.rowCount || 0;
  }

  // Static method to get history for user's PNRs
  static async getHistoryForUser(
    userId: string, 
    limit?: number, 
    offset?: number
  ): Promise<PNRStatusHistory[]> {
    const db = DatabaseConnection.getInstance();
    
    let query = `
      SELECT h.id, h.tracked_pnr_id, h.status_data, h.checked_at, h.status_changed
      FROM pnr_status_history h
      INNER JOIN tracked_pnrs t ON h.tracked_pnr_id = t.id
      WHERE t.user_id = $1
      ORDER BY h.checked_at DESC
    `;
    
    const values: any[] = [userId];
    
    if (limit) {
      query += ` LIMIT $2`;
      values.push(limit);
      
      if (offset) {
        query += ` OFFSET $3`;
        values.push(offset);
      }
    }
    
    const result = await db.query(query, values);
    
    return result.rows.map((row: any) => new PNRStatusHistory({
      id: row.id,
      trackedPnrId: row.tracked_pnr_id,
      statusData: row.status_data,
      checkedAt: row.checked_at,
      statusChanged: row.status_changed
    }));
  }

  // Instance method to delete history entry
  async delete(): Promise<void> {
    const query = `DELETE FROM pnr_status_history WHERE id = $1`;
    await this.db.query(query, [this.id]);
  }

  // Static method to compare status and determine if changed
  static hasStatusChanged(oldStatus: PNRStatusResult, newStatus: PNRStatusResult): boolean {
    if (!oldStatus || !newStatus) {
      return true;
    }

    // Compare key fields that indicate status change
    return (
      oldStatus.status !== newStatus.status ||
      oldStatus.from !== newStatus.from ||
      oldStatus.to !== newStatus.to ||
      oldStatus.date !== newStatus.date ||
      oldStatus.isFlushed !== newStatus.isFlushed
    );
  }

  // Convert to JSON
  toJSON(): PNRStatusHistoryData {
    return {
      id: this.id,
      trackedPnrId: this.trackedPnrId,
      statusData: this.statusData,
      checkedAt: this.checkedAt,
      statusChanged: this.statusChanged
    };
  }
}