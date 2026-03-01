import { useState, useEffect, useRef, useCallback } from 'react';
import {
  authAPI, userAPI, adminAPI, groupAPI, messageAPI,
  connectSocket, getSocket, disconnectSocket, getChatKey
} from './api';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg: '#060d14', surface: '#0a1628', surface2: '#0f2033',
  border: '#1a2744', accent: '#4FC3F7', accentDark: '#1565C0',
  text: '#e8f0fe', muted: '#546E7A', muted2: '#78909C',
  success: '#4CAF50', danger: '#EF5350', warn: '#FF7043',
};

const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#82E0AA','#F1948A'];
const getColor = str => colors[(str?.charCodeAt(0) || 0) % colors.length];
const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Avatar({ text = '?', size = 40, online }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${getColor(text)}, ${getColor(text + 'x')})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: size * 0.35, letterSpacing: 1,
      }}>{text}</div>
      {online !== undefined && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28, borderRadius: '50%',
          background: online ? C.success : '#555', border: `2px solid ${C.bg}`,
        }} />
      )}
    </div>
  );
}

function Toast({ msg, type }) {
  const bgMap = { success: '#1B5E2033', error: '#B71C1C22', warn: '#E6510022' };
  const clrMap = { success: C.success, error: C.danger, warn: C.warn };
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 999,
      padding: '12px 20px', borderRadius: 12, fontSize: 13,
      background: bgMap[type] || bgMap.error, color: clrMap[type] || C.danger,
      border: `1px solid ${clrMap[type] || C.danger}44`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 320,
      animation: 'slideIn 0.3s ease',
    }}>{msg}</div>
  );
}

