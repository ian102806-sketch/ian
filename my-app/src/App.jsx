import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [allRecords, setAllRecords] = useState([]); 
  const [todayRecord, setTodayRecord] = useState(null);
  const [view, setView] = useState('user'); 
  const [dateFilter, setDateFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // UI Styles with forced dark text colors
  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '10px', color: '#1e293b' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    btnDelete: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800' },
    // FIXED: Explicitly set text to dark slate (#1e293b)
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b' },
    badge: (color) => ({ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: color, color: 'white' })
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchAttendance(session.user.id);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAttendance(session.user.id);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  async function fetchAttendance(userId) {
    const { data } = await supabase.from('attendance').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    setTodayRecord(data?.find(r => r.date === today && !r.time_out));
  }

  async function fetchAllRecords() {
    const { data } = await supabase.from('attendance').select('*').order('created_at', { ascending: false });
    setAllRecords(data || []);
  }

  const handleAttendance = async () => {
    if (!todayRecord) {
      await supabase.from('attendance').insert([{ user_id: user.id }]);
    } else {
      await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
    }
    fetchAttendance(user.id);
  };

  const deleteRecord = async (id) => {
    if (window.confirm("Delete this log permanently?")) {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (!error) fetchAllRecords();
    }
  };

  const isAdmin = user?.email === 'admin@test.com'; 

  if (loading) return <div style={{...s.container, padding: '50px', color: '#1e293b'}}>Loading Data...</div>;

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          <div style={s.card}>
            <h1 style={{color: '#1e293b'}}>Login</h1>
            <input style={s.input} placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button style={s.btnPrimary} onClick={() => supabase.auth.signInWithPassword({ email, password })}>Sign In</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{color: '#1e293b'}}>Logged in as: <b>{user.email}</b></div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setView('user')} style={s.btnPrimary}>My Logs</button>
                {isAdmin && <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={s.btnAdmin}>Admin Panel</button>}
                <button onClick={() => supabase.auth.signOut()} style={{...s.btnPrimary, background: '#64748b'}}>Logout</button>
              </div>
            </div>

            {view === 'user' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                <div style={s.card}>
                  <h3 style={{color: '#1e293b'}}>Clock In/Out</h3>
                  <button onClick={handleAttendance} style={{...s.btnPrimary, width: '100%', padding: '30px', background: todayRecord ? '#f59e0b' : '#10b981'}}>
                    {todayRecord ? 'TIME OUT' : 'TIME IN'}
                  </button>
                </div>
                <div style={s.card}>
                  <h3 style={{color: '#1e293b'}}>My History</h3>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td style={s.td}>{log.date}</td>
                          <td style={s.td}>{new Date(log.time_in).toLocaleTimeString()}</td>
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString() : <span style={s.badge('#10b981')}>ACTIVE</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={s.card}>
                <h2 style={{color: '#ef4444'}}>Admin View</h2>
                <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                  <input style={s.input} type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  <input style={s.input} placeholder="Search User ID" onChange={e => setUserSearch(e.target.value)} />
                </div>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr>
                      <th style={s.tableHeader}>User ID</th>
                      <th style={s.tableHeader}>Date</th>
                      <th style={s.tableHeader}>In</th>
                      <th style={s.tableHeader}>Out</th>
                      <th style={s.tableHeader}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRecords.filter(r => (dateFilter === '' || r.date === dateFilter) && (userSearch === '' || r.user_id.includes(userSearch))).map(rec => (
                      <tr key={rec.id}>
                        <td style={{...s.td, fontSize: '10px'}}>{rec.user_id}</td>
                        <td style={s.td}>{rec.date}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                        <td style={s.td}><button style={s.btnDelete} onClick={() => deleteRecord(rec.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}