import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "curator.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS messages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                username    TEXT,
                full_name   TEXT,
                text        TEXT NOT NULL,
                category    TEXT,
                priority    TEXT DEFAULT 'medium',
                summary     TEXT,
                ai_answer   TEXT,
                status      TEXT DEFAULT 'open',
                curator_note TEXT,
                created_at  TEXT NOT NULL,
                resolved_at TEXT
            );

            CREATE TABLE IF NOT EXISTS leads (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id  INTEGER REFERENCES messages(id),
                telegram_id INTEGER,
                full_name   TEXT,
                username    TEXT,
                interest    TEXT,
                assigned_to TEXT,
                status      TEXT DEFAULT 'new',
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS duty_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                curator_id  TEXT,
                started_at  TEXT,
                ended_at    TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
            CREATE INDEX IF NOT EXISTS idx_messages_status   ON messages(status);
            CREATE INDEX IF NOT EXISTS idx_messages_created  ON messages(created_at);
        """)


def save_message(telegram_id, username, full_name, text,
                 category, priority, summary, ai_answer):
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO messages
               (telegram_id, username, full_name, text,
                category, priority, summary, ai_answer, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (telegram_id, username, full_name, text,
             category, priority, summary, ai_answer,
             datetime.utcnow().isoformat())
        )
        return cur.lastrowid


def save_lead(message_id, telegram_id, full_name, username, interest, assigned_to):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO leads
               (message_id, telegram_id, full_name, username,
                interest, assigned_to, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (message_id, telegram_id, full_name, username,
             interest, assigned_to, datetime.utcnow().isoformat())
        )


def resolve_message(message_id, note=""):
    with get_conn() as conn:
        conn.execute(
            """UPDATE messages SET status='resolved',
               resolved_at=?, curator_note=? WHERE id=?""",
            (datetime.utcnow().isoformat(), note, message_id)
        )


def get_messages(category=None, status=None, limit=200, offset=0):
    sql = "SELECT * FROM messages WHERE 1=1"
    params = []
    if category and category != "all":
        sql += " AND category=?"
        params.append(category)
    if status and status != "all":
        sql += " AND status=?"
        params.append(status)
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params += [limit, offset]
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def get_leads(status=None, limit=100):
    sql = "SELECT * FROM leads WHERE 1=1"
    params = []
    if status:
        sql += " AND status=?"
        params.append(status)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def get_stats():
    with get_conn() as conn:
        total      = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        open_c     = conn.execute("SELECT COUNT(*) FROM messages WHERE status='open'").fetchone()[0]
        resolved   = conn.execute("SELECT COUNT(*) FROM messages WHERE status='resolved'").fetchone()[0]
        high_prior = conn.execute("SELECT COUNT(*) FROM messages WHERE priority='high' AND status='open'").fetchone()[0]
        leads_new  = conn.execute("SELECT COUNT(*) FROM leads WHERE status='new'").fetchone()[0]
        by_cat = conn.execute(
            "SELECT category, COUNT(*) as cnt FROM messages GROUP BY category"
        ).fetchall()
        today = datetime.utcnow().date().isoformat()
        today_cnt = conn.execute(
            "SELECT COUNT(*) FROM messages WHERE created_at LIKE ?",
            (today + "%",)
        ).fetchone()[0]
    return {
        "total": total,
        "open": open_c,
        "resolved": resolved,
        "high_priority": high_prior,
        "new_leads": leads_new,
        "by_category": {r["category"]: r["cnt"] for r in by_cat},
        "today": today_cnt,
    }
