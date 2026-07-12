export const migration003AddTripCloudSyncFields = {
  id: 3,
  name: '003_add_trip_cloud_sync_fields',
  async up(db) {
    const columns = await db.getAllAsync('PRAGMA table_info(trips)');
    const existingColumnNames = new Set(columns.map((column) => column.name));

    if (!existingColumnNames.has('cloudSyncStatus')) {
      await db.execAsync('ALTER TABLE trips ADD COLUMN cloudSyncStatus TEXT;');
    }

    if (!existingColumnNames.has('cloudSyncedAt')) {
      await db.execAsync('ALTER TABLE trips ADD COLUMN cloudSyncedAt INTEGER;');
    }

    if (!existingColumnNames.has('cloudSyncError')) {
      await db.execAsync('ALTER TABLE trips ADD COLUMN cloudSyncError TEXT;');
    }

    if (!existingColumnNames.has('cloudSyncAttempts')) {
      await db.execAsync(
        'ALTER TABLE trips ADD COLUMN cloudSyncAttempts INTEGER NOT NULL DEFAULT 0;'
      );
    }

    await db.execAsync(`
      UPDATE trips
      SET cloudSyncStatus = 'pending'
      WHERE status = 'completed'
        AND cloudSyncStatus IS NULL;

      UPDATE trips
      SET cloudSyncAttempts = 0
      WHERE cloudSyncAttempts IS NULL;

      CREATE INDEX IF NOT EXISTS idx_trips_cloudSyncStatus
      ON trips(cloudSyncStatus);
    `);
  },
};
