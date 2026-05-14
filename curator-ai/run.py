"""
Ikki jarayonni birgalikda ishga tushiradi:
  - Telegram bot (asyncio)
  - Flask web dashboard (thread)
"""
import threading
import os
from dotenv import load_dotenv
from database import init_db
from web_app import app as flask_app

load_dotenv()


def run_flask():
    port = int(os.getenv("DASHBOARD_PORT", "5000"))
    flask_app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    init_db()

    # Flask ni alohida threadda ishga tushir
    t = threading.Thread(target=run_flask, daemon=True)
    t.start()
    print(f"✅ Dashboard: http://localhost:{os.getenv('DASHBOARD_PORT','5000')}")

    # Botni asosiy threadda ishga tushir
    from bot import main as bot_main
    bot_main()
