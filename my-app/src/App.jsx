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

  // Professional Styles
  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#1e293b' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#1e293b' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' },
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', fontSize: '14px' },
    idBadge: { backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' },
    spinner: { width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }
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
    const { data } = await supabase.from('attendance').select('*').eq('user_id', userId).order('date', { ascending: false });
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    setTodayRecord(data?.find(r => r.date === today && !r.time_out));
  }

  async function fetchAllRecords() {
    const { data } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    setAllRecords(data || []);
  }

  const handleAuth = async (type) => {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
  };

  const handleTimeIn = async () => {
    const { error } = await supabase.from('attendance').insert([{ user_id: user.id }]);
    if (error) alert("Already timed in today!");
    fetchAttendance(user.id);
  };

  const handleTimeOut = async () => {
    await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
    fetchAttendance(user.id);
  };

  const filteredRecords = allRecords.filter(rec => {
    return (dateFilter === '' || rec.date === dateFilter) && (userSearch === '' || rec.user_id.toLowerCase().includes(userSearch.toLowerCase()));
  });

  const isAdmin = user?.email === 'admin@test.com'; // CHANGE THIS TO YOUR EMAIL

  if (loading) return (
    <div style={{ ...s.container, alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div style={s.spinner}></div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '70vh' }}>
            <div style={{ ...s.card, width: '100%', maxWidth: '400px', textAlign: 'center' }}>
              <h1 style={{ color: '#0f172a' }}>WorkLog Pro</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input style={s.input} type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
                <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
                <button onClick={() => handleAuth('login')} style={s.btnPrimary}>Login</button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: 0, color: '#0f172a' }}>Dashboard</h1>
                <p style={{ margin: 0, color: '#64748b' }}>{user.email}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setView('user')} style={{ ...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#fff' : '#475569', border: '1px solid #ddd' }}>My Logs</button>
                {isAdmin && <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={{ ...s.btnAdmin }}>Admin Panel</button>}
                <button onClick={() => supabase.auth.signOut()} style={{ ...s.btnPrimary, background: '#e2e8f0', color: '#475569' }}>Logout</button>
              </div>
            </div>

            {view === 'user' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div style={s.card}>
                  <h3 style={{ color: '#1e293b' }}>Daily Check-In</h3>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    {!todayRecord ? (
                      <button onClick={handleTimeIn} style={{ ...s.btnPrimary, width: '100%', background: '#10b981' }}>TIME IN</button>
                    ) : (
                      <button onClick={handleTimeOut} style={{ ...s.btnPrimary, width: '100%', background: '#f59e0b' }}>TIME OUT</button>
                    )}
                  </div>
                </div>

                <div style={s.card}>
                  <h3 style={{ color: '#1e293b' }}>Attendance History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th style={s.tableHeader}>Log ID</th><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td style={s.td}><span style={s.idBadge}>{log.id.slice(0, 8)}</span></td>
                          <td style={s.td}>{log.date}</td>
                          <td style={s.td}>{new Date(log.time_in).toLocaleTimeString()}</td>
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString() : <span style={{color: '#10b981', fontWeight: 'bold'}}>Active</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* --- ADMIN INTERFACE --- */
              <div style={s.card}>
                <h2 style={{ color: '#ef4444', marginTop: 0 }}>Administrator Control</h2>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '24px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <input style={s.input} type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                  <input style={s.input} type="text" placeholder="Search User ID..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                  <button onClick={() => { setDateFilter(''); setUserSearch(''); }} style={{ ...s.btnPrimary, background: '#64748b' }}>Clear</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={s.tableHeader}>User ID</th><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => (
                      <tr key={rec.id}>
                        <td style={s.td}><span style={s.idBadge}>{rec.user_id.slice(0, 8)}</span></td>
                        <td style={s.td}>{rec.date}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
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