#!/bin/bash

# 🧪 Test Script - Create Subscription with 30 day trial
# Usage: ./test-create-subscription.sh USER_ID AMOUNT

USER_ID=$1
AMOUNT=${2:-150}

if [ -z "$USER_ID" ]; then
  echo "❌ Error: User ID required"
  echo "Usage: ./test-create-subscription.sh USER_ID [AMOUNT]"
  echo ""
  echo "Example: ./test-create-subscription.sh abc-123-def 150"
  exit 1
fi

echo "🚀 Creating subscription..."
echo "  User ID: $USER_ID"
echo "  Amount: ₪$AMOUNT"
echo "  Trial: 30 days"
echo ""

curl -X POST https://www.clearpoint.co.il/api/admin/subscriptions/create \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"planId\": \"basic\",
    \"amount\": $AMOUNT,
    \"trialDays\": 30
  }" | jq '.'

echo ""
echo "✅ Done! Copy the paymentUrl and send to customer."
