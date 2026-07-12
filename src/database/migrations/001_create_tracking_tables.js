export const migration001CreateTrackingTables = {
  id: 1,
  name: '001_create_tracking_tables',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        durationMs INTEGER,
        totalDistanceKm REAL NOT NULL DEFAULT 0,
        avgSpeedKmh REAL,
        maxSpeedKmh REAL,
        startLatitude REAL,
        startLongitude REAL,
        endLatitude REAL,
        endLongitude REAL,
        startAddress TEXT,
        endAddress TEXT,
        status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'interrupted')),
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gps_points (
        id TEXT PRIMARY KEY NOT NULL,
        tripId TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        speedKmh REAL,
        heading REAL,
        accuracy REAL,
        altitude REAL,
        timestamp INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_trips_status
      ON trips(status);

      CREATE INDEX IF NOT EXISTS idx_trips_date
      ON trips(date);

      CREATE INDEX IF NOT EXISTS idx_trips_startTime
      ON trips(startTime DESC);

      CREATE INDEX IF NOT EXISTS idx_gps_points_tripId
      ON gps_points(tripId);

      CREATE INDEX IF NOT EXISTS idx_gps_points_tripId_timestamp
      ON gps_points(tripId, timestamp ASC);

      CREATE INDEX IF NOT EXISTS idx_gps_points_timestamp
      ON gps_points(timestamp DESC);
    `);
  },
};
