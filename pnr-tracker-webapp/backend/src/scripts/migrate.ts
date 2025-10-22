#!/usr/bin/env tsx

import MigrationManager from '../config/migrations';
import DatabaseConnection from '../config/database';

async function main() {
  const command = process.argv[2];
  const migrationManager = new MigrationManager();
  const db = DatabaseConnection.getInstance();

  try {
    // Test database connection first
    console.log('Testing database connection...');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      console.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    switch (command) {
      case 'up':
        console.log('Running migrations...');
        await migrationManager.runMigrations();
        break;

      case 'down':
        const migrationId = process.argv[3];
        console.log('Rolling back migration...');
        await migrationManager.rollbackMigration(migrationId);
        break;

      case 'status':
        await migrationManager.getMigrationStatus();
        break;

      case 'create':
        const migrationName = process.argv[3];
        if (!migrationName) {
          console.error('Please provide a migration name: npm run migrate create <migration_name>');
          process.exit(1);
        }
        console.log(`Creating migration: ${migrationName}`);
        // This would create a new migration file template
        console.log('Migration creation not implemented yet. Please create migration files manually.');
        break;

      default:
        console.log('Usage:');
        console.log('  npm run migrate up           - Run all pending migrations');
        console.log('  npm run migrate down [id]    - Rollback migration (latest if no id provided)');
        console.log('  npm run migrate status       - Show migration status');
        console.log('  npm run migrate create <name> - Create new migration file');
        break;
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();