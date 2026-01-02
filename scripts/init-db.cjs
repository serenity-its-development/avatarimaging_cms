// Initialize local D1 database with migrations
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

async function main() {
  // Find D1 database file
  const { stdout } = await execPromise('find .wrangler -name "*.sqlite" 2>/dev/null | head -1');
  const dbFile = stdout.trim();

  if (!dbFile) {
    console.error('Error: No D1 database found. Start wrangler dev first.');
    process.exit(1);
  }

  console.log(`Found database: ${dbFile}`);

  // Read migrations
  const migration1 = fs.readFileSync('migrations/001_initial_schema.sql', 'utf8');
  const migration2 = fs.readFileSync('migrations/002_enterprise_features.sql', 'utf8');

  // Apply using wrangler d1 execute (hacky but works)
  const Database = require('better-sqlite3');
  const db = new Database(dbFile);

  console.log('Applying migration 001...');
  db.exec(migration1);

  console.log('Applying migration 002...');
  db.exec(migration2);

  console.log('✅ Migrations applied!');

  // List tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('\nTables created:');
  tables.forEach(t => console.log(`  - ${t.name}`));

  db.close();
}

main().catch(console.error);
