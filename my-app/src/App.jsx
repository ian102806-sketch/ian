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

  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    // Input text color fixed to dark
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none', color: '#1e293b', backgroundColor: '#fff' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' },
    // Table cell text color explicitly set to dark slate
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b', backgroundColor: '#ffffff' },
    badge: (color) => ({ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: color, color: 'white', display: 'inline-block' }),
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
    const { data } = await supabase.from('attendance').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    setTodayRecord(data?.find(r => r.date === today));
  }

  async function fetchAllRecords() {
    const { data } = await supabase.from('attendance').select('*').order('created_at', { ascending: false });
    setAllRecords(data || []);
  }

  const handleAuth = async (type) => {
    setLoading(true);
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) { alert(error.message); setLoading(false); }
    else if (type === 'signup') { alert("Success! You can now log in."); setLoading(false); }
  };

  const handleTimeIn = async () => {
    const { error } = await supabase.from('attendance').insert([{ user_id: user.id }]);
    if (error) alert("Already timed in today!");
    else fetchAttendance(user.id);
  };

  const handleTimeOut = async () => {
    await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
    fetchAttendance(user.id);
  };

  const filteredRecords = allRecords.filter(rec => {
    return (dateFilter === '' || rec.date === dateFilter) && (userSearch === '' || rec.user_id.toLowerCase().includes(userSearch.toLowerCase()));
  });

  const isAdmin = user?.email === 'admin@test.com'; 

  if (loading) return (
    <div style={{ ...s.container, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div style={s.spinner}></div>
      <p style={{ marginTop: '15px', color: '#64748b' }}>Connecting...</p>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '80vh' }}>
            <div style={s.card}>
              <h1 style={{ color: '#0f172a' }}>Attendance Pro</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '320px' }}>
                <input style={s.input} type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
                <input style={s.input} type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => handleAuth('login')} style={s.btnPrimary}>Sign In</button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: 0, color: '#0f172a' }}>Dashboard</h1>
                <p style={{ margin: 0, color: '#64748b' }}>User: <b>{user.email}</b></p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setView('user')} style={{ ...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#fff' : '#475569', border: '1px solid #cbd5e1' }}>My Logs</button>
                {isAdmin && <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={s.btnAdmin}>Admin Panel</button>}
                <button onClick={() => supabase.auth.signOut()} style={{ ...s.btnPrimary, background: '#f1f5f9', color: '#475569' }}>Logout</button>
              </div>
            </div>

            {view === 'user' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={s.card}>
                  <h3 style={{ color: '#1e293b' }}>Check In</h3>
                  {!todayRecord ? (
                    <button onClick={handleTimeIn} style={{ ...s.btnPrimary, width: '100%', background: '#10b981' }}>Time In</button>
                  ) : !todayRecord.time_out ? (
                    <button onClick={handleTimeOut} style={{ ...s.btnPrimary, width: '100%', background: '#f59e0b' }}>Time Out</button>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>✓ Today's Shift Completed</div>
                  )}
                </div>

                <div style={s.card}>
                  <h3 style={{ color: '#1e293b' }}>My History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={s.tableHeader}>Date</th>
                        <th style={s.tableHeader}>In</th>
                        <th style={s.tableHeader}>Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td style={s.td}>{log.date}</td>
                          <td style={s.td}>{new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={s.badge('#10b981')}>ACTIVE</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={s.card}>
                <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>System Records</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input style={s.input} type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                  <input style={s.input} type="text" placeholder="Search User ID" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={s.tableHeader}>User ID</th>
                      <th style={s.tableHeader}>Date</th>
                      <th style={s.tableHeader}>In</th>
                      <th style={s.tableHeader}>Out</th>
                      <th style={s.tableHeader}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => (
                      <tr key={rec.id}>
                        <td style={{ ...s.td, fontSize: '11px', color: '#64748b' }}>{rec.user_id}</td>
                        <td style={s.td}>{rec.date}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                        <td style={s.td}>
                          <span style={s.badge(rec.time_out ? '#94a3b8' : '#10b981')}>{rec.time_out ? 'DONE' : 'ACTIVE'}</span>
                        </td>
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