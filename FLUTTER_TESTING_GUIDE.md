# Flutter Mobile App - Hero Banner Testing Guide

## Current Status
✅ Code has been updated to fetch hero banner from API
✅ Added debug logging to troubleshoot issues
✅ Handles both response formats (direct string or nested object)

## Why the Banner Might Not Be Changing

### 1. **Image Caching**
CachedNetworkImage caches images aggressively. Even if the URL changes, it might show the cached version.

**Solution:**
- Clear app data/cache
- Uninstall and reinstall the app
- Or use a different image URL

### 2. **App Not Rebuilt**
The code changes need to be compiled into the app.

**Solution:**
```bash
cd mobile
flutter clean
flutter pub get
flutter run
```

### 3. **API Not Returning Banner URL**
The settings might not have a hero banner URL set yet.

**Solution:**
1. Go to https://jsfashion.et/admin/settings
2. Upload or paste a hero banner image URL
3. Click "Save Changes"
4. Restart the mobile app

## Testing Steps

### Step 1: Verify API Response
Test the API endpoint directly:
```bash
curl https://api.jsfashion.et/api/v1/settings
```

Expected response:
```json
{
  "id": 1,
  "store_name": "Luxe Fashion",
  "store_email": null,
  "store_phone": null,
  "currency": "ETB",
  "hero_banner_url": {
    "String": "https://your-image-url.jpg",
    "Valid": true
  },
  "updated_at": "..."
}
```

### Step 2: Set a Hero Banner in Admin
1. Go to https://jsfashion.et/admin/settings
2. In the "Hero Banner Image" field, paste a test image URL, for example:
   ```
   https://images.unsplash.com/photo-1441986300917-64674bd600d8
   ```
3. Click "Save Changes"
4. Verify the API returns the new URL (run curl command again)

### Step 3: Rebuild and Run Mobile App
```bash
cd /Users/gashawarega/Documents/Projects/Js/mobile

# Clean build
flutter clean

# Get dependencies
flutter pub get

# Run on your device/emulator
flutter run

# Or for iOS specifically
flutter run -d ios

# Or for Android specifically
flutter run -d android
```

### Step 4: Check Debug Logs
When the app starts, you should see these logs in the console:
```
🎨 Fetching hero banner from: https://api.jsfashion.et/api/v1/settings
📡 Hero Banner Response Status: 200
📦 Hero Banner Response Body: {...}
🔧 Decoded hero banner data: {...}
🖼️ Extracted banner URL: https://your-image-url.jpg
✅ Hero banner updated to: https://your-image-url.jpg
```

If you see:
- `⚠️ No hero banner URL found in response` - The admin hasn't set a banner yet
- `❌ Error fetching hero banner: ...` - There's a network or parsing error

### Step 5: Force Clear Cache (If Image Still Not Changing)

**Option A: Clear App Data**
- iOS: Delete app and reinstall
- Android: Settings → Apps → JsFashion → Storage → Clear Data

**Option B: Use Different Image URL**
- Upload a completely different image in admin
- The new URL will force CachedNetworkImage to fetch fresh

**Option C: Add Cache Busting**
If you want to force refresh, you can add a timestamp to the URL:
```dart
imageUrl: '$_heroBannerUrl?t=${DateTime.now().millisecondsSinceEpoch}',
```

## Quick Test Checklist

- [ ] Admin settings page loads without errors
- [ ] Hero banner URL is set in admin settings
- [ ] API endpoint returns the banner URL (test with curl)
- [ ] Mobile app code is rebuilt (`flutter clean && flutter run`)
- [ ] Debug logs show banner URL being fetched
- [ ] App is fully restarted (not just hot reload)
- [ ] Cache is cleared if needed

## Common Issues

### Issue: "No hero banner URL found in response"
**Fix:** Set a hero banner in the admin panel first

### Issue: Image shows but it's the old one
**Fix:** Clear app cache or use a different image URL

### Issue: API returns 500 error
**Fix:** Make sure the migration was run on the server

### Issue: App shows default banner even after setting one
**Fix:** Check if the API URL in constants.dart is correct (should be `https://api.jsfashion.et/api/v1`)

## Expected Behavior

1. **On App Launch:**
   - App fetches settings from API
   - If hero_banner_url exists, it updates the banner
   - If not, shows default banner

2. **When Banner Changes:**
   - Admin updates banner in settings
   - Next time app launches, it fetches new banner
   - CachedNetworkImage downloads and caches new image

3. **Offline Behavior:**
   - If API fails, shows default banner
   - If image was cached before, shows cached version

## Next Steps

1. **Run the app** with `flutter run`
2. **Check the console logs** for the debug messages
3. **Share the logs** if the banner still doesn't change
4. **Try a different test image** to rule out caching issues
