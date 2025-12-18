# Hero Banner Management Feature - Deployment Guide

## Overview
Successfully implemented a hero banner management system that allows changing the hero banner from the admin panel. The banner is dynamically fetched and displayed on both web and mobile frontends.

## Changes Made

### Backend
1. **Database Migration** (`backend/sql/migrations/010_add_store_settings.sql`)
   - Created `store_settings` table with fields:
     - `id`, `store_name`, `store_email`, `store_phone`, `currency`
     - **`hero_banner_url`** - New field for hero banner image URL
   - Added default settings row
   - Added update trigger

2. **SQL Queries** (`backend/sql/queries.sql`)
   - Added `GetStoreSettings` query
   - Added `UpdateStoreSettings` query with hero_banner_url parameter

3. **Generated Code** (`backend/internal/repository/queries.sql.go`)
   - Updated `StoreSetting` struct to include `HeroBannerUrl`
   - Updated `UpdateStoreSettingsParams` to include `HeroBannerUrl`
   - Updated query functions to handle hero banner field

4. **Settings Handler** (`backend/internal/handlers/settings_handler.go`)
   - Updated `UpdateSettingsRequest` to include `HeroBannerUrl`
   - Updated `UpdateSettings` handler to process and save hero banner URL

### Frontend (Web)
1. **Admin Settings Page** (`frontend/app/admin/settings/page.tsx`)
   - Added `hero_banner_url` field to form state
   - Added image picker with MediaPicker component integration
   - Added image preview for selected banner
   - Updated API calls to include hero_banner_url

2. **Home Page** (`frontend/app/(shop)/page.tsx`)
   - Added state for `heroBannerUrl` with default fallback
   - Added API call to fetch hero banner from settings
   - Updated hero section to use dynamic banner URL instead of hardcoded path

### Mobile (Flutter)
1. **Home Screen** (`mobile/lib/screens/home_screen.dart`)
   - Added `_heroBannerUrl` state variable with default value
   - Added `_fetchHeroBanner()` method to fetch banner from settings API
   - Updated `CachedNetworkImage` to use dynamic `_heroBannerUrl`
   - Banner fetches on app initialization

### Deployment
1. **Deployment Script** (`deploy_hero_banner.sh`)
   - Automated deployment script for the feature
   - Pulls latest code from git
   - Runs database migration
   - Rebuilds backend and frontend services

## Server Deployment Commands

### Option 1: Using the Deployment Script (Recommended)
```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to project directory
cd /opt/jsfashion

# Pull the latest code
git pull origin main

# Run the deployment script
chmod +x deploy_hero_banner.sh
./deploy_hero_banner.sh
```

### Option 2: Manual Deployment
```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to project directory
cd /opt/jsfashion

# Pull latest changes
git pull origin main

# Run database migration
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres -d jsfashion < backend/sql/migrations/010_add_store_settings.sql

# Rebuild and restart backend
docker-compose -f docker-compose.prod.yml up -d --build backend

# Rebuild and restart frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

## How to Use

### Admin Panel
1. Go to `https://jsfashion.et/admin/settings`
2. Login with admin credentials
3. Scroll to "Hero Banner Image" field
4. Either:
   - Paste an image URL directly, OR
   - Click "Select Image" to choose from media library
5. Preview the image
6. Click "Save Changes"

### Frontend
- Visit `https://jsfashion.et`
- The hero banner will automatically display the image set in admin settings
- Falls back to default `/hero-bg.jpg` if no banner is set

### Mobile App
- The mobile app will automatically fetch the hero banner on launch
- No app update required - it fetches dynamically from the API
- Falls back to default banner if API call fails

## Testing
1. **Test Admin Upload**: Upload a new hero banner image via admin panel
2. **Test Web Frontend**: Visit homepage and verify new banner displays
3. **Test Mobile App**: Launch mobile app and verify banner updates
4. **Test Fallback**: Remove hero banner URL and verify default banner shows

## Rollback (if needed)
```bash
# SSH into server
ssh root@your-server-ip
cd /opt/jsfashion

# Revert to previous commit
git revert HEAD
git push origin main

# Rebuild services
docker-compose -f docker-compose.prod.yml up -d --build
```

## Notes
- Hero banner URL is stored in database, not in environment variables
- Image can be uploaded via admin media library or external URL
- Mobile app fetches banner on every app launch (cached by CachedNetworkImage)
- Web frontend fetches banner on page load
- Default fallback ensures site always has a hero image

## Support
If you encounter any issues:
1. Check docker logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verify database migration ran: `docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d jsfashion -c "SELECT * FROM store_settings;"`
3. Check API endpoint: `curl https://api.jsfashion.et/api/v1/settings`
