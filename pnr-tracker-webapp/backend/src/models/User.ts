import bcrypt from 'bcrypt';
import DatabaseConnection from '../config/database';

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  statusTypes: string[]; // ['confirmation', 'waitlist_movement', 'cancellation']
}

export interface UserData {
  id?: string;
  email: string;
  password?: string;
  passwordHash?: string;
  name: string;
  notificationPreferences?: NotificationSettings;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
  notificationPreferences?: NotificationSettings;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  notificationPreferences?: NotificationSettings;
}

export class User {
  public id?: string;
  public email: string;
  public passwordHash?: string;
  public name: string;
  public notificationPreferences: NotificationSettings;
  public createdAt?: Date;
  public updatedAt?: Date;
  public lastLogin?: Date;

  private db: DatabaseConnection;

  constructor(userData: UserData) {
    this.id = userData.id;
    this.email = userData.email;
    this.passwordHash = userData.passwordHash;
    this.name = userData.name;
    this.notificationPreferences = userData.notificationPreferences || {
      emailEnabled: true,
      pushEnabled: false,
      inAppEnabled: true,
      statusTypes: ['confirmation', 'waitlist_movement', 'cancellation']
    };
    this.createdAt = userData.createdAt;
    this.updatedAt = userData.updatedAt;
    this.lastLogin = userData.lastLogin;
    this.db = DatabaseConnection.getInstance();
  }

  // Static method to hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Instance method to verify password
  async verifyPassword(password: string): Promise<boolean> {
    if (!this.passwordHash) {
      return false;
    }
    return await bcrypt.compare(password, this.passwordHash);
  }

  // Static method to create a new user
  static async create(userData: UserRegistration): Promise<User> {
    const db = DatabaseConnection.getInstance();
    
    // Hash the password
    const passwordHash = await User.hashPassword(userData.password);
    
    const query = `
      INSERT INTO users (email, password_hash, name, notification_preferences)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, notification_preferences, created_at, updated_at
    `;
    
    const values = [
      userData.email,
      passwordHash,
      userData.name,
      JSON.stringify(userData.notificationPreferences || {
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        statusTypes: ['confirmation', 'waitlist_movement', 'cancellation']
      })
    ];

    const result = await db.query(query, values);
    const row = result.rows[0];

    return new User({
      id: row.id,
      email: row.email,
      name: row.name,
      notificationPreferences: row.notification_preferences,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Static method to find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, email, password_hash, name, notification_preferences, 
             created_at, updated_at, last_login
      FROM users 
      WHERE email = $1
    `;
    
    const result = await db.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      notificationPreferences: row.notification_preferences,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login
    });
  }

  // Static method to find user by ID
  static async findById(id: string): Promise<User | null> {
    const db = DatabaseConnection.getInstance();
    
    const query = `
      SELECT id, email, password_hash, name, notification_preferences, 
             created_at, updated_at, last_login
      FROM users 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      notificationPreferences: row.notification_preferences,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login
    });
  }

  // Instance method to update user
  async update(updates: UserUpdate): Promise<User> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      values.push(updates.email);
      paramCount++;
    }

    if (updates.notificationPreferences !== undefined) {
      updateFields.push(`notification_preferences = $${paramCount}`);
      values.push(JSON.stringify(updates.notificationPreferences));
      paramCount++;
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(this.id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, notification_preferences, created_at, updated_at, last_login
    `;

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    // Update current instance
    this.email = row.email;
    this.name = row.name;
    this.notificationPreferences = row.notification_preferences;
    this.updatedAt = row.updated_at;

    return this;
  }

  // Instance method to update last login
  async updateLastLogin(): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login = NOW()
      WHERE id = $1
    `;
    
    await this.db.query(query, [this.id]);
    this.lastLogin = new Date();
  }

  // Instance method to update password
  async updatePassword(newPassword: string): Promise<void> {
    const passwordHash = await User.hashPassword(newPassword);
    
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await this.db.query(query, [passwordHash, this.id]);
    this.passwordHash = passwordHash;
    this.updatedAt = new Date();
  }

  // Instance method to delete user
  async delete(): Promise<void> {
    const query = `DELETE FROM users WHERE id = $1`;
    await this.db.query(query, [this.id]);
  }

  // Static method to check if email exists
  static async emailExists(email: string): Promise<boolean> {
    const db = DatabaseConnection.getInstance();
    const query = `SELECT 1 FROM users WHERE email = $1 LIMIT 1`;
    const result = await db.query(query, [email]);
    return result.rows.length > 0;
  }

  // Convert to JSON (excluding sensitive data)
  toJSON(): Omit<UserData, 'passwordHash'> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      notificationPreferences: this.notificationPreferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }
}