import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // --- AUTH STATES ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); 

  // --- DATA STATES ---
  const [logs, setLogs] = useState([]);
  const [allRecords, setAllRecords] = useState([]); 
  const [todayRecord, setTodayRecord] = useState(null);
  const [view, setView] = useState('user'); 
  const [dateFilter, setDateFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // --- UI STYLES ---
  const s = {
    container: { backgroundColor: '#f1f5f9', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '16px', color: '#1e293b', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', background: '#2563eb', color: 'white', transition: 'all 0.2s ease' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', background: '#ef4444', color: 'white' },
    btnDelete: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
    tableHeader: { background: '#f8fafc', padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '11px', fontWeight: '800', borderBottom: '2px solid #e2e8f0' },
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
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('time_in', { ascending: false });

    if (!error) {
      setLogs(data || []);
      const today = new Date().toISOString().split('T')[0];
      setTodayRecord(data?.find(r => r.date === today && !r.time_out));
    }
  }

  async function fetchAllRecords() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('time_in', { ascending: false });
    if (!error) setAllRecords(data || []);
  }

  const handleAttendance = async () => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    if (!todayRecord) {
      await supabase.from('attendance').insert([{ user_id: user.id, date: today, time_in: now }]);
    } else {
      await supabase.from('attendance').update({ time_out: now }).eq('id', todayRecord.id);
    }
    fetchAttendance(user.id);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Please fill in all fields");

    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
      });
      
      if (error) {
        alert("Registration Error: " + error.message);
      } else if (data.user && data.session === null) {
        alert("Registration successful! Please check your email for the confirmation link before logging in.");
        setAuthMode('login');
      } else {
        alert("Account created and logged in!");
      }
    }
  };

  const deleteRecord = async (id) => {
    if (window.confirm("Delete this log permanently?")) {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (!error) fetchAllRecords();
    }
  };

  const isAdmin = user?.email === 'admin@test.com'; 

  if (loading) return <div style={{...s.container, alignItems: 'center', color: '#64748b'}}>Loading...</div>;

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          /* --- AUTH UI --- */
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '60px' }}>
            <div style={{ ...s.card, width: '100%', maxWidth: '400px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ color: '#0f172a', fontSize: '28px', marginBottom: '8px' }}>
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  {authMode === 'login' ? 'Enter your credentials to access your logs' : 'Sign up to start tracking your attendance'}
                </p>
              </div>

              <form onSubmit={handleAuth}>
                <label style={s.label}>Email Address</label>
                <input style={s.input} type="email" placeholder="you@example.com" onChange={e => setEmail(e.target.value)} required />
                
                <label style={s.label}>Password</label>
                <input style={s.input} type="password" placeholder="••••••••" onChange={e => setPassword(e.target.value)} required />

                <button type="submit" style={{ ...s.btnPrimary, width: '100%', fontSize: '16px', marginTop: '8px' }}>
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>
              </form>

              <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  {authMode === 'login' ? "New here?" : "Already have an account?"}
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '700', cursor: 'pointer', marginLeft: '6px' }}
                  >
                    {authMode === 'login' ? 'Create an account' : 'Sign in instead'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* --- LOGGED IN UI --- */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
              <div>
                <span style={{color: '#64748b', fontSize: '14px'}}>Logged in as</span>
                <div style={{color: '#0f172a', fontWeight: '700', fontSize: '18px'}}>{user.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setView('user')} style={{...s.btnPrimary, background: view === 'user' ? '#2563eb' : 'white', color: view === 'user' ? 'white' : '#64748b', border: '1px solid #e2e8f0'}}>My Logs</button>
                {isAdmin && <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={{...s.btnAdmin, background: view === 'admin' ? '#ef4444' : '#fee2e2', color: view === 'admin' ? 'white' : '#ef4444'}}>Admin Panel</button>}
                <button onClick={() => supabase.auth.signOut()} style={{...s.btnPrimary, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0'}}>Logout</button>
              </div>
            </div>

            {view === 'user' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <div style={s.card}>
                  <h3 style={{marginTop: 0, color: '#0f172a'}}>Time Tracker</h3>
                  <p style={{color: '#64748b', fontSize: '14px', marginBottom: '24px'}}>Click the button below to record your daily attendance.</p>
                  <button onClick={handleAttendance} style={{...s.btnPrimary, width: '100%', padding: '40px 20px', fontSize: '20px', background: todayRecord ? '#f59e0b' : '#10b981', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)'}}>
                    {todayRecord ? 'CLOCK OUT' : 'CLOCK IN'}
                  </button>
                  {todayRecord && <p style={{textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '16px'}}>Shift started at {new Date(todayRecord.time_in).toLocaleTimeString()}</p>}
                </div>

                <div style={s.card}>
                  <h3 style={{marginTop: 0, color: '#0f172a'}}>My History</h3>
                  <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr><th style={s.tableHeader}>DATE</th><th style={s.tableHeader}>IN</th><th style={s.tableHeader}>OUT</th></tr>
                      </thead>
                      <tbody>
                        {logs.map(log => (
                          <tr key={log.id}>
                            <td style={s.td}>{log.date}</td>
                            <td style={s.td}>{new Date(log.time_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : <span style={s.badge('#10b981')}>ONGOING</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Admin Panel */
              <div style={s.card}>
                <h2 style={{marginTop: 0, color: '#0f172a'}}>Admin Dashboard</h2>
                <div style={{display: 'flex', gap: '16px', marginBottom: '24px'}}>
                   <div style={{flex: 1}}>
                      <label style={s.label}>Date Filter</label>
                      <input style={s.input} type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                   </div>
                   <div style={{flex: 2}}>
                      <label style={s.label}>Search User ID</label>
                      <input style={s.input} placeholder="Search by UUID..." onChange={e => setUserSearch(e.target.value)} />
                   </div>
                </div>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr>
                        <th style={s.tableHeader}>USER ID</th>
                        <th style={s.tableHeader}>DATE</th>
                        <th style={s.tableHeader}>IN</th>
                        <th style={s.tableHeader}>OUT</th>
                        <th style={s.tableHeader}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRecords.filter(r => (dateFilter === '' || r.date === dateFilter) && (userSearch === '' || r.user_id.includes(userSearch))).map(rec => (
                        <tr key={rec.id}>
                          <td style={{...s.td, fontSize: '11px', color: '#64748b'}}>{rec.user_id.slice(0,8)}...</td>
                          <td style={s.td}>{rec.date}</td>
                          <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                          <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                          <td style={s.td}><button style={s.btnDelete} onClick={() => deleteRecord(rec.id)}>Delete</button></td>
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