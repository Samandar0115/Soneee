# To'liq Setup — Mustaqil Bajarish uchun

Bu fayl Claude yordamisiz, o'zingiz oxirigacha bajarishingiz uchun yozilgan.
Tartib bo'yicha bajaring — **har biri 5 daqiqadan oshmaydi**.

## ⚠️ Pul haqida

**Hech narsa to'lov talab qilmaydi**. Agar Google biror joyda karta so'rasa —
o'sha qadam **kerak emas**, uni o'tkazib yuboring. Quyidagilar **bepul**:

- Gemini API (aistudio.google.com) — kuniga 1500 so'rov
- YouTube Data API v3 — kuniga 10,000 birlik
- Pexels API — cheksiz
- GitHub Actions — oyiga 2000 daqiqa
- GitHub Codespaces — oyiga 60 soat

---

## 0-QADAM: Codespaces ochish

1. https://github.com/Samandar0115/Soneee ga kiring
2. Yashil **`< > Code`** tugmasi → **Codespaces** tab → **Create codespace on `claude/automate-youtube-workflow-GcJ54`**
3. 2 daqiqa kuting — VS Code brauzerda ochiladi
4. Pastdagi terminal hozir ishlatiladi

---

## 1-QADAM: Gemini API key (2 daqiqa)

1. Yangi tab: https://aistudio.google.com/app/apikey
2. Google hisobi bilan kiring
3. **"Create API key"** → **"Create API key in new project"**
4. Chiqqan uzun matnni nusxalang
5. **Saqlash:** vaqtinchalik Notepad/Notes'ga yozib qo'ying. Nomi: `GEMINI_API_KEY`

---

## 2-QADAM: Pexels API key (3 daqiqa)

1. https://www.pexels.com/api/ — ro'yxatdan o'ting (yoki Google bilan kiring)
2. **"Your API Key"** → forma chiqadi
3. Formani to'ldiring:
   - Project Name: `Soneee Educational YouTube Channel`
   - Project Category: `Personal Project` yoki `Other`
   - Explanation:
     ```
     I am building an educational YouTube channel in the Uzbek language.
     The channel teaches AI, programming, and self-development topics.
     Pexels stock videos and photos will be used as B-roll background
     footage behind narrated explanations, with proper Pexels attribution
     in the video description. Approximately 1-2 videos per day will be
     produced. No re-distribution of Pexels assets — they are used only
     as part of edited educational videos.
     ```
   - URL: bo'sh
   - ✅ I agree to ToS
4. **Generate API Key** → uzun kalit chiqadi
5. Nusxalang. Nomi: `PEXELS_API_KEY`

---

## 3-QADAM: Google Cloud loyiha + YouTube API (8 daqiqa)

### 3.1. Loyiha yarating

1. https://console.cloud.google.com
2. ⚠️ **"Try for free" ni BOSMANG** — u karta so'raydi
3. Yuqori chap burchakda **"Select a project"** dropdown → **"NEW PROJECT"**
4. Name: `Soneee YouTube` → **CREATE**
5. Yuqorida loyihani tanlang (`Soneee YouTube`)

### 3.2. YouTube Data API'ni yoqing

1. Chap menyu (☰) → **APIs & Services** → **Library**
2. Qidiruv: `YouTube Data API v3`
3. Birinchi natijani bosing → **ENABLE**

### 3.3. OAuth consent screen

1. Chap menyu → **APIs & Services** → **OAuth consent screen**
2. **User Type**: `External` → **CREATE**
3. To'ldiring:
   - App name: `Soneee Orchestrator`
   - User support email: o'zingizniki
   - Developer contact: o'zingizniki
   - Boshqalar bo'sh → **SAVE AND CONTINUE**
4. **Scopes** sahifasi: hech narsa qo'shmang → **SAVE AND CONTINUE**
5. **Test users**: **+ ADD USERS** → o'zingizning Gmail'ingizni (kanal egasi) → **ADD** → **SAVE AND CONTINUE**
6. Summary → **BACK TO DASHBOARD**

### 3.4. OAuth Desktop client

1. Chap menyu → **APIs & Services** → **Credentials**
2. **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: `Soneee Desktop` → **CREATE**
5. Pop-up'da **DOWNLOAD JSON** → kompyuteringizga yuklanadi

### 3.5. (Ixtiyoriy) Trend API key

