import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // --- AUTH STATES ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  // --- DATA STATES ---
  const [logs, setLogs] = useState([]);
  const [allRecords, setAllRecords] = useState([]); 
  const [todayRecord, setTodayRecord] = useState(null);
  const [view, setView] = useState('user'); 
  const [dateFilter, setDateFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // --- UI STYLES ---
  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '15px', color: '#1e293b', outlineColor: '#2563eb' },
    label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '5px', marginLeft: '2px' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white', transition: '0.2s' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    btnDelete: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800' },
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

    if (error) {
      console.error("Fetch Error:", error.message);
      return;
    }
    
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    setTodayRecord(data?.find(r => r.date === today && !r.time_out));
  }

  async function fetchAllRecords() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('time_in', { ascending: false });

    if (error) console.error("Admin Fetch Error:", error.message);
    setAllRecords(data || []);
  }

  const handleAttendance = async () => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    if (!todayRecord) {
      const { error } = await supabase.from('attendance').insert([
        { user_id: user.id, date: today, time_in: now }
      ]);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('attendance')
        .update({ time_out: now })
        .eq('id', todayRecord.id);
      if (error) alert(error.message);
    }
    fetchAttendance(user.id);
  };

  const handleAuth = async () => {
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Registration successful! Check your email for a confirmation link (if enabled).");
    }
  };

  const deleteRecord = async (id) => {
    if (window.confirm("Delete this log permanently?")) {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (!error) fetchAllRecords();
    }
  };

  const isAdmin = user?.email === 'admin@test.com'; 

  if (loading) return <div style={{...s.container, padding: '50px', color: '#1e293b'}}>Loading Application...</div>;

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          /* --- LOGIN / REGISTER UI --- */
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <div style={{ ...s.card, width: '100%', maxWidth: '400px', textAlign: 'center' }}>
              <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>
                {authMode === 'login' ? 'Please sign in to your account' : 'Register to start tracking your attendance'}
              </p>

              <div style={{ textAlign: 'left' }}>
                <label style={s.label}>EMAIL ADDRESS</label>
                <input 
                  style={s.input} 
                  placeholder="name@company.com" 
                  onChange={e => setEmail(e.target.value)} 
                />
                
                <label style={s.label}>PASSWORD</label>
                <input 
                  style={s.input} 
                  type="password" 
                  placeholder="••••••••" 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>

              <button style={{ ...s.btnPrimary, width: '100%', fontSize: '16px' }} onClick={handleAuth}>
                {authMode === 'login' ? 'Sign In' : 'Register'}
              </button>

              <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                </span>
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '700', cursor: 'pointer', marginLeft: '5px' }}
                >
                  {authMode === 'login' ? 'Register Now' : 'Sign In'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* --- APP UI (User & Admin) --- */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
              <div style={{color: '#1e293b'}}>Logged in: <b style={{color: '#2563eb'}}>{user.email}</b></div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setView('user')} style={{...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#94a3b8'}}>My Logs</button>
                {isAdmin && (
                  <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={{...s.btnAdmin, opacity: view === 'admin' ? 1 : 0.6}}>
                    Admin Panel
                  </button>
                )}
                <button onClick={() => supabase.auth.signOut()} style={{...s.btnPrimary, background: '#64748b'}}>Logout</button>
              </div>
            </div>

            {view === 'user' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Clock Box */}
                <div style={s.card}>
                  <h3 style={{color: '#1e293b', marginTop: 0}}>Clock In/Out</h3>
                  <p style={{color: '#64748b', fontSize: '14px', marginBottom: '20px'}}>Ready to start or end your shift?</p>
                  <button onClick={handleAttendance} style={{...s.btnPrimary, width: '100%', padding: '40px 20px', fontSize: '20px', background: todayRecord ? '#f59e0b' : '#10b981'}}>
                    {todayRecord ? 'TIME OUT' : 'TIME IN'}
                  </button>
                </div>

                {/* History Box */}
                <div style={s.card}>
                  <h3 style={{color: '#1e293b', marginTop: 0}}>My History</h3>
                  <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                      </thead>
                      <tbody>
                        {logs.length > 0 ? logs.map(log => (
                          <tr key={log.id}>
                            <td style={s.td}>{log.date}</td>
                            <td style={s.td}>{new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={s.badge('#10b981')}>ACTIVE</span>}</td>
                          </tr>
                        )) : <tr><td colSpan="3" style={{...s.td, textAlign: 'center'}}>No records yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Admin View */
              <div style={s.card}>
                <h2 style={{color: '#ef4444', marginTop: 0}}>Administrative Dashboard</h2>
                <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
                  <div style={{flex: 1}}>
                    <label style={s.label}>FILTER BY DATE</label>
                    <input style={{...s.input, marginBottom: 0}} type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  </div>
                  <div style={{flex: 2}}>
                    <label style={s.label}>SEARCH USER ID</label>
                    <input style={{...s.input, marginBottom: 0}} placeholder="Paste UUID here..." onChange={e => setUserSearch(e.target.value)} />
                  </div>
                </div>

                <div style={{overflowX: 'auto'}}>
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
                      {allRecords.filter(r => (dateFilter === '' || r.date === dateFilter) && (userSearch === '' || r.user_id.toLowerCase().includes(userSearch.toLowerCase()))).map(rec => (
                        <tr key={rec.id}>
                          <td style={{...s.td, fontSize: '11px', fontFamily: 'monospace', color: '#64748b'}}>{rec.user_id.slice(0, 8)}...</td>
                          <td style={s.td}>{rec.date}</td>
                          <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
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