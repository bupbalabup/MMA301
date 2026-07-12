const tripColumns = [
  { name: 'startLatitude', type: 'REAL' },
  { name: 'startLongitude', type: 'REAL' },
  { name: 'endLatitude', type: 'REAL' },
  { name: 'endLongitude', type: 'REAL' },
  { name: 'startAddress', type: 'TEXT' },
  { name: 'endAddress', type: 'TEXT' },
];

export const migration002AddTripLocationFields = {
  id: 2,
  name: '002_add_trip_location_fields',
  async up(db) {
    const existingColumns = await db.getAllAsync('PRAGMA table_info(trips)');
    const existingColumnNames = new Set(
      existingColumns.map((column) => column.name)
    );

    for (const column of tripColumns) {
      if (!existingColumnNames.has(column.name)) {
        await db.execAsync(
          `ALTER TABLE trips ADD COLUMN ${column.name} ${column.type};`
        );
      }
    }
  },
};
