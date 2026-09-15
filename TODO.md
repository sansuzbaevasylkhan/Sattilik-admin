# TODO
- [x] Fix send-code auth code sending (Telegram) & driver profile save
- [x] Telegram webhook chat_id binding (users.telegram_chat_id)
- [x] Admin function: list-registrations Edge Function (Supabase REST + admin)
- [x] RLS note: PATCH users (Edge Function only via service_role)
- [ ] (Next) Deploy Edge Functions and set Supabase secrets:
      supabase secrets set TELEGRAM_BOT_TOKEN=8914952811:AAGJkrp68oSYzn3NYaguEP1mj93T5B6LWoU
      supabase secrets set TELEGRAM_BOT_USERNAME=<нақты @username, BotFather-дан>
      supabase secrets set TELEGRAM_WEBHOOK_SECRET=<random>
      supabase secrets set ADMIN_SECRET=<admin_password>
- [ ] (Next) Apply new migration 20260715000000_admin_list_users_and_update_rls.sql
- [ ] (Next) Set Telegram webhook:
      https://api.telegram.org/bot<TOKEN>/setWebhook?url=<FUNCTION_URL>&secret_token=<TELEGRAM_WEBHOOK_SECRET>

- [ ] Test: passenger registration flow.
- [ ] Test: driver registration flow (role=driver).

