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
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    // Styling for your new Action column
    btnDelete: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' },
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b' },
    userLabel: { background: '#1e293b', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', color: '#fff', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    toast: { position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: 'bold', zIndex: 1000 }
  };

  const showToast = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // FIX: Uses session.user.id (the UUID) to match your table data
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
      .select('*, profiles:user_id(id, email)')
      .order('created_at', { ascending: false });
    
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

  const handleAttendance = async () => {
    if (!todayRecord) {
      await supabase.from('attendance').insert([{ user_id: user.id }]);
      showToast("Timed In! 🟢");
    } else {
      await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
      showToast("Timed Out! 🔴");
    }
    fetchUserLogs(user.id);
  };

  const deleteLog = async (id) => {
    if (window.confirm("Delete this log permanently?")) {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (!error) {
        showToast("Log deleted");
        fetchAllRecords();
      }
    }
  };

  const filteredRecords = allRecords.filter(rec => {
    const userEmail = rec.profiles?.email?.toLowerCase() || "";
    const matchesSearch = userSearch === '' || userEmail.includes(userSearch.toLowerCase());
    const matchesDate = dateFilter === '' || rec.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  if (loading) return <div style={s.container}>Loading...</div>;

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
            <div style={{ ...s.card, width: '350px', textAlign: 'center' }}>
              <h1>WorkLog</h1>
              <input style={s.input} placeholder="Email" onChange={e => setEmail(e.target.value)} />
              <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
              <button style={{...s.btnPrimary, width:'100%'}} onClick={() => supabase.auth.signInWithPassword({ email, password })}>Login</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={s.userLabel}>
              <span>👤 <strong>{user.email}</strong></span>
              <button onClick={() => supabase.auth.signOut()} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
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
                  <input type="text" style={s.input} placeholder="Search email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={s.tableHeader}>User</th><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th><th style={s.tableHeader}>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => (
                      <tr key={rec.id}>
                        <td style={s.td}>{rec.profiles?.email || 'Unknown'}</td>
                        <td style={s.td}>{rec.date}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                        <td style={s.td}><button style={s.btnDelete} onClick={() => deleteLog(rec.id)}>Delete</button></td>
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
                      {logs.length > 0 ? logs.map(log => (
                        <tr key={log.id}>
                          <td style={s.td}>{log.date}</td>
                          <td style={s.td}>{new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={{color:'#10b981'}}>Active</span>}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="3" style={{...s.td, textAlign:'center'}}>No personal history found.</td></tr>
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