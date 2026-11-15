# Telegram тіркелу + Admin — орнату нұсқаулығы

Ағымдағы бот: **@sattiliktaxiappcodebot** (BotFather → `/setusername`).
Бот атауы кодта қатты жазылмайды: frontend `EXPO_PUBLIC_TELEGRAM_BOT_USERNAME`,
Edge Functions `TELEGRAM_BOT_USERNAME` secret-інен оқиды.

## 1) Supabase secrets орнату

```bash
# BotFather берген токен (репозиторийге жазбаңыз)
supabase secrets set TELEGRAM_BOT_TOKEN=<BOT_TOKEN_FROM_BOTFATHER>

# BotFather-дағы @username-мен дәл бірдей болуы керек
supabase secrets set TELEGRAM_BOT_USERNAME=sattiliktaxiappcodebot

# Webhook қауіпсіздігі (кездейсоқ ұзын жол)
supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)

# /admin командасына рұқсат берілген телефон
supabase secrets set ADMIN_PHONE=+7XXXXXXXXXX
supabase secrets set ADMIN_SECRET=<admin құпия сөзі>

# telegram-notify үшін админ-топ ID-і (бот сол топқа мүше болуы керек)
supabase secrets set TELEGRAM_GROUP_ID=<telegram group id>

# admin-reset-telegram-links үшін
supabase secrets set RESET_TELEGRAM_LINKS_SECRET=<кездейсоқ жол>
```

## 2) Edge Functions-ты deploy ету

```bash
supabase functions deploy send-code
supabase functions deploy verify-code
supabase functions deploy telegram-webhook
supabase functions deploy admin-list-registrations
supabase functions deploy telegram-notify
supabase functions deploy admin-reset-telegram-links
```

## 3) Frontend env

`.env` және `eas.json` ішінде бірдей мән болуы керек:

```env
EXPO_PUBLIC_TELEGRAM_BOT_USERNAME=sattiliktaxiappcodebot
```

`EXPO_PUBLIC_*` мәні build кезінде bundle-ге кіреді — өзгерткеннен кейін
қосымшаны қайта build ету керек (Expo Go кэшін де жаңартыңыз).

## 4) Telegram webhook-ты тіркеу

```bash
export TELEGRAM_BOT_TOKEN='<BOT_TOKEN_FROM_BOTFATHER>'

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yqwtxwxgsvhapqasfmud.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET мәні>",
    "allowed_updates": ["message"]
  }'

# Тексеру
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

`secret_token` = Supabase-тағы `TELEGRAM_WEBHOOK_SECRET` мәнімен дәл бірдей болуы керек.

## 5) Ескі боттан қалған chat_id-лерді тазалау

Жаңа бот ескі `telegram_chat_id` мәндеріне хабарлама жібере алмайды.
Бұл — **қолмен** орындалатын әрекет:

- SQL: `supabase/sql/reset_telegram_chat_ids_sattiliktaxi.sql`
  (әдепкі бойынша `ROLLBACK`-пен аяқталады; тек рұқсат берілгенде `COMMIT`),
- немесе Edge Function:
  `POST https://yqwtxwxgsvhapqasfmud.supabase.co/functions/v1/admin-reset-telegram-links?secret=<RESET_TELEGRAM_LINKS_SECRET>`

## 6) Тіркелу ағынын тексеру

1. Қосымшада телефон + ат + тегі + рөл енгізіп «Код жіберу» басыңыз.
2. «Telegram-ты ашу» батырмасы `https://t.me/sattiliktaxiappcodebot?start=7...` ашуы керек.
3. Ботқа «Start» басыңыз — `users.telegram_chat_id` жазылып, 4 цифрлық код келеді.
4. Кодты қосымшаға енгізіп растаңыз.
5. `/admin` тек `ADMIN_PHONE` нөмірімен байланысқан чатқа жауап береді.

## 7) Жиі кездесетін қателіктер

| Қателік | Себебі | Шешімі |
|---------|--------|--------|
| `TELEGRAM_BOT_TOKEN is not configured` | secret орнатылмаған | `supabase secrets set TELEGRAM_BOT_TOKEN=...` |
| `TELEGRAM_BOT_USERNAME is not configured` | username secret жоқ | `supabase secrets set TELEGRAM_BOT_USERNAME=sattiliktaxiappcodebot` |
| Сілтеме ескі ботты ашады | Supabase-тегі username secret ескі, немесе қосымша ескі build | secret-ті жаңартып, `send-code`-ты қайта deploy етіп, қосымшаны қайта build етіңіз |
| `unauthorized` (webhook) | `secret_token` сәйкес емес | setWebhook-тегі secret = Supabase-тағы `TELEGRAM_WEBHOOK_SECRET` |
| Код келмейді | пайдаланушы жаңа ботқа /start баспаған немесе chat_id ескі | тазалау скриптін орындап, қайта /start жасаңыз |
| `users_telegram_chat_id_key` (unique violation) | бір chat_id бірнеше адамға байланған | әр адам өз Telegram аккаунтынан /start жасауы керек |
| telegram-notify хабарлама жібермейді | бот `TELEGRAM_GROUP_ID` тобына мүше емес | жаңа ботты админ-топқа қосыңыз |
