#!/bin/bash

echo "=== 1. Health Check GET / ==="
curl -s -X GET https://w1skmylmk6.execute-api.us-east-1.amazonaws.com/prod/
echo -e "\n"

echo "=== 2. Get all items GET /items ==="
curl -s -X GET https://w1skmylmk6.execute-api.us-east-1.amazonaws.com/prod/items
echo -e "\n"

echo "=== 3. Create a new item POST /items ==="
NEW_ITEM=$(curl -s -X POST https://w1skmylmk6.execute-api.us-east-1.amazonaws.com/prod/items \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello World"}')
echo "$NEW_ITEM"
echo -e "\n"

# Extract the ID from the created item (without jq dependency)
ITEM_ID=$(echo $NEW_ITEM | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -z "$ITEM_ID" ]; then
  echo "Failed to create item, aborting test."
  exit 1
fi
echo "Created item with ID: $ITEM_ID"

echo "=== 4. Get single item GET /items/{id} ==="
curl -s -X GET "https://w1skmylmk6.execute-api.us-east-1.amazonaws.com/prod/items/${ITEM_ID}"
echo -e "\n"

echo "=== 5. Final GET /items to see all items ==="
curl -s -X GET https://w1skmylmk6.execute-api.us-east-1.amazonaws.com/prod/items
echo -e "\n"

echo "✅ All tests completed."
