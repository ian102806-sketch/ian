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

  // Reusable Modern Styles
  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', width: '100%', boxSizing: 'border-box', outline: 'none' },
    btnPrimary: { padding: '14px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white', transition: '0.2s' },
    btnAdmin: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' },
    badge: (color) => ({ padding: '6px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '800', backgroundColor: color, color: 'white' }),
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
    setTodayRecord(data?.find(r => r.date === today));
  }

  async function fetchAllRecords() {
    const { data } = await supabase.from('attendance').select('*').order('date', { ascending: false });
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

  // 🚨 IMPORTANT: Replace with your actual email
  const isAdmin = user?.email === 'admin@test.com'; 

  if (loading) return (
    <div style={{ ...s.container, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div style={s.spinner}></div>
      <p style={{ marginTop: '15px', color: '#64748b' }}>Connecting to Database...</p>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        
        {!user ? (
          /* --- LOGIN UI --- */
          <div style={{ display: 'grid', placeItems: 'center', height: '80vh' }}>
            <div style={{ ...s.card, width: '100%', maxWidth: '420px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏱️</div>
              <h1 style={{ marginBottom: '8px', color: '#0f172a' }}>Attendance Pro</h1>
              <p style={{ color: '#64748b', marginBottom: '30px' }}>Please log in to track your time.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input style={s.input} type="email" placeholder="Email Address" onChange={(e) => setEmail(e.target.value)} />
                <input style={s.input} type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => handleAuth('login')} style={s.btnPrimary}>Sign In</button>
                <button onClick={() => handleAuth('signup')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Create a new account</button>
              </div>
            </div>
          </div>
        ) : (
          /* --- AUTHENTICATED DASHBOARD --- */
          <div>
            {/* Navbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a', fontWeight: '800' }}>Dashboard</h1>
                <p style={{ margin: 0, color: '#64748b' }}>Welcome back, <b>{user.email}</b></p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setView('user')} style={{ ...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#fff' : '#475569', border: '1px solid #e2e8f0' }}>My Logs</button>
                {isAdmin && <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={{ ...s.btnAdmin, border: view === 'admin' ? '2px solid black' : 'none' }}>Admin View</button>}
                <button onClick={() => supabase.auth.signOut()} style={{ ...s.btnPrimary, background: '#f1f5f9', color: '#475569' }}>Logout</button>
              </div>
            </div>

            {view === 'user' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                {/* Time Card */}
                <div style={s.card}>
                  <h3 style={{ marginTop: 0, color: '#1e293b' }}>Daily Check-In</h3>
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    {!todayRecord ? (
                      <button onClick={handleTimeIn} style={{ ...s.btnPrimary, width: '100%', padding: '25px', fontSize: '20px', background: '#10b981' }}>Start Shift</button>
                    ) : !todayRecord.time_out ? (
                      <button onClick={handleTimeOut} style={{ ...s.btnPrimary, width: '100%', padding: '25px', fontSize: '20px', background: '#f59e0b' }}>End Shift</button>
                    ) : (
                      <div style={{ padding: '30px', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
                        <span style={{ fontSize: '30px' }}>✅</span>
                        <h4 style={{ marginBottom: 0 }}>Shift Finished</h4>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>Date: {new Date().toLocaleDateString()}</p>
                </div>

                {/* History Table */}
                <div style={s.card}>
                  <h3 style={{ marginTop: 0 }}>Personal Log History</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={s.tableHeader}>Date</th>
                          <th style={s.tableHeader}>Time In</th>
                          <th style={s.tableHeader}>Time Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map(log => (
                          <tr key={log.id}>
                            <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>{log.date}</td>
                            <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>{new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                              {log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={s.badge('#10b981')}>ON DUTY</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* --- ADMIN INTERFACE --- */
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h2 style={{ color: '#ef4444', margin: 0 }}>System-Wide Records</h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input style={{ ...s.input, width: 'auto' }} type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                    <input style={{ ...s.input, width: 'auto' }} type="text" placeholder="User ID Search" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                    <button onClick={() => { setDateFilter(''); setUserSearch(''); }} style={s.btnPrimary}>Reset</button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={s.tableHeader}>User Identifier</th>
                        <th style={s.tableHeader}>Date</th>
                        <th style={s.tableHeader}>Checked In</th>
                        <th style={s.tableHeader}>Checked Out</th>
                        <th style={s.tableHeader}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(rec => (
                        <tr key={rec.id}>
                          <td style={{ padding: '12px', borderBottom: '1px solid #000000ff', fontSize: '11px', color: '#64748b' }}>{rec.user_id}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #000000ff' }}>{rec.date}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #000000ff' }}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #000000ff' }}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #000000ff' }}>
                            <span style={s.badge(rec.time_out ? '#94a3b8' : '#10b981')}>{rec.time_out ? 'COMPLETED' : 'ACTIVE'}</span>
                          </td>
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