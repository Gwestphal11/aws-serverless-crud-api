#!/bin/bash

API_URL="https://v2jzt9n4q7.execute-api.us-east-1.amazonaws.com/prod"

echo "=== CRUD Operations Test ==="
echo ""

# CREATE - POST /items
echo "1. CREATE: Creating a new item (POST /items)"
NEW_ITEM=$(curl -s -X POST "${API_URL}/items" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test CRUD Item"}')
echo "$NEW_ITEM"
echo ""

# Extract the ID from the created item
ITEM_ID=$(echo $NEW_ITEM | grep -oE '"id":\s*"[^"]+"' | grep -oE '[0-9a-f-]{36}')
if [ -z "$ITEM_ID" ]; then
  echo "❌ Failed to create item, aborting test."
  exit 1
fi
echo "✅ Created item with ID: $ITEM_ID"
echo ""

# READ - GET /items/{id}
echo "2. READ: Getting the item (GET /items/${ITEM_ID})"
GET_ITEM=$(curl -s -X GET "${API_URL}/items/${ITEM_ID}")
echo "$GET_ITEM"
echo ""

# UPDATE - PUT /items/{id}
echo "3. UPDATE: Updating the item (PUT /items/${ITEM_ID})"
UPDATED_ITEM=$(curl -s -X PUT "${API_URL}/items/${ITEM_ID}" \
  -H "Content-Type: application/json" \
  -d '{"message":"Updated CRUD Item"}')
echo "$UPDATED_ITEM"
echo ""

# Verify the update by reading again
echo "4. READ: Verifying update (GET /items/${ITEM_ID})"
VERIFY_UPDATE=$(curl -s -X GET "${API_URL}/items/${ITEM_ID}")
echo "$VERIFY_UPDATE"
echo ""

# DELETE - DELETE /items/{id}
echo "5. DELETE: Deleting the item (DELETE /items/${ITEM_ID})"
DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/items/${ITEM_ID}")
echo "$DELETE_RESPONSE"
echo ""

# Verify deletion
echo "6. VERIFY: Confirming deletion (GET /items/${ITEM_ID})"
VERIFY_DELETE=$(curl -s -X GET "${API_URL}/items/${ITEM_ID}")
echo "$VERIFY_DELETE"
echo ""

# Check if item is really gone (should return 404 or error)
if echo "$VERIFY_DELETE" | grep -q "not found"; then
  echo "✅ Item successfully deleted"
else
  echo "⚠️  Item may still exist or endpoint returned unexpected response"
fi

echo ""
echo "✅ All CRUD operations completed."
