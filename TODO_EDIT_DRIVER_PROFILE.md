TODO - Fix auth code sending (Telegram) & driver profile save

## Step 1
- Update `supabase/functions/send-code/index.ts`:
  - If `getBotChatId()` returns null => return 500 with clear message: Telegram chat_id not found (send bot message first)
  - If `sendMessage` fails => return 500 with Telegram error details
  - Keep inserting code into `verification_codes` as currently done, but clearly report messaging failure.

## Step 2
- (Optional after Step 1) Improve `verify-code` error detail if still needed.

