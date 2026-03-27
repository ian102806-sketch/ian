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
  const [todayRecord, setTodayRecord] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Styles based on your UI screenshots
  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#1e293b' },
    wrapper: { width: '100%', maxWidth: '1100px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #e2e8f0' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #4a4a4a', background: '#333', color: 'white', fontSize: '14px', width: '100%', marginBottom: '10px' },
    btnPrimary: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#10b981', color: 'white' },
    btnAdmin: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#ef4444', color: 'white' },
    btnDelete: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    tableHeader: { background: '#f1f5f9', padding: '15px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '800' },
    td: { padding: '16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    topBar: { background: '#1e293b', padding: '15px 25px', borderRadius: '12px', color: 'white', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  };

  const showToast = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // 1. Fetching Personal History using the Auth UUID
  const fetchUserLogs = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId) 
      .order('created_at', { ascending: false });
    
    if (!error) {
      setLogs(data || []);
      const today = new Date().toISOString().split('T')[0];
      const active = data?.find(r => r.date === today && !r.time_out);
      setTodayRecord(active || null);
    }
  }, []);

  // 2. Admin Fetch (Joins profiles to show email instead of UUID)
  const fetchAllRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, profiles:user_id(email)')
      .order('created_at', { ascending: false });
    
    if (!error) setAllRecords(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserLogs(session.user.id);
      }
      setLoading(false);
    });
  }, [fetchUserLogs]);

  const handleAttendance = async () => {
    if (!todayRecord) {
      // Logic for TIME IN
      await supabase.from('attendance').insert([{ user_id: user.id }]);
      showToast("Clocked In!");
    } else {
      // Logic for TIME OUT
      await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
      showToast("Clocked Out!");
    }
    fetchUserLogs(user.id);
  };

  const deleteRecord = async (id) => {
    if (window.confirm("Delete this log?")) {
      await supabase.from('attendance').delete().eq('id', id);
      fetchAllRecords();
    }
  };

  if (loading) return <div style={s.container}>Loading System...</div>;

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          <div style={{...s.card, maxWidth: '400px', margin: '100px auto', textAlign: 'center'}}>
            <h2>WorkLog Login</h2>
            <input style={s.input} placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input style={s.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button style={{...s.btnPrimary, width: '100%'}} onClick={() => supabase.auth.signInWithPassword({ email, password })}>Login</button>
          </div>
        ) : (
          <div>
            <div style={s.topBar}>
              <span>Logged in as: <strong>{user.email}</strong></span>
              <button onClick={() => supabase.auth.signOut()} style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px'}}>Logout</button>
            </div>

            <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
              <button onClick={() => setView('user')} style={{...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#white' : '#444'}}>My Logs</button>
              {user.email === 'admin@test.com' && <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={s.btnAdmin}>Admin Panel</button>}
            </div>

            {view === 'admin' ? (
              <div style={s.card}>
                <h2 style={{color: '#ef4444'}}>Admin: System Logs</h2>
                <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                  <input type="date" style={s.input} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  <input type="text" style={s.input} placeholder="Search User Email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  <button onClick={() => {setDateFilter(''); setUserSearch('');}} style={{background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px'}}>Reset</button>
                </div>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr><th style={s.tableHeader}>USER</th><th style={s.tableHeader}>DATE</th><th style={s.tableHeader}>IN</th><th style={s.tableHeader}>OUT</th><th style={s.tableHeader}>ACTION</th></tr>
                  </thead>
                  <tbody>
                    {allRecords.filter(r => (dateFilter === '' || r.date === dateFilter) && (r.profiles?.email?.includes(userSearch))).map(rec => (
                      <tr key={rec.id}>
                        <td style={s.td}>{rec.profiles?.email}</td>
                        <td style={s.td}>{rec.date}</td>
                        <td style={s.td}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                        <td style={s.td}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : '--'}</td>
                        <td style={s.td}><button style={s.btnDelete} onClick={() => deleteRecord(rec.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div style={s.card}>
                  <h3>Attendance</h3>
                  <button onClick={handleAttendance} style={{...s.btnPrimary, width: '100%', padding: '40px', fontSize: '20px'}}>
                    {todayRecord ? 'TIME OUT' : 'TIME IN'}
                  </button>
                </div>
                <div style={s.card}>
                  <h3>Personal History</h3>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr><th style={s.tableHeader}>DATE</th><th style={s.tableHeader}>IN</th><th style={s.tableHeader}>OUT</th></tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td style={s.td}>{log.date}</td>
                          <td style={s.td}>{new Date(log.time_in).toLocaleTimeString()}</td>
                          <td style={s.td}>{log.time_out ? new Date(log.time_out).toLocaleTimeString() : 'Active'}</td>
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