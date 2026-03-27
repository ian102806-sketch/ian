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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);

  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#1e293b' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', marginBottom: '10px' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800' },
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    idBadge: { backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#2563eb' }
  };

  // RESTORED: Fetch logic for the logged-in user's personal logs
  const fetchUserLogs = async (userId) => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    const activeShift = data?.find(r => r.date === today && !r.time_out);
    setTodayRecord(activeShift || null);
  };

  const fetchAllRecords = useCallback(async () => {
    setIsRefreshing(true);
    const { data, error } = await supabase
      .from('attendance')
      .select('*, profiles:user_id(id)')
      .order('date', { ascending: false });
    
    if (!error) setAllRecords(data || []);
    setIsRefreshing(false);
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
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'admin') fetchAllRecords();
  }, [view, fetchAllRecords]);

  // RESTORED: Auth handler with Register/Signup support
  const handleAuth = async (type) => {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    
    if (error) alert(error.message);
    else if (type === 'signup') alert("Check your email for the confirmation link!");
  };

  const handleAttendance = async () => {
    if (!todayRecord) {
      await supabase.from('attendance').insert([{ user_id: user.id }]);
    } else {
      await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
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
      <div style={s.wrapper}>
        {!user ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
            <div style={{ ...s.card, width: '350px', textAlign: 'center' }}>
              <h2 style={{ marginBottom: '20px' }}>WorkLog</h2>
              <input style={s.input} placeholder="Email" onChange={e => setEmail(e.target.value)} />
              <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button style={s.btnPrimary} onClick={() => handleAuth('login')}>Login</button>
                {/* FIXED: Register Button is back */}
                <button style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px' }} onClick={() => handleAuth('signup')}>
                  Don't have an account? Register
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setView('user')} style={s.btnPrimary}>My Dashboard</button>
                {user.email === 'admin@test.com' && <button onClick={() => setView('admin')} style={s.btnAdmin}>Admin Panel</button>}
              </div>
              <button onClick={() => supabase.auth.signOut()} style={{ ...s.btnPrimary, background: '#64748b' }}>Logout</button>
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
                  <h3>Shift Status</h3>
                  <button onClick={handleAttendance} style={{ ...s.btnPrimary, background: todayRecord ? '#f59e0b' : '#10b981', width: '100%', padding: '20px' }}>
                    {todayRecord ? 'TIME OUT' : 'TIME IN'}
                  </button>
                </div>
                {/* FIXED: Personal History now uses its own 'logs' state */}
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
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</td>
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