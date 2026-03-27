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
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800' },
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    idBadge: { backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#2563eb' }
  };

  const fetchAllRecords = useCallback(async () => {
    setIsRefreshing(true);
    // We fetch attendance and TRY to get the profile. 
    // If profiles is null, the record will still show because of the fallback in the render.
    const { data, error } = await supabase
      .from('attendance')
      .select('*, profiles:user_id(id)')
      .order('date', { ascending: false });
    
    if (error) console.error("Data error:", error.message);
    setAllRecords(data || []);
    setIsRefreshing(false);
  }, []);

  const fetchUserLogs = async (userId) => {
    const { data } = await supabase.from('attendance').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    setTodayRecord(data?.find(r => r.date === today && !r.time_out));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserLogs(session.user.id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (view === 'admin') fetchAllRecords();
  }, [view, fetchAllRecords]);

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
          <div style={s.card}>
            <h2>Login</h2>
            <input style={s.input} placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button style={s.btnPrimary} onClick={() => supabase.auth.signInWithPassword({ email, password })}>Login</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setView('user')} style={s.btnPrimary}>My Logs</button>
              {user.email === 'admin@test.com' && <button onClick={() => setView('admin')} style={s.btnAdmin}>Admin Panel</button>}
              <button onClick={() => supabase.auth.signOut()} style={{...s.btnPrimary, background: '#64748b'}}>Logout</button>
            </div>

            {view === 'admin' ? (
              <div style={s.card}>
                <h2>Admin Logs</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input type="date" style={s.input} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                    <input type="text" style={s.input} placeholder="Search User #" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                    <button onClick={() => {setDateFilter(''); setUserSearch('');}} style={s.btnPrimary}>Clear</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={s.tableHeader}>Log #</th><th style={s.tableHeader}>User #</th><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => (
                      <tr key={rec.id}>
                        <td style={s.td}><span style={s.idBadge}>{rec.id}</span></td>
                        {/* FALLBACK: If profiles is empty, show "New/Syncing" instead of breaking */}
                        <td style={s.td}><b>User {rec.profiles?.id || 'Syncing...'}</b></td>
                        <td style={s.td}>{rec.date}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={s.card}>
                <h2>Welcome, {user.email}</h2>
                <button 
                   style={{...s.btnPrimary, background: todayRecord ? '#f59e0b' : '#10b981', width: '100%', padding: '20px'}}
                   onClick={async () => {
                     if (!todayRecord) {
                       await supabase.from('attendance').insert([{ user_id: user.id }]);
                     } else {
                       await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
                     }
                     fetchUserLogs(user.id);
                   }}
                >
                  {todayRecord ? 'TIME OUT' : 'TIME IN'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}