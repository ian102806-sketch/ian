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

  const fetchUserLogs = async (userId) => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    // Find a record from today that doesn't have a time_out yet
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
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserLogs(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
        fetchUserLogs(session?.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLogs([]);
        setAllRecords([]);
        setView('user');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'admin') fetchAllRecords();
  }, [view, fetchAllRecords]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Force reset state in case listener is slow
    setUser(null);
    setView('user');
  };

  const handleAttendance = async () => {
    if (!todayRecord) {
      // TIME IN
      const { error } = await supabase.from('attendance').insert([{ user_id: user.id }]);
      if (error) alert("Error starting shift");
    } else {
      // TIME OUT
      const { error } = await supabase
        .from('attendance')
        .update({ time_out: new Date().toISOString() })
        .eq('id', todayRecord.id);
      if (error) alert("Error ending shift");
    }
    fetchUserLogs(user.id);
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
      <div style={s.wrapper}>
        {!user ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
            <div style={{ ...s.card, width: '350px', textAlign: 'center' }}>
              <h2 style={{ marginBottom: '20px' }}>WorkLog Login</h2>
              <input style={s.input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input style={s.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              <button style={{ ...s.btnPrimary, width: '100%' }} onClick={() => supabase.auth.signInWithPassword({ email, password })}>Login</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setView('user')} style={{ ...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#fff' : '#475569', border: '1px solid #ddd' }}>My Logs</button>
                {user.email === 'admin@test.com' && (
                  <button onClick={() => setView('admin')} style={{ ...s.btnAdmin, opacity: view === 'admin' ? 1 : 0.7 }}>Admin Panel</button>
                )}
              </div>
              <button onClick={handleLogout} style={{ ...s.btnPrimary, background: '#64748b' }}>Logout</button>
            </div>

            {view === 'admin' ? (
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ color: '#ef4444', margin: 0 }}>System-wide Logs</h2>
                  <button onClick={fetchAllRecords} style={{ background: 'none', border: '1px solid #ddd', cursor: 'pointer', padding: '5px 10px', borderRadius: '5px' }}>
                    {isRefreshing ? 'Syncing...' : '🔄 Sync'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input type="date" style={s.input} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  <input type="text" style={s.input} placeholder="Search User #" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  <button onClick={() => { setDateFilter(''); setUserSearch(''); }} style={{ ...s.btnPrimary, background: '#94a3b8' }}>Clear</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th style={s.tableHeader}>Log #</th><th style={s.tableHeader}>User #</th><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(rec => (
                        <tr key={rec.id}>
                          <td style={s.td}><span style={s.idBadge}>{rec.id}</span></td>
                          <td style={s.td}><b>User {rec.profiles?.id || 'New'}</b></td>
                          <td style={s.td}>{rec.date}</td>
                          <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                          <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={s.card}>
                  <h3 style={{ marginTop: 0 }}>Shift Control</h3>
                  <button 
                    onClick={handleAttendance}
                    style={{ ...s.btnPrimary, background: todayRecord ? '#f59e0b' : '#10b981', width: '100%', padding: '25px', fontSize: '1.2rem' }}
                  >
                    {todayRecord ? '🔴 TIME OUT' : '🟢 TIME IN'}
                  </button>
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '15px' }}>
                    {todayRecord ? `Started at: ${new Date(todayRecord.time_in).toLocaleTimeString()}` : 'No active shift for today.'}
                  </p>
                </div>
                
                <div style={s.card}>
                  <h3 style={{ marginTop: 0 }}>Personal History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th style={s.tableHeader}>Log #</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 5).map(log => (
                        <tr key={log.id}>
                          <td style={s.td}><span style={s.idBadge}>{log.id}</span></td>
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