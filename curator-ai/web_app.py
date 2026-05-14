import os
import csv
import io
from flask import Flask, render_template, jsonify, request, send_file, abort
from flask_cors import CORS
from dotenv import load_dotenv
from database import init_db, get_messages, get_leads, get_stats, resolve_message

load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv("DASHBOARD_SECRET_KEY", "curator-ai-secret-2026")

DASHBOARD_TOKEN = os.getenv("DASHBOARD_TOKEN", "")  # optional simple auth


def _check_auth():
    if not DASHBOARD_TOKEN:
        return True
    token = request.headers.get("X-Dashboard-Token") or request.args.get("token", "")
    return token == DASHBOARD_TOKEN


@app.before_request
def auth_guard():
    if request.path.startswith("/api/") and not _check_auth():
        abort(401)


@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/api/stats")
def api_stats():
    return jsonify(get_stats())


@app.route("/api/messages")
def api_messages():
    category = request.args.get("category", "all")
    status   = request.args.get("status",   "all")
    limit    = int(request.args.get("limit",  "50"))
    offset   = int(request.args.get("offset", "0"))
    rows = get_messages(category=category, status=status, limit=limit, offset=offset)
    return jsonify(rows)


@app.route("/api/leads")
def api_leads():
    status = request.args.get("status")
    return jsonify(get_leads(status=status))


@app.route("/api/resolve/<int:msg_id>", methods=["POST"])
def api_resolve(msg_id):
    note = request.json.get("note", "") if request.is_json else ""
    resolve_message(msg_id, note=note)
    return jsonify({"ok": True})


@app.route("/api/export/csv")
def export_csv():
    rows = get_messages(limit=10000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "telegram_id", "username", "full_name",
        "category", "priority", "status", "summary",
        "text", "ai_answer", "created_at", "resolved_at"
    ])
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="curator_messages.csv",
    )


if __name__ == "__main__":
    init_db()
    port = int(os.getenv("DASHBOARD_PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
