from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from datetime import datetime, timedelta
import uuid
import os

app = Flask(__name__)
app.config["SECRET_KEY"] = "chatterbox-secret-2024"
app.config["JWT_SECRET_KEY"] = "chatterbox-jwt-secret-2024"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max upload

CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", async_mode="threading")
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ─── IN-MEMORY DATABASE ───────────────────────────────────────────────────────
# (In production, replace with SQLite/PostgreSQL)

ADMINS = {
    "admin1": {
        "id": "admin1", "name": "Admin Alex", "email": "alex@admin.com",
        "password": bcrypt.generate_password_hash("admin123").decode("utf-8"),
        "avatar": "AA", "role": "admin"
    },
    "admin2": {
        "id": "admin2", "name": "Admin Maya", "email": "maya@admin.com",
        "password": bcrypt.generate_password_hash("admin456").decode("utf-8"),
        "avatar": "AM", "role": "admin"
    },
}

USERS = {
    "u1": {"id":"u1","name":"Riya Sharma","email":"riya@mail.com","password":bcrypt.generate_password_hash("pass123").decode(),"avatar":"RS","status":"approved","bio":"Hey there! Using ChatterBox 🎉","online":False},
    "u2": {"id":"u2","name":"Karan Mehta","email":"karan@mail.com","password":bcrypt.generate_password_hash("pass123").decode(),"avatar":"KM","status":"approved","bio":"Available","online":False},
    "u3": {"id":"u3","name":"Priya Nair","email":"priya@mail.com","password":bcrypt.generate_password_hash("pass123").decode(),"avatar":"PN","status":"approved","bio":"Busy with work","online":False},
    "u4": {"id":"u4","name":"Arjun Das","email":"arjun@mail.com","password":bcrypt.generate_password_hash("pass123").decode(),"avatar":"AD","status":"pending","bio":"New here!","online":False},
    "u5": {"id":"u5","name":"Sneha Patel","email":"sneha@mail.com","password":bcrypt.generate_password_hash("pass123").decode(),"avatar":"SP","status":"pending","bio":"Excited to join!","online":False},
}

GROUPS = {
    "g1": {"id":"g1","name":"College Friends 🎓","members":["u1","u2","u3"],"avatar":"CF","createdBy":"u1","description":"Our squad!","createdAt":datetime.now().isoformat()},
    "g2": {"id":"g2","name":"Study Group 📚","members":["u1","u3"],"avatar":"SG","createdBy":"u3","description":"Let's ace it","createdAt":datetime.now().isoformat()},
}

MESSAGES = {
    "u1-u2": [
        {"id":"m1","from":"u1","text":"Hey Karan! What's up?","time":"10:00 AM","type":"text"},
        {"id":"m2","from":"u2","text":"All good! Ready for the hackathon?","time":"10:02 AM","type":"text"},
        {"id":"m3","from":"u1","text":"Absolutely! Let's crush it 🔥","time":"10:03 AM","type":"text"},
    ],
    "g1": [
        {"id":"m4","from":"u1","text":"Hey everyone! 👋","time":"11:00 AM","type":"text"},
        {"id":"m5","from":"u2","text":"Hey!! 🎉","time":"11:01 AM","type":"text"},
    ],
}

online_users = {}  # socket_id -> user_id

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def get_chat_key(id1, id2):
    return "-".join(sorted([id1, id2]))

def safe_user(u):
    """Return user without password"""
    return {k: v for k, v in u.items() if k != "password"}

# ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email", "").strip()
    password = data.get("password", "")

    # Check admins
    for admin in ADMINS.values():
        if admin["email"] == email and bcrypt.check_password_hash(admin["password"], password):
            token = create_access_token(identity=admin["id"])
            return jsonify({"token": token, "user": {k:v for k,v in admin.items() if k!="password"}}), 200

    # Check users
    for user in USERS.values():
        if user["email"] == email and bcrypt.check_password_hash(user["password"], password):
            if user["status"] == "pending":
                return jsonify({"error": "pending", "message": "Your account is awaiting admin approval"}), 403
            if user["status"] == "rejected":
                return jsonify({"error": "rejected", "message": "Your account request was rejected"}), 403
            token = create_access_token(identity=user["id"])
            return jsonify({"token": token, "user": safe_user(user)}), 200

    return jsonify({"error": "invalid", "message": "Invalid email or password"}), 401


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    bio = data.get("bio", "Hey there! Using ChatterBox")

    if not name or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    # Check duplicate email
    all_emails = [u["email"] for u in USERS.values()] + [a["email"] for a in ADMINS.values()]
    if email in all_emails:
        return jsonify({"error": "Email already registered"}), 409

    initials = "".join(w[0] for w in name.split()[:2]).upper()
    uid = "u" + str(uuid.uuid4())[:8]
    hashed = bcrypt.generate_password_hash(password).decode("utf-8")

    USERS[uid] = {
        "id": uid, "name": name, "email": email,
        "password": hashed, "avatar": initials,
        "status": "pending", "bio": bio, "online": False,
        "createdAt": datetime.now().isoformat()
    }

    # Notify admins via socket
    socketio.emit("new_join_request", {"user": safe_user(USERS[uid])}, room="admins")
    return jsonify({"message": "Registration submitted. Await admin approval."}), 201


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    if uid in ADMINS:
        return jsonify({k:v for k,v in ADMINS[uid].items() if k!="password"})
    if uid in USERS:
        return jsonify(safe_user(USERS[uid]))
    return jsonify({"error": "Not found"}), 404

# ─── USER ROUTES ──────────────────────────────────────────────────────────────
@app.route("/api/users", methods=["GET"])
@jwt_required()
def get_users():
    uid = get_jwt_identity()
    approved = [safe_user(u) for u in USERS.values() if u["status"] == "approved" and u["id"] != uid]
    return jsonify(approved)

# ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
@app.route("/api/admin/pending", methods=["GET"])
@jwt_required()
def get_pending():
    uid = get_jwt_identity()
    if uid not in ADMINS:
        return jsonify({"error": "Unauthorized"}), 403
    pending = [safe_user(u) for u in USERS.values() if u["status"] == "pending"]
    return jsonify(pending)


@app.route("/api/admin/approve/<user_id>", methods=["POST"])
@jwt_required()
def approve_user(user_id):
    uid = get_jwt_identity()
    if uid not in ADMINS:
        return jsonify({"error": "Unauthorized"}), 403
    if user_id not in USERS:
        return jsonify({"error": "User not found"}), 404
    USERS[user_id]["status"] = "approved"
    socketio.emit("account_approved", {"userId": user_id})
    return jsonify({"message": "User approved", "user": safe_user(USERS[user_id])})


@app.route("/api/admin/reject/<user_id>", methods=["POST"])
@jwt_required()
def reject_user(user_id):
    uid = get_jwt_identity()
    if uid not in ADMINS:
        return jsonify({"error": "Unauthorized"}), 403
    if user_id not in USERS:
        return jsonify({"error": "User not found"}), 404
    socketio.emit("account_rejected", {"userId": user_id})
    del USERS[user_id]
    return jsonify({"message": "User rejected and removed"})


@app.route("/api/admin/users", methods=["GET"])
@jwt_required()
def admin_get_users():
    uid = get_jwt_identity()
    if uid not in ADMINS:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify([safe_user(u) for u in USERS.values()])


@app.route("/api/admin/users/<user_id>", methods=["DELETE"])
@jwt_required()
def admin_remove_user(user_id):
    uid = get_jwt_identity()
    if uid not in ADMINS:
        return jsonify({"error": "Unauthorized"}), 403
    if user_id not in USERS:
        return jsonify({"error": "User not found"}), 404
    del USERS[user_id]
    return jsonify({"message": "User removed"})


@app.route("/api/admin/stats", methods=["GET"])
@jwt_required()
def admin_stats():
    uid = get_jwt_identity()
    if uid not in ADMINS:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify({
        "totalUsers": len(USERS),
        "approvedUsers": sum(1 for u in USERS.values() if u["status"] == "approved"),
        "pendingUsers": sum(1 for u in USERS.values() if u["status"] == "pending"),
        "onlineUsers": sum(1 for u in USERS.values() if u.get("online")),
        "totalGroups": len(GROUPS),
    })

