#!/usr/bin/env python3
import re
import uuid
import psycopg2
from psycopg2.extras import execute_values
import sys

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="luxe_db",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

# Read import.sql
with open('backend/import.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract products
products_match = re.search(r'COPY public\.products.*?\n(.*?)\n\\\.', content, re.DOTALL)
if not products_match:
    print("Could not find products data")
    sys.exit(1)

products_data = products_match.group(1)
products_lines = [l.strip() for l in products_data.strip().split('\n') if l.strip()]

# Extract variants
variants_match = re.search(r'COPY public\.variants.*?\n(.*?)\n\\\.', content, re.DOTALL)
variants_lines = []
if variants_match:
    variants_data = variants_match.group(1)
    variants_lines = [l.strip() for l in variants_data.strip().split('\n') if l.strip()]

# Extract images
images_match = re.search(r'COPY public\.product_images.*?\n(.*?)\n\\\.', content, re.DOTALL)
images_lines = []
if images_match:
    images_data = images_match.group(1)
    images_lines = [l.strip() for l in images_data.strip().split('\n') if l.strip()]

print(f"Found {len(products_lines)} products, {len(variants_lines)} variants, {len(images_lines)} images")

# Parse and import products
product_id_map = {}  # old_id -> new_uuid
products_to_insert = []

for line in products_lines:
    parts = line.split('\t')
    if len(parts) < 8:
        continue
    
    old_id = int(parts[0])
    created_at = parts[1]
    updated_at = parts[2]
    title = parts[3]
    slug = parts[4]
    description = parts[5] if len(parts) > 5 else ''
    thumbnail = parts[6] if len(parts) > 6 else ''
    active = parts[7] == 't' if len(parts) > 7 else True
    
    new_id = str(uuid.uuid4())
    product_id_map[old_id] = new_id
    
    # Set default price (we'll need to get from variants later)
    base_price = "0.00"
    
    products_to_insert.append((
        new_id,
        title,  # name
        description if description else None,  # description
        base_price,  # base_price
        None,  # category
        thumbnail if thumbnail else None,  # image_url
        active  # is_active
    ))

print(f"Prepared {len(products_to_insert)} products for import")

# Import products
execute_values(
    cur,
    """INSERT INTO products (id, name, description, base_price, category, image_url, is_active)
       VALUES %s""",
    products_to_insert
)
conn.commit()
print(f"Imported {len(products_to_insert)} products")

# Parse and import variants (to get prices)
variant_id_map = {}  # old_variant_id -> new_uuid
variants_to_insert = []
variant_prices = {}  # product_id -> price

for line in variants_lines:
    parts = line.split('\t')
    if len(parts) < 8:
        continue
    
    old_variant_id = int(parts[0])
    created_at = parts[1]
    updated_at = parts[2]
    old_product_id = int(parts[3]) if parts[3] else None
    name = parts[4]  # variant name like "S", "M", "L"
    sku = parts[5]
    image = parts[6] if len(parts) > 6 else ''
    stock = int(parts[7]) if len(parts) > 7 and parts[7] else 0
    active = parts[8] == 't' if len(parts) > 8 else True
    
    if old_product_id not in product_id_map:
        continue
    
    new_product_id = product_id_map[old_product_id]
    new_variant_id = str(uuid.uuid4())
    variant_id_map[old_variant_id] = new_variant_id
    
    # Extract size from name (e.g., "Wide Leg Pearl Detail Jeans S" -> "S")
    size = name.split()[-1] if name else None
    if size and len(size) <= 10:
        size = size
    else:
        size = None
    
    # Default price adjustment
    price_adjustment = "0.00"
    
    variants_to_insert.append((
        new_variant_id,
        new_product_id,
        sku,
        size,  # size
        None,  # color
        price_adjustment,  # price_adjustment
        stock  # stock_quantity
    ))

print(f"Prepared {len(variants_to_insert)} variants for import")

# Import variants
if variants_to_insert:
    execute_values(
        cur,
        """INSERT INTO product_variants (id, product_id, sku, size, color, price_adjustment, stock_quantity)
           VALUES %s""",
        variants_to_insert
    )
    conn.commit()
    print(f"Imported {len(variants_to_insert)} variants")

# Parse and import images
images_to_insert = []

for line in images_lines:
    parts = line.split('\t')
    if len(parts) < 6:
        continue
    
    old_image_id = int(parts[0])
    created_at = parts[1]
    updated_at = parts[2]
    old_product_id = int(parts[3]) if parts[3] else None
    url = parts[4] if len(parts) > 4 else ''
    position = int(parts[5]) if len(parts) > 5 and parts[5] else 0
    
    if old_product_id not in product_id_map or not url:
        continue
    
    new_product_id = product_id_map[old_product_id]
    new_image_id = str(uuid.uuid4())
    
    images_to_insert.append((
        new_image_id,
        new_product_id,
        url,
        None,  # alt_text
        position  # display_order
    ))

print(f"Prepared {len(images_to_insert)} images for import")

# Import images
if images_to_insert:
    execute_values(
        cur,
        """INSERT INTO product_images (id, product_id, url, alt_text, display_order)
           VALUES %s""",
        images_to_insert
    )
    conn.commit()
    print(f"Imported {len(images_to_insert)} images")

cur.close()
conn.close()
print("Import completed successfully!")

