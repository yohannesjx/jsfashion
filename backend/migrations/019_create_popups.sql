-- Create popups table for marketing campaigns
CREATE TABLE IF NOT EXISTS popups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    action_type VARCHAR(50), -- 'link', 'product', 'category', 'none'
    action_target TEXT,       -- URL or ID
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    frequency VARCHAR(50) DEFAULT 'once_per_session', -- 'once_per_session', 'once_per_day', 'always'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster retrieval of active popups based on date ranges
CREATE INDEX IF NOT EXISTS idx_popups_active_date ON popups(is_active, start_date, end_date);
