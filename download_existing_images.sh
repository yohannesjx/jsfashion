#!/bin/bash
# Script to download existing product images and save them to uploads directory

echo "=========================================="
echo "DOWNLOADING EXISTING PRODUCT IMAGES"
echo "=========================================="
echo ""

# Get all unique image URLs from database
echo "Step 1: Getting image URLs from database..."
IMAGE_URLS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U jsfashion -d jsfashion -t -c "
SELECT DISTINCT image_url 
FROM (
    SELECT image_url FROM products WHERE image_url IS NOT NULL
    UNION
    SELECT image_url FROM product_variants WHERE image_url IS NOT NULL
) AS all_images
WHERE image_url LIKE 'https://%';
" | tr -d ' ')

echo "Found $(echo "$IMAGE_URLS" | wc -l) unique image URLs"
echo ""

# Create uploads directory in backend container
echo "Step 2: Creating uploads directory..."
docker-compose -f docker-compose.prod.yml exec backend mkdir -p /app/uploads
echo "✓ Directory created"
echo ""

# Download each image
echo "Step 3: Downloading images..."
COUNT=0
FAILED=0

for URL in $IMAGE_URLS; do
    if [ ! -z "$URL" ]; then
        # Extract filename from URL
        FILENAME=$(basename "$URL")
        
        # Download to backend container
        docker-compose -f docker-compose.prod.yml exec backend sh -c "wget -q -O /app/uploads/$FILENAME '$URL' 2>/dev/null"
        
        if [ $? -eq 0 ]; then
            COUNT=$((COUNT + 1))
            echo "✓ Downloaded: $FILENAME"
        else
            FAILED=$((FAILED + 1))
            echo "✗ Failed: $FILENAME"
        fi
    fi
done

echo ""
echo "=========================================="
echo "DOWNLOAD COMPLETE!"
echo "=========================================="
echo "Successfully downloaded: $COUNT images"
echo "Failed: $FAILED images"
echo ""
echo "Images are now in the Media Library!"
echo "=========================================="
