# To'liq Setup — Soddalashtirilgan Versiya

**MUHIM YANGILIK:** Gemini va Pexels endi MAJBURIY emas. Pipeline avtomat ravishda
**Pollinations.ai** (bepul, kalitsiz) ishlatadi. Sizga **faqat YouTube** kerak.

## Sizdan kerak bo'lgan yagona narsa: YouTube OAuth

(Hammasi to'g'ridan-to'g'ri brauzerda, 5-7 daqiqa)

---

## QADAM 1: Google Cloud loyiha (3 daqiqa)

⚠️ **"Try for free" tugmasini bosmang** — u karta so'raydi, kerak emas.

1. https://console.cloud.google.com ga kiring
2. Yuqori chap **"Select a project"** → **"NEW PROJECT"**
3. Name: `Soneee YouTube` → **CREATE**
4. Yuqorida loyihani tanlang (`Soneee YouTube`)

### 1.1. YouTube Data API'ni yoqing

- Chap menyu (☰) → **APIs & Services → Library**
- Qidiruv: `YouTube Data API v3` → tanlang → **ENABLE**

### 1.2. OAuth consent screen

- Chap menyu → **APIs & Services → OAuth consent screen**
- **External** → **CREATE**
- App name: `Soneee Orchestrator`
- User support email + Developer contact: o'zingizniki
- Boshqalar bo'sh → **SAVE AND CONTINUE**
- Scopes: hech narsa qo'shmang → **SAVE AND CONTINUE**
- Test users: **+ ADD USERS** → o'zingizning Gmail (kanal egasi) → **ADD** → **SAVE AND CONTINUE**
- **BACK TO DASHBOARD**

### 1.3. OAuth Desktop client

- **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
- Application type: **Desktop app**
- Name: `Soneee Desktop` → **CREATE**
- Pop-up'da **DOWNLOAD JSON** — fayl yuklanadi

---

## QADAM 2: GitHub Codespaces ochish (2 daqiqa)

1. https://github.com/Samandar0115/Soneee
2. Yashil **`< > Code`** → **Codespaces** tab → **Create codespace on `claude/automate-youtube-workflow-GcJ54`**
3. ~2 daqiqada brauzerda VS Code ochiladi

---

## QADAM 3: client_secrets.json'ni Codespaces'ga sudring (30 soniya)

1. Chap fayl daraxtida `youtube-orchestrator/` papkasini oching
2. Kompyuterdan yuklab olingan JSON faylni **drag-and-drop** bilan shu papkaga tashlang
3. Faylni o'ng-tugma → **Rename** → `client_secrets.json` ga o'zgartiring
   (agar nomi `client_secret_xxxx.json` bo'lsa)

---

## QADAM 4: Token olish (3 daqiqa)

Codespaces pastdagi terminalda:

```bash
cd youtube-orchestrator
bash tools/setup.sh
python tools/get_youtube_token.py --manual
```

Terminalda quyidagicha chiqadi:
```
1-QADAM: Quyidagi URL'ni TELEFONINGIZ brauzerida oching:
============================================================
https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=...
============================================================
```

Endi:
1. URL'ni nusxalang, **telefonda** oching (yoki boshqa brauzer)
2. Kanal egasi Google hisobi bilan kiring
3. "Google hasn't verified..." → **Advanced** → **Go to Soneee Orchestrator (unsafe)**
4. YouTube ruxsatlari → **Continue** → **Allow**
5. "This site can't be reached" sahifa ochiladi — bu **NORMAL**
6. **O'sha sahifaning manzil qatori (URL)**ni to'liq nusxalang
   (`http://localhost:8080/?state=...&code=4/0AVM...` ko'rinishida bo'ladi)
7. Terminalga qayting, URL'ni yopishtiring va **Enter**

Natijada 3 ta qator chiqadi:
```
YOUTUBE_CLIENT_ID=12345-xxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-xxxxxx
YOUTUBE_REFRESH_TOKEN=1//0xxx...
```

---

## QADAM 5: GitHub Secrets'ga 3 ta qiymat qo'shish (2 daqiqa)

1. https://github.com/Samandar0115/Soneee/settings/secrets/actions
2. **New repository secret** → har biri uchun alohida:

| Name | Value |
|---|---|
| `YOUTUBE_CLIENT_ID` | 4-qadamdan |
| `YOUTUBE_CLIENT_SECRET` | 4-qadamdan |
| `YOUTUBE_REFRESH_TOKEN` | 4-qadamdan |

Tamom. **Boshqa hech qanday kalit kerak emas** — pipeline Pollinations.ai bilan ishlaydi.

---

## QADAM 6: Birinchi test (10 daqiqa)

1. https://github.com/Samandar0115/Soneee/actions
2. Agar "I understand my workflows" chiqsa → bosing
3. Chap menyu → **YouTube Pipeline** → o'ng yuqori **Run workflow**
4. Topic: `Sun'iy intellekt nima va u qanday ishlaydi`
5. Dry run: ☑️ **true** ← muhim, faqat test
6. **Run workflow**

10-15 daqiqa kuting. **Yashil ✅** bo'lsa muvaffaqiyat.

---

## QADAM 7: Real public launch 🚀

Test ishladi → endi haqiqiy video:

1. **YouTube Pipeline** → **Run workflow**
2. Topic: **bo'sh** (queue'dan oladi — 20 ta tayyor mavzu bor)
3. Dry run: ☐ **false**
4. **Run workflow**

