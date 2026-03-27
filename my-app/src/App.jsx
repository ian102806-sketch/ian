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
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#1e293b' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' },
    btnPrimary: { padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    btnAttendance: { padding: '20px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', color: 'white', width: '100%' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' },
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    userHeader: { background: '#1e293b', padding: '15px 25px', borderRadius: '12px', color: '#fff', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    toast: { position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '10px', color: 'white', fontWeight: 'bold', zIndex: 1000 }
  };

  const showToast = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // 🛠️ COMBINED FETCH LOGIC: Ensures both personal and admin data load correctly
  const refreshData = useCallback(async (currentUser) => {
    if (!currentUser) return;

    // 1. Fetch Personal Logs
    const { data: userData, error: userError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (!userError) {
      setLogs(userData || []);
      const today = new Date().toISOString().split('T')[0];
      // Find active shift: Today's date AND no time_out yet
      const active = userData?.find(r => r.date === today && !r.time_out);
      setTodayRecord(active || null);
    }

    // 2. Fetch Admin Logs (if user is admin)
    if (currentUser.email === 'admin@test.com') {
      const { data: adminData } = await supabase
        .from('attendance')
        .select('*, profiles:user_id(id)')
        .order('created_at', { ascending: false });
      setAllRecords(adminData || []);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        refreshData(session.user);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        refreshData(session.user);
      } else {
        setUser(null);
        setLogs([]);
        setTodayRecord(null);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [refreshData]);

  const handleAttendance = async () => {
    try {
      if (!todayRecord) {
        // TIME IN
        const { error } = await supabase.from('attendance').insert([{ user_id: user.id }]);
        if (error) throw error;
        showToast("Logged In! 🟢");
      } else {
        // TIME OUT
        const { error } = await supabase
          .from('attendance')
          .update({ time_out: new Date().toISOString() })
          .eq('id', todayRecord.id);
        if (error) throw error;
        showToast("Logged Out! 🔴");
      }
      refreshData(user); // Reload UI immediately
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const filteredRecords = allRecords.filter(rec => {
    const numericId = rec.profiles?.id?.toString() || "";
    const matchesSearch = userSearch === '' || numericId.includes(userSearch);
    const matchesDate = dateFilter === '' || rec.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  if (loading) return <div style={s.container}>Loading WorkLog...</div>;

  return (
    <div style={s.container}>
      {notification.show && (
        <div style={{ ...s.toast, backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444' }}>
          {notification.message}
        </div>
      )}

      <div style={s.wrapper}>
        {!user ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
            <div style={s.card}>
              <h1 style={{ textAlign: 'center', marginBottom: '25px' }}>WorkLog</h1>
              <input style={s.input} placeholder="Email" onChange={e => setEmail(e.target.value)} />
              <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
              <button style={{ ...s.btnPrimary, width: '100%', marginBottom: '10px' }} onClick={() => handleAuth('login')}>Login</button>
              <button style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', width: '100%' }} onClick={() => handleAuth('signup')}>Register</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={s.userHeader}>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Logged in as:</div>
                <div style={{ fontWeight: 'bold' }}>{user.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => refreshData(user)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>🔄 Refresh</button>
                <button onClick={() => supabase.auth.signOut()} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setView('user')} style={{ ...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#fff' : '#475569', border: '1px solid #ddd' }}>Dashboard</button>
              {user.email === 'admin@test.com' && <button onClick={() => setView('admin')} style={s.btnAdmin}>Admin Panel</button>}
            </div>

            {view === 'admin' ? (
              <div style={s.card}>
                <h2 style={{ color: '#ef4444', marginTop: 0 }}>Admin: System Logs</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input type="date" style={s.input} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  <input type="text" style={s.input} placeholder="Search User #" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={s.tableHeader}>Log #</th><th style={s.tableHeader}>User #</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => (
                      <tr key={rec.id}>
                        <td style={s.td}>{rec.id}</td>
                        <td style={s.td}>User {rec.profiles?.id || '?'}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div style={s.card}>
                  <h3 style={{ marginTop: 0 }}>Attendance</h3>
                  <button 
                    onClick={handleAttendance} 
                    style={{ ...s.btnAttendance, background: todayRecord ? '#f59e0b' : '#10b981' }}
                  >
                    {todayRecord ? 'TIME OUT' : 'TIME IN'}
                  </button>
                  {todayRecord && (
                    <div style={{ textAlign: 'center', marginTop: '15px', color: '#64748b', fontSize: '14px' }}>
                      🟢 Active shift started at <b>{new Date(todayRecord.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
                    </div>
                  )}
                </div>

                <div style={s.card}>
                  <h3 style={{ marginTop: 0 }}>Personal History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? logs.map(log => (
                        <tr key={log.id}>
                          <td style={s.td}>{log.date}</td>
                          <td style={s.td}>{new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={{color: '#10b981', fontWeight: 'bold'}}>Active</span>}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="3" style={{...s.td, textAlign: 'center', color: '#94a3b8'}}>No history found for this account.</td></tr>
                      )}
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