1. Yana **Credentials** sahifasida → **+ CREATE CREDENTIALS** → **API key**
2. Yaratilgan kalitni nusxalang. Nomi: `YOUTUBE_DATA_API_KEY`
3. **RESTRICT KEY** → API restrictions → faqat **YouTube Data API v3** → **SAVE**

---

## 4-QADAM: client_secrets.json'ni Codespaces'ga yuklash (1 daqiqa)

1. Codespaces tabiga qayting (brauzerdagi VS Code)
2. Chap tomondagi fayl daraxtida `youtube-orchestrator/` papkasini oching
3. Kompyuteringizdan yuklab olingan JSON faylni `youtube-orchestrator/` papkasiga **sudrang** (drag-and-drop)
4. Fayl nomi avtomatik `client_secret_xxxxx.json` ko'rinishida bo'lishi mumkin —
   uni o'ng tugma bilan **Rename** qilib `client_secrets.json` ga o'zgartiring

---

## 5-QADAM: Refresh token olish (3 daqiqa)

Codespaces terminalida (pastda):

```bash
cd youtube-orchestrator
pip install -r requirements.txt
python tools/get_youtube_token.py --manual
```

Quyidagicha xabar chiqadi:

```
1-QADAM: Quyidagi URL'ni TELEFONINGIZ yoki BOSHQA KOMPYUTERINGIZ brauzerida oching:
============================================================
https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=...
============================================================
```

Endi:
1. O'sha **uzun URL**'ni nusxalang
2. Telefon yoki boshqa brauzerda oching
3. Kanal egasi bo'lgan Google hisob bilan kiring
4. "Google hasn't verified this app" ogohlantirishi chiqsa: **Advanced** → **Go to Soneee Orchestrator (unsafe)** → davom eting (bu sizning shaxsiy app'ingiz, xavfsiz)
5. YouTube ruxsatlarini bering — **Continue / Allow**
6. **"This site can't be reached"** xato sahifasi ochiladi — bu **NORMAL**
7. Brauzerning yuqoridagi **manzil qatorini (URL)** to'liq nusxalang
   (misol: `http://localhost:8080/?state=...&code=4/0AVM...&scope=...`)
8. Terminalga qayting, URL'ni yopishtiring va Enter

Natija — 3 ta qator:
```
YOUTUBE_CLIENT_ID=12345-xxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-xxxxxx
YOUTUBE_REFRESH_TOKEN=1//0xxx...
```

Bularning hammasini nusxalang!

---

## 6-QADAM: GitHub Secrets'ga 5-6 ta kalitni qo'shish (3 daqiqa)

1. https://github.com/Samandar0115/Soneee/settings/secrets/actions
2. **New repository secret** tugmasini bosing
3. Quyidagi har biri uchun alohida secret yarating:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | 1-qadamdan |
| `PEXELS_API_KEY` | 2-qadamdan |
| `YOUTUBE_CLIENT_ID` | 5-qadamdan |
| `YOUTUBE_CLIENT_SECRET` | 5-qadamdan |
| `YOUTUBE_REFRESH_TOKEN` | 5-qadamdan |
| `YOUTUBE_DATA_API_KEY` | 3.5-qadamdan (ixtiyoriy) |

Har birini qo'shgach **Add secret** bosing.

---

## 7-QADAM: GitHub Actions'ni yoqish

1. https://github.com/Samandar0115/Soneee/actions
2. Agar **"I understand my workflows, go ahead and enable them"** ko'rinsa — bosing
3. Chapda 2 ta workflow bo'lishi kerak:
   - YouTube Pipeline
   - YouTube Comment Responder

---

## 8-QADAM: Birinchi DRY-RUN test (10 daqiqa)

⚠️ **Avval test qilamiz** — YouTube'ga yuklamaydi, faqat hammasi ishlayotganini tekshiradi.

1. Actions → **YouTube Pipeline** → o'ng tomonda **Run workflow**
2. Branch: `claude/automate-youtube-workflow-GcJ54`
3. Topic: `Sun'iy intellekt nima va u qanday ishlaydi`
4. Dry run: ☑️ **true** (belgilang!)
5. **Run workflow**

10-15 daqiqa kuting. Workflow ustiga bosib real-time log'ni ko'ring.

**Yashil ✅** bo'lsa → 9-qadamga o'ting
**Qizil ❌** bo'lsa:
- Logga qarang, qaysi qator qizil
- Eng tez-tez uchraydigan xatolar:
  - `GEMINI_API_KEY .env yoki secrets'da yo'q` → secret'ni qaytadan tekshiring
  - `403` xato → YouTube API yoki OAuth scope muammosi
  - `quotaExceeded` → ertasi kuni qayta urining
- Issue oching: https://github.com/Samandar0115/Soneee/issues

---

## 9-QADAM: REAL PUBLIC LAUNCH 🚀

Test ishladi — endi haqiqiy video:

1. Actions → **YouTube Pipeline** → **Run workflow**
2. Branch: `claude/automate-youtube-workflow-GcJ54`
3. Topic: **bo'sh qoldiring** (queue avtomatik to'ldiriladi trend agent tomonidan)
   YOKI o'zingiz aniq mavzu yozing
