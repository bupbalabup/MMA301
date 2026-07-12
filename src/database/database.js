import * as SQLite from 'expo-sqlite';

import { migration001CreateTrackingTables } from './migrations/001_create_tracking_tables';
import { migration002AddTripLocationFields } from './migrations/002_add_trip_location_fields';
import { migration003AddTripCloudSyncFields } from './migrations/003_add_trip_cloud_sync_fields';

const DATABASE_NAME = 'trackcam.db';
const migrations = [
  migration001CreateTrackingTables,
  migration002AddTripLocationFields,
  migration003AddTripCloudSyncFields,
];

let database = null;

async function runMigrations(db) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      appliedAt INTEGER NOT NULL
    );
  `);

  for (const migration of migrations) {
    const existingMigration = await db.getFirstAsync(
      'SELECT id FROM schema_migrations WHERE id = ?',
      [migration.id]
    );

    if (existingMigration) {
      continue;
    }

    await migration.up(db);
    await db.runAsync(
      'INSERT INTO schema_migrations (id, name, appliedAt) VALUES (?, ?, ?)',
      [migration.id, migration.name, Date.now()]
    );
  }
}

export async function initDatabase() {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await runMigrations(database);
  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error('Database has not been initialized. Call initDatabase() first.');
  }

  return database;
}