# ─── GROUP ROUTES ──────────────────────────────────────────────────────────────
@app.route("/api/groups", methods=["GET"])
@jwt_required()
def get_groups():
    uid = get_jwt_identity()
    my_groups = [g for g in GROUPS.values() if uid in g["members"]]
    return jsonify(my_groups)


@app.route("/api/groups", methods=["POST"])
@jwt_required()
def create_group():
    uid = get_jwt_identity()
    data = request.json
    name = data.get("name", "").strip()
    members = data.get("members", [])
    description = data.get("description", "")

    if not name or not members:
        return jsonify({"error": "Name and members required"}), 400

    gid = "g" + str(uuid.uuid4())[:8]
    group = {
        "id": gid, "name": name,
        "members": [uid] + [m for m in members if m != uid],
        "avatar": name[:2].upper(), "createdBy": uid,
        "description": description,
        "createdAt": datetime.now().isoformat()
    }
    GROUPS[gid] = group

    for member_id in group["members"]:
        socketio.emit("group_created", group, room=f"user_{member_id}")

    return jsonify(group), 201

# ─── MESSAGE ROUTES ────────────────────────────────────────────────────────────
@app.route("/api/messages/<chat_id>", methods=["GET"])
@jwt_required()
def get_messages(chat_id):
    return jsonify(MESSAGES.get(chat_id, []))


@app.route("/api/messages/upload", methods=["POST"])
@jwt_required()
def upload_file():
    uid = get_jwt_identity()
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files["file"]
    chat_id = request.form.get("chatId")
    filename = file.filename
    file_data = file.read()
    import base64
    encoded = base64.b64encode(file_data).decode("utf-8")
    mimetype = file.mimetype

    msg = {
        "id": str(uuid.uuid4()),
        "from": uid,
        "text": filename,
        "time": datetime.now().strftime("%I:%M %p"),
        "type": "image" if mimetype.startswith("image/") else "file",
        "data": f"data:{mimetype};base64,{encoded}",
        "size": round(len(file_data) / 1024, 1)
    }
    if chat_id not in MESSAGES:
        MESSAGES[chat_id] = []
    MESSAGES[chat_id].append(msg)
    socketio.emit("new_message", {"chatId": chat_id, "message": msg}, room=f"chat_{chat_id}")
    return jsonify(msg), 201

# ─── SOCKET.IO EVENTS ─────────────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    print(f"Client connected: {request.sid}")


@socketio.on("disconnect")
def on_disconnect():
    uid = online_users.pop(request.sid, None)
    if uid and uid in USERS:
        USERS[uid]["online"] = False
        emit("user_offline", {"userId": uid}, broadcast=True)
    print(f"Client disconnected: {request.sid}")


@socketio.on("authenticate")
def on_authenticate(data):
    uid = data.get("userId")
    role = data.get("role")
    online_users[request.sid] = uid

    if role == "admin":
        join_room("admins")
    else:
        if uid and uid in USERS:
            USERS[uid]["online"] = True
            join_room(f"user_{uid}")
            emit("user_online", {"userId": uid}, broadcast=True)

        # Join all group rooms
        for group in GROUPS.values():
            if uid in group["members"]:
                join_room(f"chat_{group['id']}")


@socketio.on("join_chat")
def on_join_chat(data):
    chat_id = data.get("chatId")
    if chat_id:
        join_room(f"chat_{chat_id}")


@socketio.on("send_message")
def on_send_message(data):
    chat_id = data.get("chatId")
    msg = data.get("message")
    if not chat_id or not msg:
        return

    msg["id"] = str(uuid.uuid4())
    msg["time"] = datetime.now().strftime("%I:%M %p")

    if chat_id not in MESSAGES:
        MESSAGES[chat_id] = []
    MESSAGES[chat_id].append(msg)

    emit("new_message", {"chatId": chat_id, "message": msg}, room=f"chat_{chat_id}")


@socketio.on("typing")
def on_typing(data):
    emit("user_typing", data, room=f"chat_{data.get('chatId')}", include_self=False)


@socketio.on("stop_typing")
def on_stop_typing(data):
    emit("user_stop_typing", data, room=f"chat_{data.get('chatId')}", include_self=False)

if __name__ == "__main__":
    import eventlet
    import eventlet.wsgi
    print("🚀 ChatterBox Backend running!")
    socketio.run(app, debug=False, port=5000, host="0.0.0.0")
