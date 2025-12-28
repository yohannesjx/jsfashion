# Flutter Performance Testing Guide

## Current Issue
Splash screen takes 10+ seconds on iPhone but only 2-3 seconds on simulator.

## Root Cause
You're running in **DEBUG MODE** on the device, which is much slower.

## Solution: Test in Release Mode

### Option 1: Quick Test (Recommended)
```bash
cd mobile
flutter run --release
```

### Option 2: Build and Install via Xcode
```bash
cd mobile
flutter build ios --release
open ios/Runner.xcworkspace
```

Then in Xcode:
1. Select your device
2. Product → Scheme → Edit Scheme
3. Change "Build Configuration" to "Release"
4. Run (⌘R)

## Performance Comparison

### Debug Mode (Current)
- Simulator: 2-3 seconds ✅
- iPhone: 10+ seconds ❌
- **Why:** Debug overhead, JIT compilation, hot reload

### Release Mode (What Users Get)
- Simulator: 1-2 seconds ✅
- iPhone: 2-3 seconds ✅
- **Why:** AOT compiled, optimized, no debug tools

## Verify Release Mode

When running in release mode, you'll see:
```
Running Gradle task 'assembleRelease'...
✓ Built build/ios/iphoneos/Runner.app (release mode)
```

## Expected Results

After running in release mode:
- **First launch:** 2-3 seconds (network fetch)
- **Subsequent launches:** < 1 second (cached data)

## Still Slow?

If it's still slow in release mode, check:

1. **Network Speed:**
   ```bash
   # Test API speed
   time curl https://api.jsfashion.et/api/v1/products
   ```

2. **Device Storage:**
   - Low storage can slow down app startup
   - Check iPhone storage settings

3. **iOS Version:**
   - Older iOS versions may be slower
   - Update to latest iOS if possible

## Production Build

For App Store submission:
```bash
flutter build ipa --release
```

This creates the optimized .ipa file for distribution.
