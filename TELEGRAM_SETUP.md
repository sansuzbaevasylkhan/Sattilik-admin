# Telegram тіркелу + Admin — орнату нұсқаулығы

## 1) Supabase CLI-мен secrets орнату

```bash
# Жоба қалтасынан
cd "C:\Users\Admin\Desktop\менің проектім\askdrv taxi app"

# Бот токені (сіз бердіңіз)
supabase secrets set TELEGRAM_BOT_TOKEN=8914952811:AAGJkrp68oSYzn3NYaguEP1mj93T5B6LWoU

# Бот @username (BotFather-да /setusername арқылы берілген)
# Қазір AsqDrvBot деп қалдырылған
supabase secrets set TELEGRAM_BOT_USERNAME=AsqDrvBot

# Webhook қауіпсіздігі (кез келген ұзын кездейсоқ жол)
supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Admin кілті (сіздің құпия сөзіңіз)
supabase secrets set ADMIN_SECRET=AsqDrv-Admin-2026
```

## 2) Edge Functions-ты deploy ету

```bash
supabase functions deploy send-code
supabase functions deploy verify-code
supabase functions deploy telegram-webhook
supabase functions deploy admin-list-registrations
```

## 3) Миграцияны қолдану

```bash
supabase db push
# немесе жаңа миграцияны жеке:
supabase migration up
```

## 4) Telegram webhook-ты тіркеу

```bash
# Токен + webhook URL + secret_token
# Жоба ID: yqwtxwxgsvhapqasfmud
# Webhook URL форматы:
# https://yqwtxwxgsvhapqasfmud.supabase.co/functions/v1/telegram-webhook

curl -X POST "https://api.telegram.org/bot8914952811:AAGJkrp68oSYzn3NYaguEP1mj93T5B6LWoU/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yqwtxwxgsvhapqasfmud.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET мәні>",
    "allowed_updates": ["message"]
  }'
```

`secret_token`-ды жоғарыда `supabase secrets set TELEGRAM_WEBHOOK_SECRET=...` арқылы
орнатқан **дәл сол мәнмен** ауыстырыңыз. Бірдей болуы керек.

## 5) Тексеру

### Тіркелу сілтемесі:
1. `app/register.tsx` ашыңыз.
2. Телефон + ат + тегі + рөл енгізіп "Код жіберу" басыңыз.
3. Telegram сілтемесі ашылады → "Start" басыңыз.
4. Чатқа 4 цифрлық код келеді.
5. Аппқа кодты енгізіп растаңыз.

### Admin тексеру:
```bash
curl "https://yqwtxwxgsvhapqasfmud.supabase.co/functions/v1/admin-list-registrations?secret=AsqDrv-Admin-2026" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxd3R4d3hnc3ZoYXBxYXNmbXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxODA4NjAsImV4cCI6MjA5Mjc1Njg2MH0.Als6PgdXN92Bm2Xvv5K-rupAu1xmwKNDbf646PaJBCI"
```

Қайтаратыны:
```json
{
  "success": true,
  "users": [
    {
      "id": "...",
      "phone": "+77001234567",
      "first_name": "Асан",
      "last_name": "Үсенов",
      "role": "passenger",
      "telegram_chat_id": "7892697980",
      "telegram_linked": true,
      "created_at": "2026-07-15T..."
    }
  ],
  "pending_codes": [...],
  "counts": {
    "users_total": 12,
    "users_telegram_linked": 8,
    "users_passenger": 7,
    "users_driver": 5,
    "pending_codes": 1
  }
}
```

## 6) Жиі кездесетін қателіктер

| Қателік | Себебі | Шешімі |
|---------|--------|--------|
| `TELEGRAM_BOT_TOKEN is not configured` | secrets орнатылмаған | `supabase secrets set TELEGRAM_BOT_TOKEN=...` |
| `unauthorized` (webhook) | `secret_token` сәйкес емес | Telegram-да setWebhook кезіндегі secret_token = Supabase-тағы TELEGRAM_WEBHOOK_SECRET |
| `users_telegram_chat_id_key` (unique violation) | бір chat_id бірнеше адам байланыстырған | әр адам өз Telegram аккаунтынан /start жасауы керек |
| Сілтеме дұрыс емес | TELEGRAM_BOT_USERNAME қате | BotFather-да /setusername тексеріп, .env пен Supabase secret-та бірдей жазыңыз |
| Код келмейді | ботқа /start жасалмаған | аппта "Telegram-ты ашу" → "Start" басу керек |

## 7) Сіздің жағдайыңыздағы chat_id (7892697980)

Сіз өзіңіз (админ) `chat_id = 7892697980`. Бұл — админдік тексеру үшін.
Сіз ботқа `/start +7...` жіберсеңіз, бот сіздің chat_id-ңызды
`users.telegram_chat_id` бағанына жазады (өзіңіздің нөміріңіз үшін).

Пайдаланушылардың әрқайсысының **өз chat_id-і** болады — олар өз
Telegram аккаунтынан /start жасағанда.
