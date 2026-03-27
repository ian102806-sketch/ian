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
    container: { backgroundColor: '#f1f5f9', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '16px', color: '#1e293b', boxSizing: 'border-box', outlineColor: '#2563eb' },
    label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', background: '#2563eb', color: 'white', transition: 'all 0.2s' },
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
    // Replaced 'created_at' with 'time_in' to fix the 400 error from your console
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
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Login Failed: " + error.message);
    } else {
      // Sign Up Logic
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert("Registration Failed: " + error.message);
      } else if (data.user) {
        alert("Success! You can now log in.");
        setAuthMode('login');
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

  if (loading) return <div style={{...s.container, alignItems: 'center', color: '#64748b'}}>Loading Attendance System...</div>;

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          /* --- LOGIN / REGISTER CARD --- */
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '60px' }}>
            <div style={{ ...s.card, width: '100%', maxWidth: '420px' }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#0f172a', fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
                  {authMode === 'login' ? 'Sign In' : 'Register'}
                </h1>
                <p style={{ color: '#64748b', fontSize: '15px' }}>
                  {authMode === 'login' ? 'Welcome back! Please enter your details.' : 'Start tracking your time today.'}
                </p>
              </div>

              <form onSubmit={handleAuth}>
                <label style={s.label}>Email Address</label>
                <input style={s.input} type="email" placeholder="Enter your email" onChange={e => setEmail(e.target.value)} required />
                
                <label style={s.label}>Password</label>
                <input style={s.input} type="password" placeholder="••••••••" onChange={e => setPassword(e.target.value)} required />

                <button type="submit" style={{ ...s.btnPrimary, width: '100%', fontSize: '16px', marginTop: '10px' }}>
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '700', cursor: 'pointer', marginLeft: '6px' }}
                  >
                    {authMode === 'login' ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* --- DASHBOARD UI --- */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
              <div>
                <span style={{color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase'}}>Current User</span>
                <div style={{color: '#0f172a', fontWeight: '800', fontSize: '20px'}}>{user.email}</div>
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
                  <h3 style={{marginTop: 0, color: '#0f172a', fontSize: '20px'}}>Punch Clock</h3>
                  <p style={{color: '#64748b', fontSize: '14px', marginBottom: '30px'}}>Record your start and end times below.</p>
                  <button onClick={handleAttendance} style={{...s.btnPrimary, width: '100%', padding: '50px 20px', fontSize: '24px', background: todayRecord ? '#f59e0b' : '#10b981', boxShadow: todayRecord ? '0 10px 15px -3px rgba(245, 158, 11, 0.3)' : '0 10px 15px -3px rgba(16, 185, 129, 0.3)'}}>
                    {todayRecord ? 'CLOCK OUT' : 'CLOCK IN'}
                  </button>
                </div>

                <div style={s.card}>
                  <h3 style={{marginTop: 0, color: '#0f172a', fontSize: '20px'}}>My History</h3>
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
                            <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : <span style={s.badge('#10b981')}>ACTIVE</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* --- ADMIN PANEL --- */
              <div style={s.card}>
                <h2 style={{marginTop: 0, color: '#0f172a'}}>Staff Attendance Logs</h2>
                <div style={{display: 'flex', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '20px', borderRadius: '12px'}}>
                   <div style={{flex: 1}}>
                      <label style={s.label}>Filter Date</label>
                      <input style={{...s.input, marginBottom: 0}} type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                   </div>
                   <div style={{flex: 2}}>
                      <label style={s.label}>Search User UUID</label>
                      <input style={{...s.input, marginBottom: 0}} placeholder="Search..." onChange={e => setUserSearch(e.target.value)} />
                   </div>
                </div>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr>
                        <th style={s.tableHeader}>STAFF ID</th>
                        <th style={s.tableHeader}>DATE</th>
                        <th style={s.tableHeader}>TIME IN</th>
                        <th style={s.tableHeader}>TIME OUT</th>
                        <th style={s.tableHeader}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRecords.filter(r => (dateFilter === '' || r.date === dateFilter) && (userSearch === '' || r.user_id.includes(userSearch))).map(rec => (
                        <tr key={rec.id}>
                          <td style={{...s.td, fontSize: '11px', color: '#64748b', fontFamily: 'monospace'}}>{rec.user_id.slice(0,12)}...</td>
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