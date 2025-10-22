import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'pnr_tracker',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients in the pool
    min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum number of clients in the pool
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // Return an error after 2 seconds if connection could not be established
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };

  return config;
};

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    const config = getDatabaseConfig();
    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      console.log('Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export default DatabaseConnection;
export { getDatabaseConfig };