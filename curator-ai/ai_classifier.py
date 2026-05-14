import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

SYSTEM_PROMPT = """Sen "Marketplace Education" markazining bosh kuratorining raqamli egizagisan.
Sening vazifang — TaoBao, 1688, Pinduoduo bo'yicha talabalar xabarini tahlil qilish.

Javobni FAQAT quyidagi JSON formatida qaytar (boshqa hech narsa yozma):
{
  "kategoriya": "lead_taqsimlash | platforma_muammosi | tolov_tizimi | kargo_logistika | texnik_xatolik | ommaviy_faq | shoshilinch_shikoyat",
  "priority": "high | medium | low",
  "summary": "muammoning qisqacha mazmuni (1 gap, o'zbek tilida)",
  "answer": "talaba uchun qisqa va aniq yechim o'zbek tilida. Agar lead bo'lsa: kurs haqida qisqacha ma'lumot va kuratorga yo'naltirish."
}

Kategoriya tanlash qoidalari:
- lead_taqsimlash: kurs so'rovi, ro'yxatdan o'tish, narx so'rovi
- platforma_muammosi: TaoBao/1688/Pinduoduo akkaunt blok, kirish muammosi
- tolov_tizimi: Alipay, UzCard, Humo, valyuta, to'lov o'tmadi
- kargo_logistika: trek kod, yuk holati, ombor manzili, yetkazib berish
- texnik_xatolik: ilova ochilmaydi, til muammosi, sayt ishlamaydi
- ommaviy_faq: kurs davomiyligi, sertifikat, dars vaqti, umumiy savollar
- shoshilinch_shikoyat: norozilik, kuratordan shikoyat, to'lov muammosi (3+ kun)"""


_model = None


def _get_model():
    global _model
    if _model is None:
        _model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
    return _model


def classify(user_text: str) -> dict:
    """Return classification dict. Falls back to defaults on error."""
    try:
        resp = _get_model().generate_content(user_text)
        raw = resp.text.strip()
        # strip markdown code fences if present
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
        data = json.loads(raw)
        return {
            "kategoriya": data.get("kategoriya", "ommaviy_faq"),
            "priority":   data.get("priority",   "medium"),
            "summary":    data.get("summary",     ""),
            "answer":     data.get("answer",      ""),
        }
    except Exception as e:
        return {
            "kategoriya": "ommaviy_faq",
            "priority":   "low",
            "summary":    "Tasniflab bo'lmadi",
            "answer":     (
                "Xabaringiz uchun rahmat! "
                "Kuratorimiz tez orada javob beradi. "
                f"(Texnik xato: {e})"
            ),
        }
