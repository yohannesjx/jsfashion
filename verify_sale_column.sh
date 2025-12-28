#!/bin/bash
# Verification script to ensure the changes are deployed

echo "🔍 Checking if Sale column exists in products page..."
echo ""

if grep -q "<TableHead>Sale</TableHead>" frontend/app/admin/products/page.tsx; then
    echo "✅ Sale column header found in code"
else
    echo "❌ Sale column header NOT found in code"
    exit 1
fi

if grep -q "{/* Sale Column */}" frontend/app/admin/products/page.tsx; then
    echo "✅ Sale column implementation found in code"
else
    echo "❌ Sale column implementation NOT found in code"
    exit 1
fi

echo ""
echo "✅ All changes are present in the code!"
echo ""
echo "📋 Deployment steps:"
echo "1. Make sure you pulled: git pull origin main"
echo "2. Rebuild frontend: docker-compose -f docker-compose.prod.yml build frontend"
echo "3. Restart frontend: docker-compose -f docker-compose.prod.yml up -d frontend"
echo "4. Clear browser cache: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo ""
echo "If still not working, check browser console for errors"
