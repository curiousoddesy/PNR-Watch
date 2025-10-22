import DatabaseConnection from '../config/database';

export type NotificationType = 'confirmation' | 'waitlist_movement' | 'cancellation' | 'chart_prepared' | 'system' | 'error';

export interface NotificationData {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  isRead?: boolean;
  createdAt?: Date;
  readAt?: Date;
}

export interface NotificationCreate {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface NotificationUpdate {
  isRead?: boolean;
  readAt?: Date;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export class Notification {
  public id?: string;
  public userId: string;
  public type: NotificationType;
  public title: string;
  public content: string;
  public metadata?: Record<string, any>;
  public isRead: boolean;
  public createdAt?: Date;
  public readAt?: Date;

  private db: DatabaseConnection;

  constructor(data: NotificationData) {
    this.id = data.id;
    this.userId = data.userId;
    this.type = data.type;
    this.title = data.title;
    this.content = data.content;
    this.metadata = data.metadata;
    this.isRead = data.isRead || false;
    this.createdAt = data.createdAt;
    this.readAt = data.readAt;
    this.db = DatabaseConnection.getInstance();
  }

  // Static method to create a new notification
  static async create(data: NotificationCreate): Promise<Notification> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      INSERT INTO notifications (user_id, type, title, content, metadata, is_read)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, type, title, content, metadata, is_read, created_at, read_at
    `;
    
    const values = [
      data.userId,
      data.type,
      data.title,
      data.content,
      data.metadata ? JSON.stringify(data.metadata) : null,
      false
    ];

    const result = await db.query(query, values);
    const row = result.rows[0];

    return new Notification({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      isRead: row.is_read,
      createdAt: row.created_at,
      readAt: row.read_at
    });
  }

  // Static method to find notification by ID
  static async findById(id: string): Promise<Notification | null> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, user_id, type, title, content, metadata, is_read, created_at, read_at
      FROM notifications 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Notification({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      isRead: row.is_read,
      createdAt: row.created_at,
      readAt: row.read_at
    });
  }

  // Static method to find notifications by user ID with filters
  static async findByUserId(
    userId: string, 
    filters?: NotificationFilters,
    limit?: number, 
    offset?: number
  ): Promise<Notification[]> {
    const db = DatabaseConnection.getInstance();
    
    let query = `
      SELECT id, user_id, type, title, content, metadata, is_read, created_at, read_at
      FROM notifications 
      WHERE user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 2;

    // Apply filters
    if (filters) {
      if (filters.type !== undefined) {
        query += ` AND type = $${paramCount}`;
        values.push(filters.type);
        paramCount++;
      }

      if (filters.isRead !== undefined) {
        query += ` AND is_read = $${paramCount}`;
        values.push(filters.isRead);
        paramCount++;
      }

      if (filters.fromDate) {
        query += ` AND created_at >= $${paramCount}`;
        values.push(filters.fromDate);
        paramCount++;
      }

      if (filters.toDate) {
        query += ` AND created_at <= $${paramCount}`;
        values.push(filters.toDate);
        paramCount++;
      }
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(limit);
      paramCount++;
      
      if (offset) {
        query += ` OFFSET $${paramCount}`;
        values.push(offset);
      }
    }
    
    const result = await db.query(query, values);
    
    return result.rows.map((row: any) => new Notification({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      isRead: row.is_read,
      createdAt: row.created_at,
      readAt: row.read_at
    }));
  }

  // Static method to get unread count for user
  static async getUnreadCount(userId: string): Promise<number> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `;
    
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  // Static method to get recent notifications for user
  static async getRecentNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
    return await Notification.findByUserId(userId, undefined, limit);
  }

  // Static method to get unread notifications for user
  static async getUnreadNotifications(userId: string, limit?: number): Promise<Notification[]> {
    return await Notification.findByUserId(userId, { isRead: false }, limit);
  }

  // Static method to mark all notifications as read for user
  static async markAllAsReadForUser(userId: string): Promise<number> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `;
    
    const result = await db.query(query, [userId]);
    return result.rowCount || 0;
  }

