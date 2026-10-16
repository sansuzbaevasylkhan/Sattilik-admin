# 🗺 Ауыл такси аппына арналған КАРТА нұсқаулығы

> Qapal Taxi (inDrive-стиль, React Native + Expo) жобасында карта қалай жасалғанының **толық** түсіндірмесі.
> Өз ауылыңа осындай апп жасайтын адамға арналған практикалық нұсқаулық.

---

## 1. Қандай технологиялар (стек)

| Не үшін | Технология | Ақылы ма |
|---------|-----------|----------|
| Картаны көрсету (native) | **@maplibre/maplibre-react-native** (v11) | Тегін (ашық код) |
| Карта суреті (tiles) + стиль | **MapTiler** (streets-v2 / satellite / hybrid) | Тегін лимит бар |
| Мекенжай ↔ координат (geocoding) | **MapTiler Geocoding API** | Тегін лимит бар |
| Нақты жол маршруты + қашықтық + ETA | **OSRM** (ашық сервер) | Тегін (демо-лимит) |
| Пайдаланушы/жүргізуші GPS | **expo-location** | Тегін |
| Жүргізуші орнын нақты уақытта көру | **Supabase Realtime** + `driver_locations` кестесі | Supabase жоспарында |

**Неге MapLibre + MapTiler?**
- MapLibre — Google Maps SDK-ге тегін, ашық балама (Mapbox-тың ашық форкі). Лицензия төлемі жоқ.
- Google Maps қымбат әрі несие картасы керек. MapTiler — арзан, тегін лимиті ауыл көлеміне жетеді.

---

## 2. Орнату (МАҢЫЗДЫ)

```bash
npx expo install @maplibre/maplibre-react-native expo-location
```

`app.json` → `plugins`-ке қосу:
```json
{
  "expo": {
    "plugins": [
      "@maplibre/maplibre-react-native",
      ["expo-location", {
        "locationWhenInUsePermission": "Картадан жақын жүргізушілерді табу үшін орналасуыңыз қолданылады"
      }]
    ]
  }
}
```

> ⚠️ **ЕҢ МАҢЫЗДЫ:** MapLibre — **native модуль**. **Expo Go-да ЖҰМЫС ІСТЕМЕЙДІ**.
> Тексеру үшін **custom dev client** керек: `eas build --profile development`, немесе бірден `--profile preview` (APK).

---

## 3. MapTiler кілтін алу (тегін)

1. https://www.maptiler.com/ → тіркел (тегін)
2. Account → **API keys** → кілтті көшір
3. `.env` (немесе EAS secret) файлына қой:
```
EXPO_PUBLIC_MAPTILER_API_KEY=сенің_кілтің
```
> `EXPO_PUBLIC_` префиксі — Expo оны аппқа автоматты қосады.

**Тегін лимит:** айына ~100 000 tile сұранысы + geocoding. Кіші ауылға әбден жетеді.

---

## 4. Ауылды баптау (координатты өзгерту)

`lib/maptiler.ts` — мұнда бүкіл карта конфигурациясы:

```ts
const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? '';

export const MAP_STYLES = {
  streets:   `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
  hybrid:    `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
};

// 👇 ӨЗ АУЫЛЫҢНЫҢ координатын қой! [longitude, latitude] (Google Maps-та оң жақ басып көресің)
export const QAPAL_CENTER: [number, number] = [79.04469, 45.12566]; // Қапал
export const QAPAL_DEFAULT_ZOOM = 14; // ауылға 14-15 жақсы

// Ел шекарасы (картаны осы аймақпен шектеу)
export const KAZAKHSTAN_BOUNDS: [[number, number], [number, number]] = [
  [50.0, 40.0],   // SW [lng, lat]
  [87.5, 55.5],   // NE [lng, lat]
];
```

> 📍 **Тек осы жерді өзгертсең — карта сенің ауылыңа бейімделеді.**
> Координатты табу: Google Maps → жерді оң жақ басу → шыққан сандар (алдыңғысы — lat, кейінгісі — lng, бірақ картада **[lng, lat]** ретімен қоясың!).

---

## 5. Карта компоненті (негізгі код)

`components/Map.tsx`:
```tsx
import { Map as MapView, Camera, UserLocation } from '@maplibre/maplibre-react-native';
import { MAPTILER_STYLE_URL, QAPAL_CENTER, QAPAL_DEFAULT_ZOOM } from '../lib/maptiler';

<MapView
  mapStyle={MAPTILER_STYLE_URL}   // карта стилі
  logo={false} attribution={false} compass={false}
  onRegionDidChange={onRegionDidChange} // карта тоқтағанда шақырылады
>
  <Camera
    initialViewState={{ center: QAPAL_CENTER, zoom: QAPAL_DEFAULT_ZOOM }}
    trackUserLocation={...}
  />
  <UserLocation animated />  {/* көк нүкте — қолданушы орны */}
  {/* маркерлер, маршрут сызығы осында */}
</MapView>
```

**Камераны басқару** (белгілі жерге апару):
```ts
cameraRef.current?.easeTo({ center: [lng, lat], zoom: 16, duration: 500 });
// немесе бірнеше нүктені сыйдыру:
cameraRef.current?.fitBounds([west, south], [east, north], padding, duration);
```

---

## 6. Карта қабаттары (Көше / Спутник / Гибрид)

`hooks/useMapStyle.ts` — «Көше» батырмасын басқанда циклмен ауыстырады:
```ts
const ORDER = ['hybrid', 'streets', 'satellite']; // әдепкі — hybrid (спутник + жазба)
// cycle() → келесі стильге өтеді
```
Ауыл үшін **hybrid** (спутник + көше аттары) ең түсінікті — үйлер көрінеді.

