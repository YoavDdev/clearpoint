#!/bin/bash

# 🧪 סקריפט לבדיקת חיוב חוזר (מנוי)
# מסמלץ חיוב ובודק שהכל עובד: חשבונית, מייל, עדכון מנוי

USER_ID="467d8618-42bd-468a-bc9d-7220e66f9abc"
BASE_URL="https://www.clearpoint.co.il"

echo "🧪 Simulating recurring payment for user: $USER_ID"
echo ""

# שלח בקשה לסימולציה
curl -X POST "$BASE_URL/api/admin/simulate-recurring-payment" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}" \
  | jq '.'

echo ""
echo "✅ בדוק עכשיו:"
echo "1. Database - רוץ את check-recurring-charge-status.sql"
echo "2. Email - בדוק את תיבת הדואר של הלקוח"
echo "3. Dashboard - /dashboard/invoices"
