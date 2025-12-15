#!/bin/bash

# Add all changes
git add .

# Commit with message
git commit -m "feat: Add inventory value calculation to Inventory Management

- Updated GetInventoryStats SQL query to calculate total inventory value in Birr
- Added variant_count and total_inventory_value fields to inventory stats
- Fixed table references from 'variants' to 'product_variants'
- Updated frontend to display total stock value and variant count
- Enhanced inventory stats cards with better visual hierarchy"

# Push to remote
git push origin main

echo "✅ Changes pushed to git successfully!"
