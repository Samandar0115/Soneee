# YouTube Orchestrator — 100% Bepul Avtomatlashtirilgan Pipeline

Bu modul Soneee CRM va `curator-ai` loyihalaridan **mutlaqo mustaqil**. Faqat
`youtube-orchestrator/` papkasi ichida ishlaydi va sizning asosiy ilovangizga
hech qanday ta'sir qilmaydi.

## Siz nima qilasiz (eng tepadagi rahbar)

1. `topics/queue.txt` fayliga **mavzu qo'shasiz** (har qatorga bittadan).
2. Tamom. Qolganini orkestrator qiladi.

Misol:
```
Sun'iy intellekt 2026-yilda qanday o'zgaradi
Eng yaxshi 5 ta bepul VS Code kengaytmasi
ChatGPT vs Claude — qaysi biri kuchli?
```

## Pipeline (har bir mavzu uchun)

```
mavzu → skript (Gemini) → ovoz (edge-tts) → vizual (Pexels) →
video yig'ish (FFmpeg) → thumbnail (Pollinations) →
YouTube upload → sharhlarga javob (Gemini)
```

## Birinchi marta sozlash (faqat 1 marta)

### 1. API kalitlarni oling (hammasi bepul)

| Servis | Nima uchun | Qayerdan |
| --- | --- | --- |
| `GEMINI_API_KEY` | Skript yozish, sharhga javob | https://aistudio.google.com/app/apikey |
| `PEXELS_API_KEY` | Stok video/rasm | https://www.pexels.com/api/ |
| `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN` | Video upload va sharhlarga javob | Quyidagi 2-bo'limga qarang |

### 2. YouTube OAuth refresh token olish

```bash
cd youtube-orchestrator
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python tools/get_youtube_token.py
```

Bu skript brauzer ochib, sizning YouTube kanalingizga ruxsat so'raydi. Tasdiqlagach,
terminalda `YOUTUBE_REFRESH_TOKEN` ko'rinadi — uni GitHub Secrets'ga qo'ying.

### 3. GitHub Secrets'ga qo'shing

GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

- `GEMINI_API_KEY`
- `PEXELS_API_KEY`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

### 4. GitHub Actions yoqish

Repo → Actions tab → "I understand my workflows, go ahead and enable them".

## Qanday ishlaydi

- **Cron**: har kuni 09:00 UTC (14:00 Toshkent vaqti) ishga tushadi.
- `topics/queue.txt` dan birinchi mavzuni oladi.
- To'liq pipeline'ni bajaradi, video YouTube'ga yuklanadi.
- Mavzuni `topics/done.txt`ga ko'chiradi, commit qiladi.
- Har 6 soatda yangi sharhlarga javob beradi (alohida workflow).

## Qo'lda ishga tushirish

Workflow'ni darhol ishga tushirish:
```
GitHub → Actions → "YouTube Pipeline" → Run workflow
```

## Lokal sinov

```bash
cd youtube-orchestrator
cp .env.example .env  # kalitlarni to'ldiring
source .venv/bin/activate
python orchestrator.py --topic "Test mavzu" --dry-run
```

`--dry-run` YouTube'ga yuklamaydi, faqat `output/` ga video yozadi.

## Tuzilma

```
youtube-orchestrator/
├── orchestrator.py            # Bosh dirijyor
├── agents/
│   ├── script_writer.py       # Gemini → skript
│   ├── voice_generator.py     # edge-tts → ovoz
│   ├── visual_fetcher.py      # Pexels → stok video
│   ├── video_assembler.py     # FFmpeg → video
│   ├── thumbnail_maker.py     # Pollinations → thumbnail
│   ├── youtube_uploader.py    # YouTube API → upload
│   └── comment_responder.py   # Gemini → sharhga javob
├── tools/
│   └── get_youtube_token.py   # OAuth refresh token olish
├── topics/
│   ├── queue.txt              # SIZ to'ldirasiz
│   └── done.txt               # avtomatik
├── config.yaml                # kanal sozlamalari
├── .env.example
└── requirements.txt
```

## Xavfsizlik

- `.env` va `output/` `.gitignore`'da.
- API kalitlar faqat GitHub Secrets orqali yuklanadi, kodga yozilmaydi.
- YouTube ToS hurmat qilinadi — bot/sun'iy obuna yo'q, faqat real kontent.

## Monetizatsiya yo'l xaritasi

