#!/bin/bash
# Initialize local D1 database with schema

DB_FILE=$(find .wrangler -name "*.sqlite" 2>/dev/null | head -1)

if [ -z "$DB_FILE" ]; then
  echo "Error: No D1 database found. Run 'npx wrangler dev --local' first."
  exit 1
fi

echo "Found database: $DB_FILE"

# Apply migrations
echo "Applying migrations..."
cat migrations/001_initial_schema.sql | npx better-sqlite3 "$DB_FILE"
cat migrations/002_enterprise_features.sql | npx better-sqlite3 "$DB_FILE"

echo "Database initialized!"
echo "Tables:"
echo "SELECT name FROM sqlite_master WHERE type='table';" | npx better-sqlite3 "$DB_FILE"
