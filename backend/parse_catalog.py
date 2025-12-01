#!/usr/bin/env python3
import json
import re
import os
from pathlib import Path

# Paths
SQL_FILE = "/Users/mac/Documents/pr/backend/import.sql"
IMAGES_DIR = "/Users/mac/Documents/pr/backend/public/images"
OUTPUT_FILE = "/Users/mac/Documents/pr/backend/products_catalog.json"

def parse_sql_copy_data(sql_content, table_name):
    """Extract COPY data for a specific table"""
    # Normalize line endings
    sql_content = sql_content.replace('\r\n', '\n').replace('\r', '\n')
    
    # The terminator is \. (backslash dot) which appears as \\. in the file
    pattern = rf"COPY public\.{table_name} \([^)]+\) FROM stdin;\n(.*?)\n\\\."
    match = re.search(pattern, sql_content, re.DOTALL)
    if not match:
        print(f"  WARNING: No match found for table '{table_name}'")
        return []
    
    data_block = match.group(1).strip()
    lines = [line.strip() for line in data_block.split('\n') if line.strip() and not line.startswith('--')]
    
    print(f"  Found {len(lines)} rows for table '{table_name}'")
    
    rows = []
    for line in lines:
        # Split by tabs
        fields = line.split('\t')
        rows.append(fields)
    
    return rows

def check_image_exists(url):
    """Check if image file exists in the images directory"""
    if not url or url == '\\N':
        return False
    # Remove leading /images/ and construct full path
    rel_path = url.replace('/images/', '')
    full_path = os.path.join(IMAGES_DIR, rel_path)
    return os.path.exists(full_path)

def normalize_price(price_str):
    """Normalize price according to the rules: if >= 10000, divide by 100"""
    try:
        price = int(price_str)
        if price >= 10000:
            return price // 100
        return price
    except:
        return None

def main():
    print("Reading SQL file...")
    with open(SQL_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        sql_content = f.read()
    
    print("Parsing products...")
    products_data = parse_sql_copy_data(sql_content, 'products')
    
    print("Parsing variants...")
    variants_data = parse_sql_copy_data(sql_content, 'variants')
    
    print("Parsing prices...")
    prices_data = parse_sql_copy_data(sql_content, 'prices')
    
    print("Parsing product_images...")
    images_data = parse_sql_copy_data(sql_content, 'product_images')
    
    print("Parsing categories...")
    categories_data = parse_sql_copy_data(sql_content, 'categories')
    
    print("Parsing product_categories...")
    product_categories_data = parse_sql_copy_data(sql_content, 'product_categories')
    
    # Build lookup dictionaries
    print("Building lookup dictionaries...")
    
    # Categories lookup: id -> name
    categories_map = {}
    for cat in categories_data:
        if len(cat) >= 2:
            cat_id = cat[0]
            cat_name = cat[1]
            categories_map[cat_id] = cat_name
    
    # Product categories lookup: product_id -> [category_names]
    product_cats_map = {}
    for pc in product_categories_data:
        if len(pc) >= 2:
            prod_id = pc[0]
            cat_id = pc[1]
            if prod_id not in product_cats_map:
                product_cats_map[prod_id] = []
            if cat_id in categories_map:
                product_cats_map[prod_id].append(categories_map[cat_id])
    
    # Images lookup: product_id -> [image_urls]
    product_images_map = {}
    for img in images_data:
        if len(img) >= 5:
            prod_id = img[3]
            url = img[4]
            position = int(img[5]) if len(img) > 5 and img[5] != '\\N' else 999
            
            # Include all images (don't check existence)
            if prod_id not in product_images_map:
                product_images_map[prod_id] = []
            product_images_map[prod_id].append((position, url))
    
    # Sort images by position
    for prod_id in product_images_map:
        product_images_map[prod_id].sort(key=lambda x: x[0])
        product_images_map[prod_id] = [url for _, url in product_images_map[prod_id]]
    
    # Variants lookup: product_id -> [variants]
    product_variants_map = {}
    for var in variants_data:
        if len(var) >= 7:
            var_id = var[0]
            prod_id = var[3]
            var_name = var[4]
            sku = var[5]
            # Set stock to 1 for testing (was 0 in database)
            stock = 1
            active = var[8] if len(var) > 8 else 't'
            
            if prod_id not in product_variants_map:
                product_variants_map[prod_id] = []
            
            product_variants_map[prod_id].append({
                'id': int(var_id),
                'name': var_name,
                'sku': sku,
                'stock': stock,
                'active': active == 't'
            })
    
    # Prices lookup: variant_id -> price
    variant_prices_map = {}
    for price in prices_data:
        if len(price) >= 5:
            var_id = price[3]
            amount = price[4]
            currency = 'Br'  # Changed to Br (Ethiopian Birr)
            
            normalized_price = normalize_price(amount)
            if normalized_price is not None:
                variant_prices_map[var_id] = {
                    'price': normalized_price,
                    'currency': currency
                }
    
    # Build final product catalog
    print("Building product catalog...")
    catalog = []
    skipped_count = 0
    
    for prod in products_data:
        if len(prod) < 5:
            skipped_count += 1
            continue
        
        prod_id = prod[0]
        # Columns: id, created_at, updated_at, title, slug, description, thumbnail, active
        title = prod[3]
        slug = prod[4]
        description = prod[5] if len(prod) > 5 and prod[5] != '\\N' else ""
        thumbnail = prod[6] if len(prod) > 6 and prod[6] != '\\N' else None
        active = prod[7] if len(prod) > 7 else 't'
        
        # Skip products with no title or slug
        if not title or title == '\\N' or not slug or slug == '\\N':
            skipped_count += 1
            if skipped_count <= 5:
                print(f"  Skipping product {prod_id}: title='{title}', slug='{slug}'")
            continue
        
        # Get categories
        cats = product_cats_map.get(prod_id, [])
        
        # Get images
        images = product_images_map.get(prod_id, [])
        
        # Use first image as thumbnail if no thumbnail set
        if not thumbnail or thumbnail == '\\N':
            thumbnail = images[0] if images else None
        
        # Get variants with prices
        variants = []
        for var in product_variants_map.get(prod_id, []):
            var_id_str = str(var['id'])
            price_info = variant_prices_map.get(var_id_str, {})
            
            variants.append({
                'id': var['id'],
                'name': var['name'],
                'sku': var['sku'],
                'price': price_info.get('price'),
                'currency': price_info.get('currency', 'Br'),
                'stock': var['stock']
            })
        
        product = {
            'id': int(prod_id),
            'title': title,
            'slug': slug,
            'description': description,
            'thumbnail': thumbnail,
            'active': active == 't',
            'categories': cats,
            'variants': variants,
            'images': images
        }
        
        catalog.append(product)
    
    # Sort by ID
    catalog.sort(key=lambda x: x['id'])
    
    print(f"Generated {len(catalog)} products ({skipped_count} skipped)")
    print(f"Writing to {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    
    print("Done!")
    print(f"Output saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
