#!/bin/bash

# Reset database script
# WARNING: This will delete all data!

echo "⚠️  This will delete all data in the database!"
read -p "Are you sure? (y/N) " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

echo "🗑️  Resetting database..."

cd "$(dirname "$0")/../../backend"

# Reset database
npx prisma migrate reset --force

echo "✅ Database reset complete!"
