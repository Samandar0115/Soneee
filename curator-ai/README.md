# Curator AI Digital Twin — Telegram Bot + Dashboard

## O'rnatish

### 1. Virtual muhit yarating
```bash
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows
pip install -r requirements.txt
```

### 2. .env faylini sozlang
```bash
cp .env.example .env
```
`.env` faylini tahrirlang:

| Kalit | Qanday olish |
|-------|--------------|
| `TELEGRAM_BOT_TOKEN` | @BotFather dan yangi bot yarating |
| `GEMINI_API_KEY` | aistudio.google.com → API keys |
| `CURATOR_CHAT_ID` | @userinfobot orqali o'z ID ingizni toping |
| `DIRECTOR_CHAT_ID` | Direktor Telegram ID si |
| `DUTY_CURATORS` | Navbatchi kuratorlar ID lari (vergul bilan) |

### 3. Ishga tushiring
```bash
# Faqat bot:
python bot.py

# Faqat dashboard:
python web_app.py

# Ikkalasi birga (tavsiya):
python run.py
```

Dashboard: `http://localhost:5000`

## Tizim ishlash tartibi

```
Talaba xabar → Telegram Bot → Gemini AI (tasnif) → Avtomatik javob
                                    ↓
                           SQLite bazasi saqlash
                                    ↓
                     Navbatchi kuratorga bildirishnoma
                                    ↓
                    Web Dashboard da ko'rish + CSV eksport
```

## 7 ta kategoriya

| Kategoriya | Vazifa |
|-----------|--------|
| 🎯 lead_taqsimlash | Yangi talabalar → Google Sheets + Kurator |
| 🚫 platforma_muammosi | TaoBao/1688 blok, kirish muammosi |
| 💳 tolov_tizimi | Alipay, UzCard, valyuta |
| 📦 kargo_logistika | Trek kod, ombor, bojxona |
| ⚙️ texnik_xatolik | Ilova, til muammolari |
| ❓ ommaviy_faq | Narx, sertifikat, jadval |
| 🚨 shoshilinch_shikoyat | → Direktorga ham yuboriladi |

## Servorda ishlatish (systemd)

```ini
# /etc/systemd/system/curator-ai.service
[Unit]
Description=Curator AI Bot
After=network.target

[Service]
WorkingDirectory=/path/to/curator-ai
ExecStart=/path/to/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable curator-ai
systemctl start curator-ai
```
