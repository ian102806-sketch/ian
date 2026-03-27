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
  const [todayRecord, setTodayRecord] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' },
    wrapper: { width: '100%', maxWidth: '1000px', padding: '40px 20px' },
    card: { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px' },
    btnPrimary: { padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#2563eb', color: 'white' },
    btnAttendance: { padding: '20px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', color: 'white', width: '100%' },
    tableHeader: { background: '#f1f5f9', padding: '12px', textAlign: 'left', color: '#475569', fontSize: '11px', fontWeight: '800' },
    td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' },
    userHeader: { background: '#1e293b', padding: '15px 25px', borderRadius: '12px', color: '#fff', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  };

  const showToast = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const refreshData = useCallback(async (currentUser) => {
    if (!currentUser) return;

    // Fetch personal history using the authenticated UID
    const { data: history, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Fetch error:", error.message);
    } else {
      setLogs(history || []);
      const today = new Date().toISOString().split('T')[0];
      const active = history?.find(r => r.date === today && !r.time_out);
      setTodayRecord(active || null);
    }

    // Admin view
    if (currentUser.email === 'admin@test.com') {
      const { data: adminData } = await supabase
        .from('attendance')
        .select('*, profiles:user_id(id, email)')
        .order('created_at', { ascending: false });
      setAllRecords(adminData || []);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        refreshData(session.user);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        refreshData(session.user);
      } else {
        setUser(null);
        setLogs([]);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [refreshData]);

  const handleAttendance = async () => {
    if (!todayRecord) {
      const { error } = await supabase.from('attendance').insert([{ user_id: user.id }]);
      if (!error) showToast("Clocked In! 🟢");
    } else {
      const { error } = await supabase.from('attendance')
        .update({ time_out: new Date().toISOString() })
        .eq('id', todayRecord.id);
      if (!error) showToast("Clocked Out! 🔴");
    }
    refreshData(user);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          <div style={s.card}>
             <h2>Login</h2>
             <input style={{width:'100%', marginBottom:'10px', padding:'10px'}} placeholder="Email" onChange={e => setEmail(e.target.value)} />
             <input style={{width:'100%', marginBottom:'10px', padding:'10px'}} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
             <button style={s.btnPrimary} onClick={() => supabase.auth.signInWithPassword({ email, password })}>Login</button>
          </div>
        ) : (
          <div>
            <div style={s.userHeader}>
              <span>Logged in as: <b>{user.email}</b></span>
              <button onClick={() => supabase.auth.signOut()} style={{background:'#ef4444', color:'white', border:'none', padding:'8px 15px', borderRadius:'8px', cursor:'pointer'}}>Logout</button>
            </div>

            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
              <button onClick={() => setView('user')} style={{...s.btnPrimary, background: view === 'user' ? '#2563eb' : '#fff', color: view === 'user' ? '#fff' : '#333', border: '1px solid #ccc'}}>My Dashboard</button>
              {user.email === 'admin@test.com' && <button onClick={() => setView('admin')} style={{...s.btnPrimary, background:'#ef4444'}}>Admin Panel</button>}
            </div>

            {view === 'admin' ? (
              <div style={s.card}>
                <h3>System Logs</h3>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                   <thead>
                     <tr><th style={s.tableHeader}>User</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                   </thead>
                   <tbody>
                     {allRecords.map(r => (
                       <tr key={r.id}>
                         <td style={s.td}>{r.profiles?.email || 'Unknown'}</td>
                         <td style={s.td}>{new Date(r.time_in).toLocaleTimeString()}</td>
                         <td style={s.td}>{r.time_out ? new Date(r.time_out).toLocaleTimeString() : '--'}</td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            ) : (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div style={s.card}>
                  <h3>Shift Status</h3>
                  <button onClick={handleAttendance} style={{...s.btnAttendance, background: todayRecord ? '#f59e0b' : '#10b981'}}>
                    {todayRecord ? 'TIME OUT' : 'TIME IN'}
                  </button>
                </div>
                <div style={s.card}>
                  <h3>My History</h3>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                      <tr><th style={s.tableHeader}>Date</th><th style={s.tableHeader}>In</th><th style={s.tableHeader}>Out</th></tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? logs.map(l => (
                        <tr key={l.id}>
                          <td style={s.td}>{l.date}</td>
                          <td style={s.td}>{new Date(l.time_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                          <td style={s.td}>{l.time_out ? new Date(l.time_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Active'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="3" style={{...s.td, textAlign:'center'}}>No history found. Run the SQL script mentioned above!</td></tr>
                      )}
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