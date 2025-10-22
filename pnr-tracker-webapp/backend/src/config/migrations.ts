import fs from 'fs';
import path from 'path';
import DatabaseConnection from './database';

interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  executed_at?: Date;
}

class MigrationManager {
  private db: DatabaseConnection;
  private migrationsPath: string;

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.migrationsPath = path.join(__dirname, '../migrations');
  }

  async initializeMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await this.db.query(createTableQuery);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.db.query('SELECT id FROM migrations ORDER BY executed_at');
    return result.rows.map((row: any) => row.id);
  }

  async getMigrationFiles(): Promise<Migration[]> {
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const filePath = path.join(this.migrationsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split migration file into up and down sections
      const sections = content.split('-- DOWN');
      const up = sections[0].replace('-- UP', '').trim();
      const down = sections[1] ? sections[1].trim() : '';

      const id = file.replace('.sql', '');
      const name = id.replace(/^\d+_/, '').replace(/_/g, ' ');

      migrations.push({
        id,
        name,
        up,
        down
      });
    }

    return migrations;
  }

  async runMigrations(): Promise<void> {
    await this.initializeMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      try {
        await this.db.transaction(async (client) => {
          console.log(`Running migration: ${migration.name}`);
          
          // Execute the migration
          await client.query(migration.up);
          
          // Record the migration as executed
          await client.query(
            'INSERT INTO migrations (id, name) VALUES ($1, $2)',
            [migration.id, migration.name]
          );
        });
        
        console.log(`✓ Migration completed: ${migration.name}`);
      } catch (error) {
        console.error(`✗ Migration failed: ${migration.name}`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  async rollbackMigration(migrationId?: string): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    
    // If no migration ID specified, rollback the last executed migration
    const targetMigrationId = migrationId || executedMigrations[executedMigrations.length - 1];
    
    if (!targetMigrationId) {
      console.log('No migrations to rollback');
      return;
    }

    const migration = allMigrations.find(m => m.id === targetMigrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${targetMigrationId}`);
    }

    if (!migration.down) {
      throw new Error(`No rollback script found for migration: ${targetMigrationId}`);
    }

    try {
      await this.db.transaction(async (client) => {
        console.log(`Rolling back migration: ${migration.name}`);
        
        // Execute the rollback
        await client.query(migration.down);
        
        // Remove the migration record
        await client.query(
          'DELETE FROM migrations WHERE id = $1',
          [migration.id]
        );
      });
      
      console.log(`✓ Migration rolled back: ${migration.name}`);
    } catch (error) {
      console.error(`✗ Migration rollback failed: ${migration.name}`, error);
      throw error;
    }
  }

  async getMigrationStatus(): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    
    console.log('\nMigration Status:');
    console.log('================');
    
    for (const migration of allMigrations) {
      const status = executedMigrations.includes(migration.id) ? '✓' : '✗';
      console.log(`${status} ${migration.id} - ${migration.name}`);
    }
    
    const pendingCount = allMigrations.length - executedMigrations.length;
    console.log(`\nTotal: ${allMigrations.length}, Executed: ${executedMigrations.length}, Pending: ${pendingCount}`);
  }
}

export default MigrationManager;