  // Static method to delete old notifications
  static async deleteOldNotifications(daysOld: number): Promise<number> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      DELETE FROM notifications 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      AND is_read = true
    `;
    
    const result = await db.query(query);
    return result.rowCount || 0;
  }

  // Static method to count notifications by user with filters
  static async countByUserId(userId: string, filters?: NotificationFilters): Promise<number> {
    const db = DatabaseConnection.getInstance();
    
    let query = `
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 2;

    // Apply filters
    if (filters) {
      if (filters.type !== undefined) {
        query += ` AND type = $${paramCount}`;
        values.push(filters.type);
        paramCount++;
      }

      if (filters.isRead !== undefined) {
        query += ` AND is_read = $${paramCount}`;
        values.push(filters.isRead);
        paramCount++;
      }

      if (filters.fromDate) {
        query += ` AND created_at >= $${paramCount}`;
        values.push(filters.fromDate);
        paramCount++;
      }

      if (filters.toDate) {
        query += ` AND created_at <= $${paramCount}`;
        values.push(filters.toDate);
        paramCount++;
      }
    }
    
    const result = await db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  // Instance method to mark as read
  async markAsRead(): Promise<Notification> {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, type, title, content, metadata, is_read, created_at, read_at
    `;

    const result = await this.db.query(query, [this.id]);
    const row = result.rows[0];

    // Update current instance
    this.isRead = row.is_read;
    this.readAt = row.read_at;

    return this;
  }

  // Instance method to mark as unread
  async markAsUnread(): Promise<Notification> {
    const query = `
      UPDATE notifications 
      SET is_read = false, read_at = NULL
      WHERE id = $1
      RETURNING id, user_id, type, title, content, metadata, is_read, created_at, read_at
    `;

    const result = await this.db.query(query, [this.id]);
    const row = result.rows[0];

    // Update current instance
    this.isRead = row.is_read;
    this.readAt = row.read_at;

    return this;
  }

  // Instance method to update notification
  async update(updates: NotificationUpdate): Promise<Notification> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.isRead !== undefined) {
      updateFields.push(`is_read = $${paramCount}`);
      values.push(updates.isRead);
      paramCount++;

      if (updates.isRead && !updates.readAt) {
        updateFields.push(`read_at = NOW()`);
      } else if (!updates.isRead) {
        updateFields.push(`read_at = NULL`);
      }
    }

    if (updates.readAt !== undefined) {
      updateFields.push(`read_at = $${paramCount}`);
      values.push(updates.readAt);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return this;
    }

    values.push(this.id);

    const query = `
      UPDATE notifications 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, type, title, content, metadata, is_read, created_at, read_at
    `;

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    // Update current instance
    this.isRead = row.is_read;
    this.readAt = row.read_at;

    return this;
  }

  // Instance method to delete notification
  async delete(): Promise<void> {
    const query = `DELETE FROM notifications WHERE id = $1`;
    await this.db.query(query, [this.id]);
  }

  // Static method to create PNR status change notification
  static async createPNRStatusNotification(
    userId: string,
    pnr: string,
    oldStatus: string,
    newStatus: string,
    journeyDetails?: { from: string; to: string; date: string }
  ): Promise<Notification> {
    const title = `PNR ${pnr} Status Updated`;
    let content = `Your PNR status changed from "${oldStatus}" to "${newStatus}"`;
    
    if (journeyDetails) {
      content += ` for journey from ${journeyDetails.from} to ${journeyDetails.to} on ${journeyDetails.date}`;
    }

    const metadata = {
      pnr,
      oldStatus,
      newStatus,
      journeyDetails
    };

    // Determine notification type based on status change
    let type: NotificationType = 'waitlist_movement';
    if (newStatus.toLowerCase().includes('confirm')) {
      type = 'confirmation';
    } else if (newStatus.toLowerCase().includes('cancel')) {
      type = 'cancellation';
    } else if (newStatus.toLowerCase().includes('chart')) {
      type = 'chart_prepared';
    }

    return await Notification.create({
      userId,
      type,
      title,
      content,
      metadata
    });
  }

  // Convert to JSON
  toJSON(): NotificationData {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      title: this.title,
      content: this.content,
      metadata: this.metadata,
      isRead: this.isRead,
      createdAt: this.createdAt,
      readAt: this.readAt
    };
  }
}