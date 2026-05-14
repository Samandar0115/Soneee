import os
import asyncio
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, filters, ContextTypes
)
from dotenv import load_dotenv
from database import init_db, save_message, save_lead, resolve_message, get_stats
from ai_classifier import classify

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BOT_TOKEN       = os.getenv("TELEGRAM_BOT_TOKEN", "")
CURATOR_IDS_RAW = os.getenv("DUTY_CURATORS", "")
DIRECTOR_ID     = os.getenv("DIRECTOR_CHAT_ID", "")

DUTY_CURATORS = [c.strip() for c in CURATOR_IDS_RAW.split(",") if c.strip()]

# Category config
CAT_INFO = {
    "lead_taqsimlash":    {"icon": "🎯", "label": "Lead",           "color": "🔵"},
    "platforma_muammosi": {"icon": "🚫", "label": "Platforma",      "color": "🔴"},
    "tolov_tizimi":       {"icon": "💳", "label": "To'lov",         "color": "🟡"},
    "kargo_logistika":    {"icon": "📦", "label": "Kargo",          "color": "🟢"},
    "texnik_xatolik":     {"icon": "⚙️", "label": "Texnik",         "color": "🟣"},
    "ommaviy_faq":        {"icon": "❓", "label": "FAQ",            "color": "⚪"},
    "shoshilinch_shikoyat":{"icon":"🚨", "label": "Shoshilinch",    "color": "🔴"},
}
PRIORITY_EMOJI = {"high": "🔴", "medium": "🟡", "low": "🟢"}


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    name = update.effective_user.first_name or "Talaba"
    await update.message.reply_text(
        f"Assalomu alaykum, {name}! 👋\n\n"
        "Men — *Marketplace Education* markazining AI yordamchisiman. 🤖\n\n"
        "TaoBao, 1688, Pinduoduo bo'yicha savollaringizni yozing.\n"
        "Har qanday muammo yoki savolga javob beraman!\n\n"
        "_Masalan: «TaoBao akkauntim bloklanib qoldi» yoki «Kurs narxi qancha?»_",
        parse_mode="Markdown"
    )


async def stats_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    s = get_stats()
    cats = "\n".join(
        f"  {CAT_INFO.get(k, {}).get('icon','•')} {k}: *{v}*"
        for k, v in s["by_category"].items()
    )
    await update.message.reply_text(
        f"📊 *Tizim statistikasi*\n\n"
        f"Bugun: *{s['today']}* xabar\n"
        f"Jami: *{s['total']}*\n"
        f"Ochiq: *{s['open']}*\n"
        f"Yopilgan: *{s['resolved']}*\n"
        f"🔴 Yuqori prioritet: *{s['high_priority']}*\n"
        f"🎯 Yangi leadlar: *{s['new_leads']}*\n\n"
        f"*Kategoriyalar:*\n{cats}",
        parse_mode="Markdown"
    )


async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = update.message.text or ""
    if not text.strip():
        return

    # Typing indicator
    await ctx.bot.send_chat_action(update.effective_chat.id, "typing")

    # AI classification
    result = classify(text)
    cat      = result["kategoriya"]
    priority = result["priority"]
    summary  = result["summary"]
    answer   = result["answer"]

    info = CAT_INFO.get(cat, {"icon": "❓", "label": cat, "color": "⚪"})

    # Save to DB
    msg_id = save_message(
        telegram_id=user.id,
        username=user.username or "",
        full_name=user.full_name or "",
        text=text,
        category=cat,
        priority=priority,
        summary=summary,
        ai_answer=answer,
    )

    # Reply to user
    reply = (
        f"{info['icon']} *{info['label']}*\n\n"
        f"{answer}\n\n"
        f"_Agar savol qolsa, kuratorimiz tez orada yordam beradi!_ ✅"
    )
    await update.message.reply_text(reply, parse_mode="Markdown")

    # Notify duty curators
    await _notify_curators(ctx, user, text, cat, priority, summary, msg_id)

    # Extra: save lead if applicable
    if cat == "lead_taqsimlash":
        assigned = DUTY_CURATORS[0] if DUTY_CURATORS else "unassigned"
        save_lead(msg_id, user.id, user.full_name or "", user.username or "", text, assigned)

    # Escalate urgent to director
    if cat == "shoshilinch_shikoyat" and DIRECTOR_ID:
        await _escalate_director(ctx, user, text, summary, msg_id)


async def _notify_curators(ctx, user, text, cat, priority, summary, msg_id):
    if not DUTY_CURATORS:
        return
    info = CAT_INFO.get(cat, {"icon": "❓", "label": cat})
    p_emoji = PRIORITY_EMOJI.get(priority, "⚪")
    notif = (
        f"📬 *Yangi xabar #{msg_id}*\n\n"
        f"👤 {user.full_name} (@{user.username or 'noma'lum'})\n"
        f"{info['icon']} Kategoriya: *{info['label']}*\n"
        f"{p_emoji} Prioritet: *{priority.upper()}*\n\n"
        f"📝 *Xabar:*\n_{text[:200]}_\n\n"
        f"💡 *Qisqacha:* {summary}"
    )
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Yopish", callback_data=f"resolve_{msg_id}"),
        InlineKeyboardButton("💬 Javob", url=f"tg://user?id={user.id}"),
    ]])
    for curator_id in DUTY_CURATORS:
        try:
            await ctx.bot.send_message(
                chat_id=curator_id,
                text=notif,
                parse_mode="Markdown",
                reply_markup=keyboard,
            )
        except Exception as e:
            log.warning(f"Kurator {curator_id} ga xabar yuborib bo'lmadi: {e}")


async def _escalate_director(ctx, user, text, summary, msg_id):
    msg = (
        f"🚨 *SHOSHILINCH SHIKOYAT #{msg_id}*\n\n"
        f"👤 {user.full_name} (@{user.username or 'noma'lum'})\n"
        f"📝 _{text[:300]}_\n\n"
        f"💡 {summary}\n\n"
        f"⚡ Darhol kurator bilan bog'laning!"
    )
    try:
        await ctx.bot.send_message(
            chat_id=DIRECTOR_ID,
            text=msg,
            parse_mode="Markdown",
        )
    except Exception as e:
        log.warning(f"Direktoga xabar yuborib bo'lmadi: {e}")


async def button_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data or ""
    if data.startswith("resolve_"):
        msg_id = int(data.split("_")[1])
        resolve_message(msg_id, note=f"Kurator @{query.from_user.username} yopdi")
        await query.edit_message_reply_markup(reply_markup=None)
        await query.message.reply_text(f"✅ Xabar #{msg_id} yopildi.")


def main():
    init_db()
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start",  start))
    app.add_handler(CommandHandler("stats",  stats_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    log.info("Bot ishga tushdi...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
