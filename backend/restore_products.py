import json
import uuid

INPUT_FILE = 'backend/products_catalog.json'
OUTPUT_FILE = 'backend/restore_data.sql'

def escape_sql_string(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def main():
    print(f"Reading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Found {len(data)} products.")
    
    sql_statements = []
    
    # Clear existing data (optional, but good for clean restore)
    # sql_statements.append("TRUNCATE TABLE products CASCADE;")
    # We won't truncate to avoid destroying other data, but we will use ON CONFLICT
    
    for product in data:
        p_id = product.get('id')
        title = product.get('title')
        slug = product.get('slug')
        description = product.get('description', '')
        thumbnail = product.get('thumbnail')
        active = product.get('active', True)
        
        # Calculate base_price from variants
        variants = product.get('variants', [])
        base_price = 0
        if variants:
            prices = [v.get('price', 0) for v in variants if v.get('price') is not None]
            if prices:
                base_price = min(prices)
        
        # Insert Product
        sql_statements.append(
            f"INSERT INTO products (id, title, slug, description, thumbnail, active, base_price) "
            f"VALUES ({p_id}, {escape_sql_string(title)}, {escape_sql_string(slug)}, "
            f"{escape_sql_string(description)}, {escape_sql_string(thumbnail)}, {active}, {base_price}) "
            f"ON CONFLICT (id) DO UPDATE SET "
            f"title = EXCLUDED.title, slug = EXCLUDED.slug, description = EXCLUDED.description, "
            f"thumbnail = EXCLUDED.thumbnail, active = EXCLUDED.active, base_price = EXCLUDED.base_price;"
        )
        
        # Insert Variants
        for variant in variants:
            # Generate a deterministic UUID based on SKU or just a random one?
            # Since we are inserting fresh, we can generate a random one.
            # But if we run this multiple times, we might create duplicates if we don't handle conflicts.
            # SKU is unique in DB.
            
            sku = variant.get('sku')
            name = variant.get('name')
            stock = variant.get('stock', 0)
            price = variant.get('price', 0)
            currency = variant.get('currency', 'Br')
            
            # We need to handle the UUID. 
            # We can use a CTE or just let Postgres generate it and look it up?
            # Or better: Generate UUID in Python.
            v_uuid = str(uuid.uuid4())
            
            # We try to insert. If SKU exists, we should probably update it or do nothing.
            # But we need the ID for the price insert.
            # If we use ON CONFLICT (sku) DO UPDATE ... RETURNING id, we can get the ID.
            # But we are generating a SQL script, not running it interactively.
            
            # Strategy: Use a DO block or assume clean state?
            # Or: Use the SKU to look up the variant ID for the price insert?
            # "INSERT INTO prices (variant_id, ...) SELECT id, ... FROM product_variants WHERE sku = '...'"
            
            sql_statements.append(
                f"INSERT INTO product_variants (product_id, sku, size, color, stock_quantity, price_adjustment, active, image) "
                f"VALUES ({p_id}, {escape_sql_string(sku)}, {escape_sql_string(name)}, NULL, {stock}, 0, true, NULL) "
                f"ON CONFLICT (sku) DO UPDATE SET "
                f"stock_quantity = EXCLUDED.stock_quantity, "
                f"size = EXCLUDED.size, "
                f"active = EXCLUDED.active;"
            )
            
            # Insert Price
            # We link by SKU since we don't know the UUID if it already existed
            sql_statements.append(
                f"INSERT INTO prices (variant_id, amount, currency) "
                f"SELECT id, {price}, {escape_sql_string(currency)} "
                f"FROM product_variants WHERE sku = {escape_sql_string(sku)} "
                f"AND NOT EXISTS (SELECT 1 FROM prices WHERE variant_id = product_variants.id);"
            )

        # Insert Images
        images = product.get('images', [])
        for i, img_url in enumerate(images):
            sql_statements.append(
                f"INSERT INTO product_images (product_id, url, position) "
                f"VALUES ({p_id}, {escape_sql_string(img_url)}, {i}) "
                f"ON CONFLICT DO NOTHING;" # Assuming no unique constraint on url/product_id, but good practice
            )

    # Reset sequence for products table
    sql_statements.append("SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));")

    print(f"Generating SQL script with {len(sql_statements)} statements...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    
    print(f"Done! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