~15 daqiqada kanalingizda **2 ta video** paydo bo'ladi (1 long + 1 short).

---

## QADAM 8: Avtomatlashtirish

Endi hech narsa qilmasangiz ham:
- **Har kuni 14:00** (Toshkent) avtomat 2 ta video chiqadi
- **Har 6 soatda** sharhlarga avtomat javob beradi
- Mavzu tugasa, trend agent yangilarini avtomat qo'shadi

---

## Sifatni oshirish (KEYINROQ, ixtiyoriy)

Pollinations.ai bepul, lekin Gemini va Pexels yaxshiroq sifat beradi.
Xohlasangiz keyinroq qo'shasiz — pipeline ularni avtomat sezadi:

| Yaxshilash | Qadam |
|---|---|
| Skript sifati ↑ | https://aistudio.google.com/app/apikey → `GEMINI_API_KEY` GitHub Secret'ga |
| Stok video sifati ↑ | https://www.pexels.com/api/ → `PEXELS_API_KEY` GitHub Secret'ga |
| Trend mavzular ↑ | Google Cloud → Credentials → API key → `YOUTUBE_DATA_API_KEY` |

---

## Muammo bo'lsa

1. **Doktor ishga tushiring** (Codespaces'da):
   ```bash
   cd youtube-orchestrator
   python tools/doctor.py
   ```
   Aniq nima yo'qligini aytadi.

2. **GitHub Issue oching**:
   https://github.com/Samandar0115/Soneee/issues/new
   - Qaysi qadam, qaysi xato, screenshot

3. **Workflow log'ini ko'ring**: Actions → ushbu run → qator-qator log

---

## Tezkor checklist

- [ ] Google Cloud loyiha + YouTube API yoqilgan
- [ ] OAuth consent screen sozlangan (External, Testing, test user qo'shilgan)
- [ ] OAuth Desktop client → `client_secrets.json` yuklab olingan
- [ ] Codespaces ochildi
- [ ] `client_secrets.json` Codespaces'ga sudrildi
- [ ] `python tools/get_youtube_token.py --manual` ishladi, 3 ta token chiqdi
- [ ] GitHub Secrets'ga 3 ta YOUTUBE_* qo'shildi
- [ ] Actions yoqildi
- [ ] DRY-RUN test yashil
- [ ] Real run → kanalda video paydo bo'ldi
