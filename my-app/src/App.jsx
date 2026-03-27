import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [allRecords, setAllRecords] = useState([]); 
  const [view, setView] = useState('user'); 
  const [dateFilter, setDateFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [todayRecord, setTodayRecord] = useState(null);
  // NEW: Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#1e293b' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' },
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b' },
    idBadge: { backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#2563eb', fontWeight: '600' },
    userLabel: { background: '#1e293b', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', color: '#fff', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    toast: { position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, transition: 'all 0.3s ease' }
  };

  const showToast = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchUserLogs = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setLogs(data || []);
      const today = new Date().toISOString().split('T')[0];
      const activeShift = data?.find(r => r.date === today && !r.time_out);
      setTodayRecord(activeShift || null);
    }
  }, []);

  const fetchAllRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, profiles:user_id(id)')
      .order('date', { ascending: false });
    
    if (!error) setAllRecords(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserLogs(session.user.id);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserLogs(session.user.id);
      } else {
        setUser(null);
        setLogs([]);
        setTodayRecord(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchUserLogs]);

  useEffect(() => {
    if (view === 'admin') fetchAllRecords();
  }, [view, fetchAllRecords]);

  const handleAuth = async (type) => {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    
    if (error) showToast(error.message, 'error');
    else if (type === 'signup') showToast("Registration successful! Please login.");
  };

  const handleAttendance = async () => {
    if (!todayRecord) {
      const { error } = await supabase.from('attendance').insert([{ user_id: user.id }]);
      if (!error) showToast("Successfully Timed In! 🟢");
      else showToast("Failed to Time In.", "error");
    } else {
      const { error } = await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
      if (!error) showToast("Successfully Timed Out! 🔴");
      else showToast("Failed to Time Out.", "error");
    }
    fetchUserLogs(user.id);
  };

  const filteredRecords = allRecords.filter(rec => {
    const numericId = rec.profiles?.id?.toString() || "";
    const matchesSearch = userSearch === '' || numericId.includes(userSearch);
    const matchesDate = dateFilter === '' || rec.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  if (loading) return <div style={s.container}>Loading...</div>;

  return (
    <div style={s.container}>
      {/* SUCCESS/ERROR TOAST */}
      {notification.show && (
        <div style={{ ...s.toast, backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444' }}>
          {notification.message}
        </div>
      )}

      <div style={s.wrapper}>
        {!user ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
            <div style={{ ...s.card, width: '350px', textAlign: 'center' }}>
              <h1 style={{ marginBottom: '25px' }}>WorkLog</h1>
              <input style={s.input} placeholder="Email" onChange={e => setEmail(e.target.value)} />
              <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button style={s.btnPrimary} onClick={() => handleAuth('login')}>Login</button>
                <button style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px' }} onClick={() => handleAuth('signup')}>
                  Create New Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* USER REMINDER HEADER */}
            <div style={s.userLabel}>
              <span>👤 Currently logged as: <strong>{user.email}</strong></span>
              <button onClick={() => supabase.auth.signOut()} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setView('user')} style={{ ...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#fff' : '#475569', border: '1px solid #ddd' }}>Dashboard</button>
              {user.email === 'admin@test.com' && <button onClick={() => setView('admin')} style={s.btnAdmin}>Admin Panel</button>}
            </div>

            {view === 'admin' ? (
              <div style={s.card}>
                <h2>Admin: All Logs</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input type="date" style={s.input} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  <input type="text" style={s.input} placeholder="User #" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={s.tableHeader}>Log #</th><th style={s.tableHeader}>User #</th><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => (
                      <tr key={rec.id}>
                        <td style={s.td}><span style={s.idBadge}>{rec.id}</span></td>
                        <td style={s.td}>User {rec.profiles?.id || '?'}</td>
                        <td style={s.td}>{rec.date}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={s.card}>
                  <h3>Clock In/Out</h3>
                  <button onClick={handleAttendance} style={{ ...s.btnPrimary, background: todayRecord ? '#f59e0b' : '#10b981', width: '100%', padding: '25px', fontSize: '1.2rem' }}>
                    {todayRecord ? 'TIME OUT' : 'TIME IN'}
                  </button>
                </div>
                <div style={s.card}>
                  <h3>My History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td style={s.td}>{log.date}</td>
                          <td style={s.td}>{new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={{color:'#10b981'}}>Active</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}