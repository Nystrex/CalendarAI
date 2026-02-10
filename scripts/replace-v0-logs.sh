#!/bin/bash
# Replace all [v0] with [CalendarAI] in server logs

files=(
  "app/api/ai/extract-events/route.ts"
  "app/api/auth/check-email/route.ts"
  "app/api/auth/google/route.ts"
  "app/api/google/auto-sync/route.ts"
  "app/api/google/calendars/create/route.ts"
  "app/api/google/disconnect/route.ts"
  "app/api/google/events/delete/route.ts"
  "app/api/google/events/update/route.ts"
  "app/api/homework/chat/route.ts"
  "app/api/stripe/checkout/route.ts"
  "app/auth/sign-up/page.tsx"
  "components/admin/admin-panel.tsx"
  "components/events/ai-event-extractor.tsx"
  "components/events/calendar-dialog.tsx"
  "components/events/event-details-dialog.tsx"
  "components/events/event-dialog.tsx"
  "components/events/mark-as-done-dialog.tsx"
  "components/events/mass-event-dialog.tsx"
  "components/homework/homework-chat.tsx"
  "components/homework/homework-workspace.tsx"
  "components/integrations/google-calendar-connect.tsx"
  "lib/themes.ts"
  "lib/google/calendar-api.ts"
  "proxy.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    sed -i 's/\[v0\]/[CalendarAI]/g' "$file"
    echo "Updated: $file"
  fi
done

echo "All [v0] occurrences replaced with [CalendarAI]"
