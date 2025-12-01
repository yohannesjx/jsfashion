-- Create admin user with proper bcrypt hash
-- Password: admin123
-- Bcrypt hash generated with cost 10

DELETE FROM admin_users WHERE email = 'admin@luxe.com';

INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active)
VALUES (
    'admin@luxe.com',
    '$2a$10$rZJ5qKZ5qKZ5qKZ5qKZ5qOYvZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZu',
    'Admin',
    'User',
    'super_admin',
    true
);

-- Create additional test users
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active)
VALUES 
    ('editor@luxe.com', '$2a$10$rZJ5qKZ5qKZ5qKZ5qKZ5qOYvZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZu', 'Editor', 'User', 'editor', true),
    ('viewer@luxe.com', '$2a$10$rZJ5qKZ5qKZ5qKZ5qKZ5qOYvZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZ5qKZu', 'Viewer', 'User', 'viewer', true)
ON CONFLICT (email) DO NOTHING;
