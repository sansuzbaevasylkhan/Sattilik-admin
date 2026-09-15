# TODO_RATING_AUTO — ASKDRV Сапардан кейін жүргізушіні бағалау

## Step 1 — Анализ және жоспар
- [x] Сапар аяқталғанда бағытталатын орын анықталды (app/order.tsx poll логикасы бар)
- [x] Бағалау экраны бар екені анықталды (app/rate-driver.tsx)
- [x] Reviews кестесі бар екені анықталды (supabase/migrations/20260619120000_reviews_table.sql)
- [x] Driver profile экранында average_rating тек қазір плейсхолдер екенін анықтау керек

## Step 2 — Automatic navigation (trip completed)
- [x] app/order.tsx ішіне “completed” болған кезде (orderStatus === 'completed') бір рет қана авто-навигация қосу
- [x] duplicated navigation болмас үшін “alreadyRouted” флаг қосу (useRef/closure арқылы)
- [x] бағалау бетіне өту үшін параметр беру: /rate-driver?orderId=<currentOrder.id>
- [x] бағалау flow-тан passenger қайта келгенде қайта ашылып кетпеуін қамтамасыз ету (alreadyRouted + orderId-check)


## Step 3 — Supabase: ratings жазу
- [x] Client тарапында reviews INSERT жасайтын логика бар (hooks/useRatings.ts -> /rest/v1/reviews)
- [x] Кесте атауы “reviews” (ratings емес) екенін нақтылау
- [x] Барлық баған атаулары DB-мен сәйкестігін тексеру (order_id, driver_phone, passenger_first_name, passenger_last_name, stars, comment)


## Step 4 — Driver average_rating жаңарту
- [x] Supabase trigger/function қосу (server-side, client-ке тәуелді емес)
  - reviews кестесіне INSERT болғанда driver профиліндегі average_rating есептейтін логика іске қосылсын
  - average_rating = AVG(stars) (driver_phone бойынша)
- [x] user/drivers/profile құрылымында average_rating өрісін нақтылау
  - Егер “driver_id” жоқ болса: orders/reviews-тағы driver_phone бойынша update
  - average_rating өрісі жоқ болса: оны migrations арқылы қосу


## Step 5 — Driver profile экранын жаңарту
- [x] app/menu/profile.tsx ішінен driver-ге арналған average_rating оқу
- [x] Жұлдызша UI үшін орташа rating мәнін пайдалану
- [x] user.role === 'driver' болса ғана rating көрсету
- [x] Пікір саны (қаласаңыз) үшін reviews count қосуға болады (қосымша қадам)


## Step 6 — Тексеру
- [ ] Trip аяқталған кезде автоматты ашылуын тест жасау (order.status -> completed болған сәт)
- [ ] Бағалау жіберілгеннен кейін driver профиль экранында орташа rating жаңаратынын тексеру
- [ ] Duplicate review submission/duplicate navigation болмайтынын тексеру