const inp = {
  padding: '11px 14px', background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 11, color: C.text, fontSize: 14, outline: 'none',
  fontFamily: 'Poppins', width: '100%', boxSizing: 'border-box',
};
const btn = (extra = {}) => ({
  padding: '11px 20px', border: 'none', borderRadius: 11,
  cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 14,
  transition: 'opacity 0.2s', ...extra
});

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', bio: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'error' });

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type }), 4000);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await authAPI.login(form.email, form.password);
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      } else {
        if (!form.name || !form.email || !form.password) { showToast('Please fill all fields'); return; }
        await authAPI.register(form.name, form.email, form.password, form.bio);
        showToast('✅ Registration submitted! Waiting for admin approval.', 'success');
        setMode('login'); setForm({ name: '', email: '', password: '', bio: '' });
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || 'Something went wrong';
      showToast(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Toast {...toast} />
      <div style={{ width: '100%', maxWidth: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: '40px 36px', boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.accent, letterSpacing: 1 }}>ChatterBox</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Private · Secure · Free</div>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: C.bg, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: 9, background: mode === m ? `linear-gradient(90deg,${C.accentDark},#0D47A1)` : 'none',
              border: 'none', borderRadius: 9, color: mode === m ? '#fff' : C.muted,
              cursor: 'pointer', fontFamily: 'Poppins', fontWeight: mode === m ? 700 : 400, fontSize: 13,
            }}>{m === 'login' ? 'Sign In' : 'Sign Up'}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && <>
            <input style={inp} value={form.name} onChange={set('name')} placeholder="Full name" />
            <input style={inp} value={form.bio} onChange={set('bio')} placeholder="Bio (optional)" />
          </>}
          <input style={inp} value={form.email} onChange={set('email')} placeholder="Email address" type="email" />
          <input style={inp} value={form.password} onChange={set('password')} placeholder="Password" type="password"
            onKeyDown={e => e.key === 'Enter' && submit()} />
          <button onClick={submit} disabled={loading} style={btn({
            background: `linear-gradient(135deg,${C.accentDark},#0D47A1)`, color: '#fff', marginTop: 4,
            opacity: loading ? 0.7 : 1, boxShadow: '0 4px 20px rgba(21,101,192,0.4)',
          })}>
            {loading ? '⏳ Please wait...' : mode === 'login' ? 'Sign In →' : 'Request Access →'}
          </button>
        </div>

        <div style={{ marginTop: 24, padding: 14, background: C.bg, borderRadius: 12, fontSize: 11, color: C.muted, lineHeight: 1.9 }}>
          <div style={{ color: C.accent, fontWeight: 600, marginBottom: 4 }}>🔑 Demo Accounts</div>
          <div>Admin: alex@admin.com / admin123</div>
          <div>Admin: maya@admin.com / admin456</div>
          <div>User: riya@mail.com / pass123</div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ admin, onLogout }) {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [pending, setPending] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '' }), 3000); };

  useEffect(() => {
    adminAPI.getStats().then(r => setStats(r.data));
    adminAPI.getPending().then(r => setPending(r.data));
    adminAPI.getAllUsers().then(r => setAllUsers(r.data));

    // Listen for new join requests in real time
    const socket = connectSocket(admin.id, 'admin');
    socket.on('new_join_request', ({ user }) => {
      setPending(p => [...p, user]);
      setStats(s => ({ ...s, pendingUsers: (s.pendingUsers || 0) + 1 }));
      showToast(`New join request from ${user.name}!`);
    });
    return () => socket.off('new_join_request');
  }, [admin.id]);

  const approve = async (id) => {
    await adminAPI.approve(id);
    const user = pending.find(u => u.id === id);
    setPending(p => p.filter(u => u.id !== id));
    setAllUsers(u => [...u, { ...user, status: 'approved' }]);
    setStats(s => ({ ...s, pendingUsers: s.pendingUsers - 1, approvedUsers: s.approvedUsers + 1 }));
    showToast(`✅ ${user?.name} approved!`);
  };

  const reject = async (id) => {
    const user = pending.find(u => u.id === id);
    await adminAPI.reject(id);
    setPending(p => p.filter(u => u.id !== id));
    setStats(s => ({ ...s, pendingUsers: s.pendingUsers - 1 }));
    showToast(`Removed ${user?.name}`, 'warn');
  };

  const removeUser = async (id) => {
    await adminAPI.removeUser(id);
    setAllUsers(u => u.filter(x => x.id !== id));
    showToast('User removed', 'warn');
  };

  const navItems = [
    { id: 'overview', icon: '⚡', label: 'Overview' },
    { id: 'requests', icon: '🔔', label: `Requests (${pending.length})` },
    { id: 'users', icon: '👥', label: 'Users' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: 'Poppins' }}>
      <Toast {...toast} />

      {/* Sidebar */}
      <div style={{ width: 260, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>⚙ ChatterBox</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 1 }}>ADMIN CONTROL CENTER</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: 10, background: C.surface2, borderRadius: 10 }}>
            <Avatar text={admin.avatar} size={36} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{admin.name}</div>
              <div style={{ fontSize: 10, color: C.accent }}>● Super Admin</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              width: '100%', padding: '12px 16px', margin: '3px 0',
              background: tab === item.id ? `linear-gradient(90deg,${C.accentDark},#0D47A1)` : 'transparent',
              border: 'none', borderRadius: 10,
              color: tab === item.id ? '#fff' : C.muted,
              fontSize: 13, fontWeight: tab === item.id ? 700 : 500,
              textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => { localStorage.removeItem('token'); disconnectSocket(); onLogout(); }} style={btn({
            width: '100%', background: '#1a0a0a', color: C.danger, border: `1px solid #4a1a1a`, fontSize: 13
          })}>⬅ Logout</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {tab === 'overview' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800 }}>Dashboard Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 32 }}>
              {[
                { label: 'Total Users', value: stats.totalUsers || 0, icon: '👥', c: C.accentDark },
                { label: 'Pending', value: stats.pendingUsers || 0, icon: '🔔', c: '#E65100' },
                { label: 'Online Now', value: stats.onlineUsers || 0, icon: '🟢', c: '#1B5E20' },
                { label: 'Groups', value: stats.totalGroups || 0, icon: '💬', c: '#4A148C' },
              ].map(s => (
                <div key={s.label} style={{ background: `${s.c}22`, border: `1px solid ${s.c}44`, borderRadius: 16, padding: '20px 24px' }}>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {pending.length > 0 && (
              <>
                <h3 style={{ margin: '0 0 16px', color: C.warn }}>🔔 Pending Approvals</h3>
                {pending.slice(0, 3).map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: C.surface, borderRadius: 12, marginBottom: 10, border: `1px solid ${C.border}` }}>
                    <Avatar text={u.avatar} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                    </div>
                    <button onClick={() => approve(u.id)} style={btn({ background: '#1B5E20', color: '#A5D6A7', fontSize: 13 })}>✓ Approve</button>
                    <button onClick={() => reject(u.id)} style={btn({ background: '#B71C1C', color: '#FFCDD2', fontSize: 13 })}>✗ Reject</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800 }}>Join Requests</h2>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                No pending requests!
              </div>
            ) : pending.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: C.surface, borderRadius: 14, marginBottom: 12, border: `1px solid ${C.warn}44` }}>
                <Avatar text={u.avatar} size={50} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                  <div style={{ fontSize: 12, color: C.muted2, marginTop: 4 }}>"{u.bio}"</div>
                </div>
                <button onClick={() => approve(u.id)} style={btn({ background: 'linear-gradient(90deg,#2E7D32,#1B5E20)', color: '#fff' })}>✓ Approve</button>
                <button onClick={() => reject(u.id)} style={btn({ background: 'linear-gradient(90deg,#C62828,#B71C1C)', color: '#fff' })}>✗ Reject</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800 }}>All Users ({allUsers.length})</h2>
            {allUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 8 }}>
                <Avatar text={u.avatar} size={44} online={u.online} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{u.email} · {u.bio}</div>
                </div>
                <div style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: u.online ? '#1B5E2033' : C.surface2, color: u.online ? C.success : C.muted }}>
                  {u.online ? '🟢 Online' : '⚫ Offline'}
                </div>
                <button onClick={() => removeUser(u.id)} style={btn({ background: '#1a0a0a', color: C.danger, border: `1px solid #4a1a1a`, fontSize: 12 })}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHAT APP ─────────────────────────────────────────────────────────────────
