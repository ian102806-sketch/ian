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

  // Styles Object
  const s = {
    card: { background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '20px' },
    btn: { padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', transition: '0.2s' },
    input: { padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', outline: 'none' },
    tableHeader: { background: '#f8fafc', padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px' },
    badge: (color) => ({ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: color, color: 'white' })
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
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
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

  const isAdmin = user?.email === 'admin@test.com'; // CHANGE THIS TO YOUR EMAIL

  if (loading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {!user ? (
          /* --- LOGIN UI --- */
          <div style={{ ...s.card, maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '24px', color: '#1e293b' }}>Attendance Tracker</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input style={s.input} type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
              <input style={s.input} type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
              <button onClick={() => handleAuth('login')} style={{ ...s.btn, background: '#2563eb', color: 'white' }}>Login</button>
              <button onClick={() => handleAuth('signup')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Create Account</button>
            </div>
          </div>
        ) : (
          /* --- MAIN APP UI --- */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>WorkLog Pro</h1>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setView('user')} style={{ ...s.btn, background: view === 'user' ? '#fff' : 'transparent', border: '1px solid #ddd' }}>My Logs</button>
                {isAdmin && <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={{ ...s.btn, background: view === 'admin' ? '#ef4444' : '#fee2e2', color: view === 'admin' ? '#fff' : '#ef4444' }}>Admin Panel</button>}
                <button onClick={() => supabase.auth.signOut()} style={{ ...s.btn, background: '#f1f5f9' }}>Logout</button>
              </div>
            </div>

            {view === 'user' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Time Actions Card */}
                <div style={s.card}>
                  <h3 style={{ marginTop: 0 }}>Today</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{new Date().toDateString()}</p>
                  <div style={{ marginTop: '24px' }}>
                    {!todayRecord ? (
                      <button onClick={handleTimeIn} style={{ ...s.btn, background: '#10b981', color: 'white', width: '100%', fontSize: '18px', padding: '20px' }}>TIME IN</button>
                    ) : !todayRecord.time_out ? (
                      <button onClick={handleTimeOut} style={{ ...s.btn, background: '#f59e0b', color: 'white', width: '100%', fontSize: '18px', padding: '20px' }}>TIME OUT</button>
                    ) : <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '8px', color: '#1e293b' }}>🎉 Shift Completed</div>}
                  </div>
                </div>

                {/* History Card */}
                <div style={s.card}>
                  <h3 style={{ marginTop: 0 }}>Attendance History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={s.tableHeader}>Date</th>
                        <th style={s.tableHeader}>Check In</th>
                        <th style={s.tableHeader}>Check Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{log.date}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                            {log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={{ color: '#10b981', fontWeight: 'bold' }}>Active</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* --- ADMIN PANEL UI --- */
              <div style={s.card}>
                <h2 style={{ color: '#ef4444', marginTop: 0 }}>Administrator Control</h2>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '24px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <input style={s.input} type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                  <input style={s.input} type="text" placeholder="Search User ID..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                  <button onClick={() => { setDateFilter(''); setUserSearch(''); }} style={s.btn}>Clear</button>
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
                        <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b' }}>{rec.user_id}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{rec.date}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={s.badge(rec.time_out ? '#64748b' : '#10b981')}>{rec.time_out ? 'CLOSED' : 'ON-SITE'}</span>
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