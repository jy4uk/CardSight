#!/bin/bash

# Script to remove JavaScript files after TypeScript migration
# Run this after verifying that all TypeScript files work correctly

echo "🔍 Checking for JavaScript files to remove..."

# List of JavaScript files to remove (routes)
JS_FILES=(
  "src/routes/auth-new.js"
  "src/routes/insights.js"
  "src/routes/inventory.js"
  "src/routes/pricing.js"
  "src/routes/psaLookup.js"
  "src/routes/savedDeals.js"
  "src/routes/settings.js"
  "src/routes/stripe.js"
  "src/routes/tcg.js"
  "src/routes/terminal.js"
  "src/routes/trades.js"
  "src/routes/transactions.js"
  "src/routes/users.js"
  "src/routes/index.js"
  "src/middleware/auth.js"
  "src/services/db.js"
  "src/server.js"
)

echo "📋 Files to be removed:"
for file in "${JS_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (not found)"
  fi
done

echo ""
read -p "⚠️  Are you sure you want to remove these files? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  echo "🗑️  Removing JavaScript files..."
  for file in "${JS_FILES[@]}"; do
    if [ -f "$file" ]; then
      rm "$file"
      echo "  Removed: $file"
    fi
  done
  echo "✅ JavaScript files removed successfully!"
  echo ""
  echo "📝 Next steps:"
  echo "  1. Run: npm run type-check"
  echo "  2. Run: npm run dev:ts"
  echo "  3. Test all endpoints"
  echo "  4. Commit changes to git"
else
  echo "❌ Operation cancelled"
fi
