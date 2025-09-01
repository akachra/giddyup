#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Build the frontend and backend
echo "📦 Building application..."
npm run build

# Run database migration
echo "🗄️ Running database migration..."
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f deploy.sql
    echo "✅ Database migration completed successfully"
else
    echo "⚠️ DATABASE_URL not found, skipping database migration"
fi

echo "🎉 Deployment preparation complete!"