4. Dry run: ☐ **false**
5. **Run workflow**

~15 daqiqada YouTube kanalingizda **2 ta video** paydo bo'ladi:
- 1 ta long-form (5 daq, gorizontal)
- 1 ta Shorts (55s, vertikal, long videoga link bilan)

**Public** sifatida chiqadi (config'da shunday).

---

## 10-QADAM: Avtomat rejimga o'tkazish

Endi siz hech narsa qilmasangiz ham:
- **Har kuni 14:00 (Toshkent)** workflow avtomatik ishga tushadi
- Trend agent niche'lar bo'yicha mavzu topadi
- 2 ta video chiqadi
- Har 6 soatda sharhlarga avtomatik javob beradi

### Mavzularni o'zingiz boshqarish (ixtiyoriy)

Codespaces'da `youtube-orchestrator/topics/queue.txt` faylini oching, har qatorga
mavzu yozing, saqlang. Pastdagi terminalda:

```bash
git add youtube-orchestrator/topics/queue.txt
git commit -m "topics: yangi mavzular"
git push
```

Ertasi kun workflow shu mavzularni navbat bilan oladi (trend agent faqat queue
past bo'lganda qo'shadi).

---

## Muammolar va yechimlar

### "Video private bo'lib chiqdi"
`config.yaml`'da `privacy_status: public` ekanini tekshiring. Yangi kanallarda
**daily upload limit** bor — 24 soat ichida 15+ video yuklasangiz, qolganlari
private bo'ladi. Avtomat soatiga 2 ta video chiqaradi, muammo bo'lmaydi.

### "Custom thumbnail ishlamadi"
YouTube yangi kanallarda telefon raqamini tasdiqlash talab qiladi.
- https://www.youtube.com/verify ga kiring
- SMS bilan tasdiqlang
- Endi thumbnail upload ishlaydi

### "Comments xato berdi"
- Kanal sozlamalarida sharhlar yoqilganini tekshiring
- YouTube Studio → Settings → Community → Defaults → Show all comments

### "Quota exceeded"
- YouTube API kuniga 10,000 birlik
- 1 video upload = 1600
- Demak kuniga ~6 video chiqarsa quota tugaydi
- Sizning sxema 2 video/kun — yetadi

### Workflow xato berdi, qaytadan ishga tushirishni xohlayman
- Actions → ushbu run → **Re-run failed jobs**

---

## Keyingi qadamlar (ixtiyoriy)

Sifat va daromad uchun:

1. **Channel banner + logo** — Canva'da bepul shablonlar (1 marta)
2. **Channel description** — YouTube Studio'da o'rnating, kalit so'zlar bilan
3. **1000 obunachi yetganda**:
   - YouTube Studio → Earn → AdSense ulang
   - W-8BEN tax form (24% emas, 0% bo'ladi)
   - USD karta (Humo USD, Anor USD)
4. **Funnel havolalari** (`youtube-orchestrator/config.yaml` → `funnel:` bo'limi):
   - Telegram kanal yarating → URL ni qo'ying
   - Bepul PDF/checklist → URL ni qo'ying
   - Kursni keyinroq qo'shing

Saqlang va push qiling:
```bash
git add youtube-orchestrator/config.yaml
git commit -m "config: funnel havolalari"
git push
```

---

## Telefonda boshqarish

Mavzu qo'shish va workflow ishga tushirish uchun:
- **GitHub mobile app** (iOS/Android, bepul) — Actions tab → Run workflow
- Yoki brauzerdan github.com'ga kiring

Lokal Python yoki kompyuter kerak emas.

---

## Yordam kerak bo'lsa

GitHub Issue oching: https://github.com/Samandar0115/Soneee/issues/new
- Qaysi qadamda taqaldingiz
- Xato log'ining screenshot'i
- Nima qildingiz va nima kutgansiz

Keyingi safar Claude bilan ulanganingizda — issue link'ni bering, davom etadi.
