# iPOST CRM — To'liq Qo'llanma

Call Center + Kargo logistika CRM tizimi. Web (Vercel) + Desktop (.exe / .dmg).

---

## 1. NIMALAR QILINGAN (imkoniyatlar)

### Asosiy CRM
- **Murojaatlar** — yaratish, bosqichlar (Pipeline), izoh, hal etish, baholash.
- **Yangi murojaatlar (Leads)** — Instagram / Telegram / telefon / javobsizlardan kelganlar bitta navbatda. Qo'ng'iroqdan keyin: **Info berildi**, **Kechroq bog'lanaman**, **Gaplasha olmadim**, yoki **Murojaat ochish**. Izoh qoldirish bor.
- **Qo'ng'iroqlar** — o'rnatilgan **SIP telefon liniyasi** (WebRTC, tashqi dastur kerak emas): chiquvchi/kiruvchi, mikrofon, DTMF, jurnal. Raqam bir xil formatga (+998 olib tashlab) yuboriladi.
- **Vozvrat yuklar** — Excel'dan yuklab kuzatish.
- **Sklad navbati** — trek + sabab (to'lov / vozvrat / ushlab qolingan).
- **Bilim bazasi** — e'lonlar, filiallar, **tariflar** (admin tahrirlaydi), narx kalkulyatori.

### O'quv markazi (LMS)
- **Yo'nalishlar** (tracks) + **darslar** (video havola yoki yuklash, matn, **tip & trick**, amaliy **case**lar, test).
- **Chiziqli yo'l**: keyingi dars oldingisi 100% tugagach ochiladi.
- **Telemetriya** (admin) + **kirishni bekor qilish** (kill switch).

### Foydalanuvchilar va xavfsizlik
- **3 ta tizim roli** + admin yaratadigan **maxsus rollar** (qaysi bo'limlar, tahrirlash/o'chirish, to'liq boshqaruv).
- **Face ID** — yuz orqali kirish. **Faqat jonli kameradan** qayd etiladi (boshqaning rasmini qo'yib bo'lmaydi). Har xodimga 3-6 namuna → qorong'i/soqolli/burchakli holatda ham taniydi.
- **Profil** — xodim o'z rasm/login/parol/ismini o'zgartiradi. Birinchi yaratish admindan.
- **Admin jurnal** — kim qachon nimani o'zgartirgani.
- **Saqlangan loginlar** — qurilmada eslab qolish (Google Passwords kabi), bir bosishda kirish.

### Ma'lumot va sinxronizatsiya
- Barcha ma'lumot **Vercel + Upstash (Redis)** bulutida — barcha qurilmalarda bir xil.
- Rasm/video faqat shu qurilmada (joy tejash uchun).
- Avto-backup, cheksiz so'rovlar oldini olish (bandwidth tejash).

### Desktop
- **Windows (.exe)** va **macOS (.dmg)** setup fayllari (GitHub Actions avtomatik quradi).
- **Online rejim**: dastur qayta ochilganda Vercel'dagi eng yangi versiyani yuklaydi → qayta tarqatish shart emas.

---

## 2. SIZ (ADMIN) NIMA QILISHINGIZ KERAK

### A) Birinchi sozlash (bir marta)
1. **Vercel'da deploy** — loyiha allaqachon Vercel'da. Yangi o'zgarish avtomatik deploy bo'ladi.
2. **Ma'lumot bazasi (Upstash Redis)**: Vercel → loyiha → **Storage → Create Database → Upstash Redis** (bepul). Ulanganda `KV_REST_API_URL` va `KV_REST_API_TOKEN` avtomatik qo'shiladi. So'ng Sozlamalar → "Yangilash".
3. **Birinchi admin** bilan kiring (standart: `admin` / parolni o'zgartiring).

### B) Xodimlarni qo'shish
1. **Xodimlar** bo'limi → **Yangi xodim**: ism, login, parol, rol.
2. **Face ID** kerak bo'lsa: **Kameradan (Face ID)** tugmasini bosib, xodimni kamera oldida **3-4 marta** turli sharoitda suratga oling.
3. **SIP raqam** (ixtiyoriy): operatorga ichki raqam bering.
4. Xodim keyin **Profil**dan o'z rasm/parolini o'zgartira oladi.

### C) Rollar (kerak bo'lsa)
- **Rollar** bo'limi → **Yangi rol**: nom, kira oladigan bo'limlar, tahrirlash/o'chirish/to'liq boshqaruv. Masalan: "Ombor xodimi" — faqat **Sklad navbati**.

### D) Telefon liniyasi (qo'ng'iroq uchun)
- **Sozlamalar → Telefon liniyasi**: SIP server (WSS), domen, raqam, parol. SIP-over-WebSocket beradigan PBX (Asterisk/FreeSWITCH) yoki provayder kerak. Server bo'lmasa, telefon UI ishlaydi-yu, ulanmaydi.

### E) O'quv markazi (darslik)
- **Darslik boshqaruvi** → yo'nalish va dars qo'shing: video havola/yuklash, matn, maslahatlar, caselar, test.

### F) Desktop dastur (.exe / .dmg)
1. GitHub → **Settings → Secrets and variables → Actions → Variables**: `VITE_API_BASE` = Vercel manzilingiz (masalan `https://soneee.vercel.app`).
2. GitHub → **Actions → "Build Desktop (Windows + macOS)" → Run workflow**.
3. Tugagach **Artifacts**'dan `.exe` va `.dmg` ni yuklab oling, xodimlarga tarqating.
- **macOS** birinchi ochishda: o'ng tugma → Open, yoki System Settings → Privacy & Security → "Open Anyway".

---

## 3. OPERATOR QO'LLANMASI (qanday ishlash)

### Kirish
1. Dasturni oching → **Parol** yoki **Face ID** bilan kiring.
2. "Bu qurilmada eslab qol" yoqilgan bo'lsa, keyingi safar ismingizni bir bosib kirasiz.

### Kunlik ish oqimi
1. **Yangi murojaatlar** — yangi kelgan raqamlarni ko'ring.
2. Raqamga **qo'ng'iroq qiling** (telefon tugmasi yoki raqam yonidagi tugma).
3. Suhbatdan keyin natijani belgilang:
   - **Info berildi** — savolga javob berildi, murojaat yo'q.
   - **Kechroq bog'lanaman** — keyin qo'ng'iroq qilasiz (izoh yozing).
   - **Gaplasha olmadim** — javob bermadi/band.
   - **Murojaat ochish** — muammo bor → yangi murojaat yaratiladi.
4. **Murojaatlar / Pipeline** — murojaatni bosqichma-bosqich yuriting, izoh qo'shing, hal eting.
5. Kerak bo'lsa murojaat ichida **Sklad navbatiga qo'shish** tugmasi orqali trek yuboring.

### Telefon
- Pastdagi yashil **telefon tugmasi** — raqam terish yoki kiruvchi qo'ng'iroqni qabul qilish.
- Qo'ng'iroq paytida: mikrofon o'chirish, raqam tugmalari (DTMF), tugatish.

### Profil
- Pastdagi ism/rasmingizni bosing → **rasm, login, parol**ni o'zgartiring.

### Bosh sahifa
- O'zingizning aktiv murojaatlaringiz va **shaxsiy reytingingiz** ko'rinadi.

> Eslatma: operator yozuvlarni **o'chira/tahrirlay olmaydi** (bu admin huquqi). Murojaat yaratish va yuritish mumkin.

---

## 4. O'QUVCHI QO'LLANMASI (darslik)

### Kirish
1. Admin sizga **login va parol** beradi.
2. Kirgandan keyin to'g'ridan-to'g'ri **O'quv markazi**ga tushasiz.

### O'qish tartibi
1. **Kun 1** dan boshlang. Har kun: **video → material → maslahatlar → caselar → test**.
2. Videoni oxirigacha ko'ring (o'tkazib yuborib bo'lmaydi).
3. **Material** va **maslahatlar (tip & trick)** ni o'qing.
4. **Amaliy caselar** — to'g'ri va noto'g'ri yondashuvni ko'ring.
5. **Testni** topshiring — o'tish uchun **100%** kerak. Xato bo'lsa qayta urinib ko'ring.
6. Kun tugagach **keyingi kun** ochiladi. Shunday 14 kun (yoki yo'nalish bo'yicha).

### Maslahat
- Shoshilmang, har kunni puxta o'rganing.
- Test savollari amaliy — materialdagi qoidalarga asoslanadi.
- Yakuniy imtihonni topshirsangiz — **tayyor operator** bo'lasiz.

---

## 5. TEZ-TEZ SO'RALADIGAN

- **Ma'lumot yo'qoladimi (dasturni qayta o'rnatsam)?** — Yo'q. Hammasi bulutda. Faqat qurilmadagi rasm/video lokal.
- **Vercel'ga yangi o'zgarish qilsam, .exe ham yangilanadimi?** — Ha, online rejimda dastur qayta ochilganda yangi versiyani yuklaydi.
- **Telefon nega ishlamayapti?** — SIP server sozlanmagan. Sozlamalar → Telefon liniyasiga PBX ma'lumotlarini kiriting.
- **Face ID tanimayapti?** — Xodimni kamera oldida bir necha marta turli yorug'likda qayta qayd qiling.

---

*iPOST CRM — Fast and Easy*
