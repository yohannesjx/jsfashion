-- Fix inventory_movements schema to match code expectations
DROP TABLE IF EXISTS inventory_movements;

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id),
    type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_id VARCHAR(100),
    note TEXT,
    user_id BIGINT, -- Keep as bigint to match admin_users if needed, or null
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_inventory_movements_variant_id ON inventory_movements(variant_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
