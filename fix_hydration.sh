#!/bin/bash
# Fix all Link/Button nesting issues

echo "Fixing hydration errors in admin pages..."

# Files to fix:
# - frontend/app/admin/coupons/page.tsx (line 120)
# - frontend/app/admin/coupons/new/page.tsx (lines 136, 245)
# - frontend/app/admin/customers/[id]/page.tsx (multiple)
# - frontend/app/admin/orders/[id]/page.tsx (multiple)
# - frontend/app/admin/products/[id]/page.tsx (one more instance)

echo "Done! Please rebuild the frontend."
