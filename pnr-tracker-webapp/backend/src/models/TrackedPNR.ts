import DatabaseConnection from '../config/database';
import { PNRStatusResult } from '../types';

export interface TrackedPNRData {
  id?: string;
  userId: string;
  pnr: string;
  currentStatus?: PNRStatusResult;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TrackedPNRCreate {
  userId: string;
  pnr: string;
  currentStatus?: PNRStatusResult;
}

export interface TrackedPNRUpdate {
  currentStatus?: PNRStatusResult;
  isActive?: boolean;
}

export class TrackedPNR {
  public id?: string;
  public userId: string;
  public pnr: string;
  public currentStatus?: PNRStatusResult;
  public isActive: boolean;
  public createdAt?: Date;
  public updatedAt?: Date;

  private db: DatabaseConnection;

  constructor(data: TrackedPNRData) {
    this.id = data.id;
    this.userId = data.userId;
    this.pnr = data.pnr;
    this.currentStatus = data.currentStatus;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.db = DatabaseConnection.getInstance();
  }

  // Static method to create a new tracked PNR
  static async create(data: TrackedPNRCreate): Promise<TrackedPNR> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      INSERT INTO tracked_pnrs (user_id, pnr, current_status, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, pnr, current_status, is_active, created_at, updated_at
    `;
    
    const values = [
      data.userId,
      data.pnr,
      data.currentStatus ? JSON.stringify(data.currentStatus) : null,
      true
    ];

    const result = await db.query(query, values);
    const row = result.rows[0];

    return new TrackedPNR({
      id: row.id,
      userId: row.user_id,
      pnr: row.pnr,
      currentStatus: row.current_status,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Static method to find tracked PNR by ID
  static async findById(id: string): Promise<TrackedPNR | null> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, user_id, pnr, current_status, is_active, created_at, updated_at
      FROM tracked_pnrs 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new TrackedPNR({
      id: row.id,
      userId: row.user_id,
      pnr: row.pnr,
      currentStatus: row.current_status,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Static method to find tracked PNRs by user ID
  static async findByUserId(userId: string, activeOnly: boolean = true): Promise<TrackedPNR[]> {
    const db = DatabaseConnection.getInstance();
    
    let query = `
      SELECT id, user_id, pnr, current_status, is_active, created_at, updated_at
      FROM tracked_pnrs 
      WHERE user_id = $1
    `;
    
    const values = [userId];
    
    if (activeOnly) {
      query += ' AND is_active = true';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, values);
    
    return result.rows.map((row: any) => new TrackedPNR({
      id: row.id,
      userId: row.user_id,
      pnr: row.pnr,
      currentStatus: row.current_status,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Static method to find tracked PNR by user ID and PNR number
  static async findByUserIdAndPNR(userId: string, pnr: string): Promise<TrackedPNR | null> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, user_id, pnr, current_status, is_active, created_at, updated_at
      FROM tracked_pnrs 
      WHERE user_id = $1 AND pnr = $2
    `;
    
    const result = await db.query(query, [userId, pnr]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new TrackedPNR({
      id: row.id,
      userId: row.user_id,
      pnr: row.pnr,
      currentStatus: row.current_status,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Static method to get all active PNRs for status checking
  static async getAllActivePNRs(): Promise<TrackedPNR[]> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, user_id, pnr, current_status, is_active, created_at, updated_at
      FROM tracked_pnrs 
      WHERE is_active = true
      ORDER BY updated_at ASC
    `;
    
    const result = await db.query(query);
    
    return result.rows.map((row: any) => new TrackedPNR({
      id: row.id,
      userId: row.user_id,
      pnr: row.pnr,
      currentStatus: row.current_status,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Instance method to update tracked PNR
  async update(updates: TrackedPNRUpdate): Promise<TrackedPNR> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.currentStatus !== undefined) {
      updateFields.push(`current_status = $${paramCount}`);
      values.push(JSON.stringify(updates.currentStatus));
      paramCount++;
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(updates.isActive);
      paramCount++;
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(this.id);

    const query = `
      UPDATE tracked_pnrs 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, pnr, current_status, is_active, created_at, updated_at
    `;

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    // Update current instance
    this.currentStatus = row.current_status;
    this.isActive = row.is_active;
    this.updatedAt = row.updated_at;

    return this;
  }

  // Instance method to update status
  async updateStatus(newStatus: PNRStatusResult): Promise<TrackedPNR> {
    return await this.update({ currentStatus: newStatus });
  }

  // Instance method to deactivate (soft delete) tracked PNR
  async deactivate(): Promise<void> {
    await this.update({ isActive: false });
  }

  // Instance method to delete tracked PNR
  async delete(): Promise<void> {
    const query = `DELETE FROM tracked_pnrs WHERE id = $1`;
    await this.db.query(query, [this.id]);
  }

  // Static method to check if PNR exists for user
  static async pnrExistsForUser(userId: string, pnr: string): Promise<boolean> {
    const db = DatabaseConnection.getInstance();
    const query = `SELECT 1 FROM tracked_pnrs WHERE user_id = $1 AND pnr = $2 AND is_active = true LIMIT 1`;
    const result = await db.query(query, [userId, pnr]);
    return result.rows.length > 0;
  }

  // Convert to JSON
  toJSON(): TrackedPNRData {
    return {
      id: this.id,
      userId: this.userId,
      pnr: this.pnr,
      currentStatus: this.currentStatus,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}