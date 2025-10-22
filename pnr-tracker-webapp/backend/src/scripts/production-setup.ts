#!/usr/bin/env tsx

/**
 * Production Setup Script
 * Handles database setup, migrations, and initial configuration for production deployment
 */

import { pool } from '../config/database';
import { logger } from '../services/logger';
import fs from 'fs';
import path from 'path';

class ProductionSetup {
  private migrationsPath = path.join(__dirname, '..', 'migrations');

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT NOW()');
      logger.logSystem('Database connection successful', { timestamp: result.rows[0].now });
      return true;
    } catch (error) {
      logger.error('Database connection failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  async createMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `;

    try {
      await pool.query(createTableQuery);
      logger.logSystem('Migrations table created/verified');
    } catch (error) {
      logger.error('Failed to create migrations table', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
      return result.rows.map(row => row.filename);
    } catch (error) {
      logger.error('Failed to get executed migrations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  async executeMigration(filename: string): Promise<void> {
    const migrationPath = path.join(this.migrationsPath, filename);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    try {
      // Execute migration in a transaction
      await pool.query('BEGIN');
      
      // Execute the migration SQL
      await pool.query(migrationSQL);
      
      // Record the migration as executed
      await pool.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await pool.query('COMMIT');
      
      logger.logSystem(`Migration executed successfully: ${filename}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      logger.error(`Migration failed: ${filename}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    logger.logSystem('Starting database migrations...');

    // Get all migration files
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      logger.logSystem('No migration files found');
      return;
    }

    // Get already executed migrations
    const executedMigrations = await this.getExecutedMigrations();

    // Execute pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      logger.logSystem('All migrations are up to date');
      return;
    }

    logger.logSystem(`Executing ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    logger.logSystem('All migrations completed successfully');
  }

  async createIndexes(): Promise<void> {
    logger.logSystem('Creating database indexes for performance...');

    const indexes = [
      {
        name: 'idx_tracked_pnrs_user_id',
        query: 'CREATE INDEX IF NOT EXISTS idx_tracked_pnrs_user_id ON tracked_pnrs(user_id);'
      },
      {
        name: 'idx_tracked_pnrs_pnr',
        query: 'CREATE INDEX IF NOT EXISTS idx_tracked_pnrs_pnr ON tracked_pnrs(pnr);'
      },
      {
        name: 'idx_tracked_pnrs_is_active',
        query: 'CREATE INDEX IF NOT EXISTS idx_tracked_pnrs_is_active ON tracked_pnrs(is_active);'
      },
      {
        name: 'idx_pnr_status_history_tracked_pnr_id',
        query: 'CREATE INDEX IF NOT EXISTS idx_pnr_status_history_tracked_pnr_id ON pnr_status_history(tracked_pnr_id);'
      },
      {
        name: 'idx_pnr_status_history_checked_at',
        query: 'CREATE INDEX IF NOT EXISTS idx_pnr_status_history_checked_at ON pnr_status_history(checked_at);'
      },
      {
        name: 'idx_notifications_user_id',
        query: 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);'
      },
      {
        name: 'idx_notifications_is_read',
        query: 'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);'
      },
      {
        name: 'idx_notifications_created_at',
        query: 'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);'
      },
      {
        name: 'idx_users_email',
        query: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);'
      }
    ];

    for (const index of indexes) {
      try {
        await pool.query(index.query);
        logger.logSystem(`Index created: ${index.name}`);
      } catch (error) {
        logger.error(`Failed to create index: ${index.name}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.logSystem('Database indexes creation completed');
  }

  async optimizeDatabase(): Promise<void> {
    logger.logSystem('Optimizing database performance...');

    try {
      // Update table statistics
      await pool.query('ANALYZE;');
      logger.logSystem('Database statistics updated');

      // Vacuum tables to reclaim space
      await pool.query('VACUUM;');
      logger.logSystem('Database vacuum completed');

    } catch (error) {
      logger.error('Database optimization failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createAdminUser(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      logger.logSystem('Admin user creation skipped - ADMIN_EMAIL or ADMIN_PASSWORD not set');
      return;
    }

    try {
      // Check if admin user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [adminEmail]
      );

      if (existingUser.rows.length > 0) {
        logger.logSystem('Admin user already exists');
        return;
      }

      // Create admin user
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      await pool.query(`
        INSERT INTO users (id, name, email, password_hash, notification_preferences, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Administrator', $1, $2, '{}', NOW(), NOW())
      `, [adminEmail, hashedPassword]);

      logger.logSystem('Admin user created successfully', { email: adminEmail });

    } catch (error) {
      logger.error('Failed to create admin user', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async verifySetup(): Promise<boolean> {
    logger.logSystem('Verifying production setup...');

    try {
      // Check all required tables exist
      const tables = ['users', 'tracked_pnrs', 'pnr_status_history', 'notifications'];
      
      for (const table of tables) {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);

        if (!result.rows[0].exists) {
          logger.error(`Required table missing: ${table}`);
          return false;
        }
      }

      // Check database connectivity
      await pool.query('SELECT 1');

      // Verify indexes exist
      const indexResult = await pool.query(`
        SELECT indexname FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
      `);

      logger.logSystem('Production setup verification completed', {
        tablesVerified: tables.length,
        indexesFound: indexResult.rows.length
      });

      return true;

    } catch (error) {
      logger.error('Production setup verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async run(): Promise<boolean> {
    try {
      logger.logSystem('Starting production setup...');

      // Check database connection
      const connected = await this.checkDatabaseConnection();
      if (!connected) {
        throw new Error('Database connection failed');
      }

      // Create migrations table
      await this.createMigrationsTable();

      // Run migrations
      await this.runMigrations();

      // Create performance indexes
      await this.createIndexes();

      // Optimize database
      await this.optimizeDatabase();

      // Create admin user if configured
      await this.createAdminUser();

      // Verify setup
      const verified = await this.verifySetup();
      if (!verified) {
        throw new Error('Setup verification failed');
      }

      logger.logSystem('Production setup completed successfully!');
      return true;

    } catch (error) {
      logger.error('Production setup failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    } finally {
      await pool.end();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new ProductionSetup();
  
  setup.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Production setup failed:', error);
    process.exit(1);
  });
}

export default ProductionSetup;