function ChatApp({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState({});
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState('chats');
  const [search, setSearch] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', desc: '', members: [] });
  const [typing, setTyping] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const [toast, setToast] = useState({ msg: '' });
  const msgEnd = useRef(null);
  const typingTimer = useRef(null);
  const fileRef = useRef(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '' }), 3000); };

  // Load initial data + connect socket
  useEffect(() => {
    userAPI.getAll().then(r => setUsers(r.data));
    groupAPI.getMyGroups().then(r => setGroups(r.data));

    const socket = connectSocket(currentUser.id, 'user');

    socket.on('new_message', ({ chatId, message }) => {
      setMessages(m => ({ ...m, [chatId]: [...(m[chatId] || []), message] }));
    });

    socket.on('user_online', ({ userId }) => setUsers(u => u.map(x => x.id === userId ? { ...x, online: true } : x)));
    socket.on('user_offline', ({ userId }) => setUsers(u => u.map(x => x.id === userId ? { ...x, online: false } : x)));
    socket.on('group_created', (group) => setGroups(g => [...g.filter(x => x.id !== group.id), group]));
    socket.on('user_typing', ({ fromId, chatId }) => setTyping(t => ({ ...t, [chatId]: fromId })));
    socket.on('user_stop_typing', ({ chatId }) => setTyping(t => { const n = { ...t }; delete n[chatId]; return n; }));

    return () => {
      socket.off('new_message'); socket.off('user_online'); socket.off('user_offline');
      socket.off('group_created'); socket.off('user_typing'); socket.off('user_stop_typing');
    };
  }, [currentUser.id]);

  // Load messages when chat selected
  useEffect(() => {
    if (!selected) return;
    const chatId = selected.type === 'group' ? selected.id : getChatKey(currentUser.id, selected.id);
    if (!messages[chatId]) {
      messageAPI.getMessages(chatId).then(r => setMessages(m => ({ ...m, [chatId]: r.data })));
    }
    getSocket()?.emit('join_chat', { chatId });
  }, [selected]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selected]);

  const chatId = selected ? (selected.type === 'group' ? selected.id : getChatKey(currentUser.id, selected.id)) : null;
  const chatMessages = chatId ? (messages[chatId] || []) : [];

  const sendMessage = () => {
    if (!input.trim() || !chatId) return;
    const msg = { from: currentUser.id, text: input.trim(), time: timeNow(), type: 'text' };
    getSocket()?.emit('send_message', { chatId, message: msg });
    getSocket()?.emit('stop_typing', { chatId, fromId: currentUser.id });
    setInput('');
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    getSocket()?.emit('typing', { chatId, fromId: currentUser.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => getSocket()?.emit('stop_typing', { chatId }), 1500);
  };

  const sendFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;
    try {
      await messageAPI.uploadFile(chatId, file);
      showToast('📎 File sent!');
    } catch { showToast('File upload failed', 'error'); }
    e.target.value = '';
  };

  const createGroup = async () => {
    if (!groupForm.name || groupForm.members.length === 0) return;
    try {
      const res = await groupAPI.create(groupForm.name, groupForm.members, groupForm.desc);
      setGroups(g => [...g, res.data]);
      setSelected({ type: 'group', id: res.data.id });
      setTab('groups');
      setShowNewGroup(false);
      setGroupForm({ name: '', desc: '', members: [] });
    } catch { showToast('Failed to create group', 'error'); }
  };

  const selEntity = selected ? (selected.type === 'group' ? groups.find(g => g.id === selected.id) : users.find(u => u.id === selected.id)) : null;
  const lastMsg = (type, id) => {
    const key = type === 'group' ? id : getChatKey(currentUser.id, id);
    const msgs = messages[key];
    return msgs?.[msgs.length - 1];
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: 'Poppins' }}>
      <Toast {...toast} />

      {/* Left Panel */}
      <div style={{ width: 340, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '18px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>💬 ChatterBox</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowNewGroup(true)} title="New Group" style={{ background: C.border, border: 'none', borderRadius: 8, color: '#90CAF9', padding: '7px 10px', cursor: 'pointer', fontSize: 14 }}>👥+</button>
              <button onClick={() => setShowProfile(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <Avatar text={currentUser.avatar} size={34} online={true} />
              </button>
              <button onClick={() => { localStorage.removeItem('token'); disconnectSocket(); onLogout(); }} title="Logout" style={{ background: '#1a0a0a', border: `1px solid #4a1a1a`, borderRadius: 8, color: C.danger, padding: '7px 10px', cursor: 'pointer', fontSize: 12 }}>⬅</button>
            </div>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search..." style={{ ...inp, padding: '9px 14px' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {['chats', 'groups', 'calls'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: 11, background: 'none', border: 'none',
              borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
              color: tab === t ? C.accent : C.muted, cursor: 'pointer',
              fontSize: 11, fontWeight: tab === t ? 700 : 400, fontFamily: 'Poppins',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>{t}</button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'chats' && users.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => {
            const last = lastMsg('user', u.id);
            const isSelected = selected?.type === 'user' && selected?.id === u.id;
            const key = getChatKey(currentUser.id, u.id);
            const isTyping = typing[key];
            return (
              <div key={u.id} onClick={() => setSelected({ type: 'user', id: u.id })} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                background: isSelected ? C.surface2 : 'transparent', cursor: 'pointer',
                borderLeft: isSelected ? `3px solid ${C.accent}` : '3px solid transparent',
              }}>
                <Avatar text={u.avatar} size={44} online={u.online} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: isTyping ? '#4CAF50' : C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isTyping ? 'typing...' : last ? (last.from === currentUser.id ? 'You: ' : '') + (last.type === 'file' ? '📎 ' + last.text : last.type === 'image' ? '🖼 Photo' : last.text) : u.bio}
                  </div>
                </div>
                {last && <div style={{ fontSize: 10, color: C.muted2 }}>{last.time}</div>}
              </div>
            );
          })}

          {tab === 'groups' && (
            <>
              {groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase())).map(g => {
                const last = lastMsg('group', g.id);
                const isSelected = selected?.type === 'group' && selected?.id === g.id;
                return (
                  <div key={g.id} onClick={() => setSelected({ type: 'group', id: g.id })} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                    background: isSelected ? C.surface2 : 'transparent', cursor: 'pointer',
                    borderLeft: isSelected ? `3px solid ${C.accent}` : '3px solid transparent',
                  }}>
                    <Avatar text={g.avatar} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {last ? last.text : g.description}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div onClick={() => setShowNewGroup(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 600 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>+</div>
                Create New Group
              </div>
            </>
          )}

          {tab === 'calls' && (
            <div style={{ padding: 20 }}>
              <div style={{ textAlign: 'center', color: C.muted, paddingTop: 30, marginBottom: 20, fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📞</div>
                Voice & Video calls coming in v2!
              </div>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <Avatar text={u.avatar} size={38} online={u.online} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <button style={{ background: C.border, border: 'none', borderRadius: 8, color: '#4CAF50', padding: '7px 12px', cursor: 'pointer', fontSize: 16 }}>📞</button>
                  <button style={{ background: C.border, border: 'none', borderRadius: 8, color: '#42A5F5', padding: '7px 12px', cursor: 'pointer', fontSize: 16 }}>📹</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Profile */}
        {showProfile && (
          <div style={{ padding: 16, background: C.surface2, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar text={currentUser.avatar} size={44} online />
              <div>
                <div style={{ fontWeight: 700 }}>{currentUser.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{currentUser.email}</div>
                <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>🟢 Active now</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.muted2 }}>Welcome to ChatterBox</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>Select a chat to start messaging</div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ padding: '14px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar text={selEntity?.avatar} size={44} online={selected.type === 'user' ? selEntity?.online : undefined} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selEntity?.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {selected.type === 'user'
                    ? (selEntity?.online ? '🟢 Online' : '⚫ Last seen recently')
                    : `👥 ${selEntity?.members?.length} members`}
                </div>
              </div>
              <button title="Video Call" style={{ background: C.border, border: 'none', borderRadius: 10, color: '#42A5F5', padding: '9px 13px', cursor: 'pointer', fontSize: 18 }}>📹</button>
              <button title="Voice Call" style={{ background: C.border, border: 'none', borderRadius: 10, color: '#4CAF50', padding: '9px 13px', cursor: 'pointer', fontSize: 18 }}>📞</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatMessages.map(msg => {
                const isMine = msg.from === currentUser.id;
                const sender = users.find(u => u.id === msg.from);
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '68%' }}>
                      {!isMine && selected.type === 'group' && (
                        <div style={{ fontSize: 11, color: C.accent, marginBottom: 3, paddingLeft: 4 }}>{sender?.name}</div>
                      )}
                      <div style={{
                        padding: msg.type === 'image' ? '6px' : '10px 14px',
                        background: isMine ? `linear-gradient(135deg,${C.accentDark},#0D47A1)` : C.surface,
                        borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        border: isMine ? 'none' : `1px solid ${C.border}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}>
                        {msg.type === 'image' ? (
                          <img src={msg.data} alt={msg.text} style={{ maxWidth: 220, maxHeight: 200, borderRadius: 10, display: 'block' }} />
                        ) : msg.type === 'file' ? (
                          <a href={msg.data} download={msg.text} style={{ color: '#90CAF9', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            📎 <span>{msg.text}</span>
                          </a>
                        ) : (
                          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.text}</div>
                        )}
                        <div style={{ fontSize: 10, color: isMine ? '#90CAF9' : C.muted2, textAlign: 'right', marginTop: 4 }}>
                          {msg.time} {isMine && '✓✓'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {typing[chatId] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', maxWidth: 100, background: C.surface, borderRadius: '16px 16px 16px 4px', border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: '#4CAF50' }}>typing</span>
                  <span style={{ fontSize: 18, animation: 'pulse 1s infinite' }}>...</span>
                </div>
              )}
              <div ref={msgEnd} />
            </div>

            {/* Input Bar */}
            <div style={{ padding: '12px 20px', background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={sendFile} />
              <button onClick={() => fileRef.current?.click()} title="Attach" style={{ background: C.border, border: 'none', borderRadius: 10, color: '#90CAF9', padding: '11px 14px', cursor: 'pointer', fontSize: 16 }}>📎</button>
              <input value={input} onChange={handleTyping} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." style={{ ...inp, flex: 1 }} />
              <button onClick={sendMessage} style={btn({ background: `linear-gradient(135deg,${C.accentDark},#0D47A1)`, color: '#fff', fontSize: 18, padding: '11px 20px' })}>➤</button>
            </div>
          </>
        )}
      </div>

      {/* New Group Modal */}
      {showNewGroup && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: 380 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>Create New Group</h3>
            <input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="Group name..." style={{ ...inp, marginBottom: 12 }} />
            <input value={groupForm.desc} onChange={e => setGroupForm(f => ({ ...f, desc: e.target.value }))} placeholder="Description (optional)..." style={{ ...inp, marginBottom: 16 }} />
            <div style={{ fontSize: 13, color: C.muted2, marginBottom: 10 }}>Select members:</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
              {users.map(u => (
                <div key={u.id} onClick={() => setGroupForm(f => ({ ...f, members: f.members.includes(u.id) ? f.members.filter(x => x !== u.id) : [...f.members, u.id] }))} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, cursor: 'pointer',
                  background: groupForm.members.includes(u.id) ? C.surface2 : 'transparent', marginBottom: 4,
                  border: groupForm.members.includes(u.id) ? `1px solid ${C.accentDark}` : '1px solid transparent',
                }}>
                  <Avatar text={u.avatar} size={36} />
                  <div style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{u.name}</div>
                  {groupForm.members.includes(u.id) && <div style={{ color: C.accent }}>✓</div>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowNewGroup(false); setGroupForm({ name: '', desc: '', members: [] }); }} style={btn({ flex: 1, background: C.border, color: C.muted2 })}>Cancel</button>
              <button onClick={createGroup} disabled={!groupForm.name || groupForm.members.length === 0} style={btn({ flex: 1, background: `linear-gradient(90deg,${C.accentDark},#0D47A1)`, color: '#fff', opacity: (!groupForm.name || groupForm.members.length === 0) ? 0.5 : 1 })}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    authAPI.me().then(r => { setUser(r.data); setLoading(false); }).catch(() => { localStorage.removeItem('token'); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d14', color: '#4FC3F7', fontFamily: 'Poppins', fontSize: 18, fontWeight: 700 }}>
      💬 Loading ChatterBox...
    </div>
  );

  if (!user) return <AuthScreen onLogin={setUser} />;
  if (user.role === 'admin') return <AdminDashboard admin={user} onLogout={() => setUser(null)} />;
  return <ChatApp currentUser={user} onLogout={() => setUser(null)} />;
}
