-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment Accounts Table for Dynamic Bank Account Management
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name VARCHAR(100) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_type VARCHAR(50), -- 'CBE', 'Telebirr', 'Awash', etc.
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_accounts_active ON payment_accounts(is_active, display_order);

-- Insert default accounts (migrate from hardcoded values)
INSERT INTO payment_accounts (bank_name, account_name, account_number, account_type, display_order) VALUES
('Commercial Bank of Ethiopia', 'Js Fashion', '1000484381047', 'CBE', 1),
('TeleBirr', 'Js Fashion', '0912345678', 'Telebirr', 2)
ON CONFLICT DO NOTHING;