---

## 7. Орталық «пин» (Яндекс/inDrive стилі)

Идея: пин картада **қозғалмайды** — экранның ортасында бекітулі тұрады. Картаны жылжытсаң, пин астындағы нүкте = таңдалған жер.

**Қалай істейді:**
1. Пин — картаның үстіндегі бекітілген `<View>` (экран ортасында).
2. Картаны жылжытып тоқтатқанда `onRegionDidChange` шақырылады.
3. `unproject` — пин тұрған **пикселдің** нақты координатын қайтарады:
```ts
const [lng, lat] = await mapRef.current.unproject([экранЕні/2, көрінетінКарта/2]);
```
4. Сол координатты «бару нүктесі» етіп сақтаймыз + `reverseGeocode`-пен мекенжайын аламыз.

> 💡 Панель (төменгі ақ терезе) картаны жауып тұрса — пинді экран ортасына емес, **көрінетін картаның** ортасына қою керек (панельден жоғары). Бұл — ең қиын, бірнеше рет дәлдеуді талап еткен жер.

---

## 8. Мекенжай табу (reverse geocoding)

`lib/geocoding.ts` — координат → мекенжай аты:
```ts
const res = await fetch(
  `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${KEY}&language=kk&limit=1`
);
// нәтиже: features[0].place_name
```
> Кіші ауылда мекенжай дөрекі болуы мүмкін (ауыл/облыс деңгейі). Сондықтан **мекенжай табылмаса — координатты қайтарамыз** (бос болмас үшін). REST сұраныс, native емес.

---

## 9. Маршрут + қашықтық + жету уақыты

`lib/routing.ts` — OSRM (нақты жол бойымен):
```ts
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
fetch(`${OSRM}/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`)
// → маршрут сызығы (coordinates), қашықтық (км), уақыт (мин)
```

**МАҢЫЗДЫ қорғаныс:** OSRM демо-сервері баяу/бөгелсе — апп **түзу сызық** маршрутын көрсетеді (haversine формуласымен қашықтық + шамалас ETA). Сонда апп **ешқашан маршрутсыз қалмайды**.

> ⚠️ `router.project-osrm.org` — тек **демо** (лимиті бар). Қолданушы көбейгенде **өз OSRM серверіңді** (арзан VPS) немесе OpenRouteService/Mapbox Directions қосу керек.

---

## 10. Жүргізушінің нақты уақыттағы орны (realtime)

**Жүргізуші жағы** (`hooks/useLocationBroadcast.ts`): GPS-ті 5 секунд сайын Supabase-ке жібереді:
```ts
Location.watchPositionAsync({ distanceInterval: 20 }, (pos) => {
  supabase.from('driver_locations').upsert({ id: driverId, lat, lng, updated_at: now });
});
```

**Жолаушы жағы:**
- Онлайн жүргізушілерді картадан көру: `get_online_driver_locations` RPC (машина иконкалары).
- Сапар кезінде жүргізушіні тірі бақылау (`hooks/useDriverLocation.ts`): **Supabase Realtime** арқылы `driver_locations` кестесіне жазылып, жүргізуші қозғалғанда картадағы иконканы жылжытады.

**DB кестесі:** `driver_locations (id, lat, lng, updated_at)` + RLS.

---

## 11. Шығын / лимиттер (қорытынды)

| Қызмет | Тегін лимит | Көбейгенде |
|--------|-------------|-----------|
| MapLibre | Шексіз (ашық код) | — |
| MapTiler tiles + geocoding | ~100k/ай | ~$25/ай-дан |
| OSRM (демо) | Аз, тұрақсыз | Өз VPS ($5/ай) |
| Supabase Realtime | Тегін жоспарда бар | Pro $25/ай |

**Ауыл көлемінде — бәрі тегін лимитке сыяды.**

---

## 12. Басты сабақтар (қателеспес үшін)

1. **Expo Go-да карта ЖҰМЫС ІСТЕМЕЙДІ** — dev client / EAS build міндетті.
2. Координат әрқашан **[longitude, latitude]** ретімен (кең тараған қате — орнын шатастыру).
3. Орталық пин мен `unproject` нүктесі **бір пиксельде** болсын — әйтпесе таңдаған жер мен пин бөлек кетеді.
4. Панель картаны жапса — пинді **көрінетін** картаның ортасына қой (панельден жоғары).
5. OSRM/geocoding-те **әрқашан fallback** болсын (желі нашар ауылда маңызды).
6. GPS-ті тым жиі жіберме (5с/20м жеткілікті) — батарея мен трафикті үнемдейді.

---

## Файлдар картасы (қайдан қарау керек)

| Файл | Не үшін |
|------|---------|
| `lib/maptiler.ts` | Кілт, стильдер, ауыл координаты, шекара |
| `components/Map.tsx` | Негізгі карта компоненті |
| `hooks/useMapStyle.ts` | Қабат ауыстыру (Көше/Спутник/Гибрид) |
| `lib/geocoding.ts` | Мекенжай табу |
| `lib/routing.ts` | Маршрут + қашықтық + ETA |
| `hooks/useLocationBroadcast.ts` | Жүргізуші GPS жіберу |
| `hooks/useDriverLocation.ts` | Жүргізушіні тірі бақылау |
| `app/passenger/index.tsx` | Жолаушы картасы (пин, тапсырыс) — ең толық мысал |

---

*Qapal Taxi жобасынан. Сұрақ болса — осы файлдардың кодын қара, бәрінде қазақша түсіндірме бар.*