Kanal ta'limga yo'naltirilgan (audience = o'quvchi), shuning uchun **3 ta** daromad oqimi
ochiladi. Pipeline ularning hammasiga moslashgan.

### 1. YouTube AdSense (kanal o'zidan keladigan daromad)

**Talablar (YouTube Partner Program — YPP):**

| Shart | Long-form yo'li | Shorts yo'li |
| --- | --- | --- |
| Obunachilar | 1000 | 1000 |
| Tomosha soatlari | 4000 soat (oxirgi 12 oy) | YOKI Shorts 10M ko'rish (90 kun) |
| Yosh | 18+ | 18+ |
| Mamlakat | YPP qabul qiladigan ro'yxat | shu |

**Texnik sozlash (siz qilasiz):**
1. YouTube Studio → Earn → AdSense hisobini ulang (yangi yarating yoki mavjudni bog'lang).
2. Google AdSense → Payments → Tax info: **W-8BEN** formasini to'ldiring
   (O'zbekiston rezidenti uchun majburiy, aks holda 24% ushlanma).
3. Bank rekvizitlari: Payoneer yoki USD karta (Humo USD, Anor USD, Kapitalbank USD ishlaydi).
4. AdSense PIN: kartochka pochta orqali keladi (~3-4 hafta), AdSense'da kiritasiz.
5. Reklama joylarini yoqing: Pre-roll, mid-roll (long-form 8+ daq), Overlay, Display.
   Bu pipeline tomonidan **avtomatik** o'rnatilishi uchun `youtube_uploader.py`'ga
   `monetizationDetails` qo'shilishi mumkin — keyingi qadamda qo'shaman, agar kanal
   YPP'da bo'lsa.

**Pipeline'da hozir tayyor:**
- Har long video 5+ daqiqa (mid-roll uchun) — `config.yaml` `formats.long.target_duration_sec`.
- Description'ga monetizatsiya-do'stona "advertiser-friendly" matnlar.
- Mavzular xavfsiz (ta'lim, fan, texnologiya) — demonetizatsiyadan uzoq.

### 2. Kurs/mahsulot sotish (eng katta daromad oqimi)

Auditoriya yig'ilgach, har video tavsifiga avtomatik quyidagilar qo'shiladi:
- 🎁 **Bepul lid magnet** (PDF/checklist) — emaillarni yig'ish uchun
- 🎓 **To'liq kurs havolasi** — payme/click bilan to'lov sahifa
- 💬 **Telegram kanal** — community + qaytarma trafik

`config.yaml`'da `funnel:` bo'limi bor — havolalarni shu yerga qo'ying, hamma yangi
videolar tavsifida avtomatik chiqadi.

**Tavsiyalar (sotuv funeli):**
1. **Lid magnet birinchi** — masalan "AI bilan 10 daqiqada matn yozish — bepul PDF" (Notion'da
   ham ishlaydi, bepul). Email yig'ing → Sender.net (bepul 2500 ta gacha email).
2. **Mini-kurs** (10–20$) — 4-5 ta video, dripped. Sotish: Payme/Click integratsiyasi
   bilan oddiy 1 sahifali sayt (Vercel'da bepul).
3. **Premium kurs** (50-200$) — auditoriya 5000+ bo'lgach.

### 3. Sponsorlik / Affiliate

- 10k obunachiga yetganda — UZ tech brendlari (Beeline, UZUM, Anor) bilan integratsiya.
- Pipeline har video oxiriga avtomatik affiliate disclaimer qo'shishi mumkin (config'da yoqasiz).

---

## Pipeline'ga keyinroq qo'shilishi mumkin bo'lgan narsalar

Agar xohlasangiz, men keyingi iteratsiyalarda quyidagilarni qo'shaman:
- **Analytics agent** — har hafta YouTube Studio'dan CTR, retention, top-videolarni o'qib,
  qaysi mavzular ishlayotganini aniqlaydi va trend agent'ga "shu yo'nalishda ko'proq" deydi.
- **A/B title agent** — Gemini bilan 5 ta variant, eng yaxshisi tanlanadi.
- **End-screen + cards avtomatik** — har video oxirida keyingi videoga link.
- **Multilingual** — bitta skriptdan o'zbek + rus + ingliz versiyalari (3x audience).
- **Affiliate link injector** — Amazon/AliExpress mahsulotlarini avtomatik kiritish.

---

## Cheklovlar

- Gemini bepul tier: 1500 so'rov/kun (kuniga ~10 ta video uchun yetadi).
- YouTube Data API: 10,000 birlik/kun (1 upload = 1600 birlik, 6 ta video/kun).
- GitHub Actions: 2000 daqiqa/oy (bitta video ~10-15 daqiqa, oyiga ~150 video).
- Edge-TTS: cheksiz bepul, lekin Microsoft serverlariga bog'liq.
