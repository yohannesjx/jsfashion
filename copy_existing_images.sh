#!/bin/bash
# Script to copy existing product images from frontend public/images to backend uploads

echo "=========================================="
echo "COPYING EXISTING PRODUCT IMAGES"
echo "=========================================="
echo ""

echo "Step 1: Creating uploads directory in backend..."
docker-compose -f docker-compose.prod.yml exec backend mkdir -p /app/uploads
echo "✓ Directory created"
echo ""

echo "Step 2: Copying images from frontend public/images to backend uploads..."

# Copy all images from frontend container to backend container
docker cp jsfashion_frontend:/app/public/images/. /tmp/product_images/ 2>/dev/null || {
    echo "Trying alternative path..."
    docker cp jsfashion_frontend:/app/.next/standalone/public/images/. /tmp/product_images/ 2>/dev/null || {
        echo "✗ Could not find images in frontend container"
        echo ""
        echo "Let's try copying from local directory..."
        
        # If frontend container doesn't have them, copy from local
        if [ -d "./frontend/public/images" ]; then
            cp -r ./frontend/public/images/* /tmp/product_images/ 2>/dev/null
            echo "✓ Copied from local frontend/public/images"
        else
            echo "✗ No images found in ./frontend/public/images"
            exit 1
        fi
    }
}

# Count files
COUNT=$(ls -1 /tmp/product_images 2>/dev/null | wc -l)
echo "Found $COUNT image files"
echo ""

if [ $COUNT -eq 0 ]; then
    echo "No images to copy!"
    exit 1
fi

echo "Step 3: Copying images to backend container..."
docker cp /tmp/product_images/. jsfashion_backend:/app/uploads/

if [ $? -eq 0 ]; then
    echo "✓ Successfully copied $COUNT images to backend uploads"
else
    echo "✗ Failed to copy images"
    exit 1
fi

echo ""

echo "Step 4: Setting permissions..."
docker-compose -f docker-compose.prod.yml exec backend chmod -R 755 /app/uploads
echo "✓ Permissions set"
echo ""

echo "Step 5: Cleaning up temporary files..."
rm -rf /tmp/product_images
echo "✓ Cleanup complete"
echo ""

echo "=========================================="
echo "COPY COMPLETE!"
echo "=========================================="
echo "Copied $COUNT images to backend uploads"
echo "Images are now in the Media Library!"
echo "=========================================="
