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

  useEffect(() => {
    // Check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchAttendance(session.user.id);
      }
      setLoading(false);
    });

    // Listen for login/logout changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAttendance(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // --- USER DATA ---
  async function fetchAttendance(userId) {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    setLogs(data || []);
    const today = new Date().toISOString().split('T')[0];
    setTodayRecord(data?.find(r => r.date === today));
  }

  // --- ADMIN DATA ---
  async function fetchAllRecords() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });
    if (!error) setAllRecords(data || []);
  }

  // --- AUTH LOGIC ---
  const handleAuth = async (type) => {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) alert(error.message);
    else if (type === 'signup') alert("Account created! You can now login.");
  };

  // --- ATTENDANCE ACTIONS ---
  const handleTimeIn = async () => {
    const { error } = await supabase.from('attendance').insert([{ user_id: user.id }]);
    if (error) alert("You already timed in today!");
    else fetchAttendance(user.id);
  };

  const handleTimeOut = async () => {
    await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
    fetchAttendance(user.id);
  };

  // --- FILTER LOGIC ---
  const filteredRecords = allRecords.filter(rec => {
    const matchesDate = dateFilter === '' || rec.date === dateFilter;
    const matchesUser = userSearch === '' || rec.user_id.toLowerCase().includes(userSearch.toLowerCase());
    return matchesDate && matchesUser;
  });

  // CHANGE THIS TO YOUR ACTUAL EMAIL TO ACCESS ADMIN PANEL
  const isAdmin = user?.email === 'admin@test.com'; 

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Attendance Tracking System</h1>

      {!user ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '350px', margin: '50px auto' }}>
          <h3>Login or Register</h3>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px' }} />
          <button onClick={() => handleAuth('login')} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>Login</button>
          <button onClick={() => handleAuth('signup')} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>Create new account</button>
        </div>
      ) : (
        <div>
          {/* NAVIGATION BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>
            <div>
              <button onClick={() => setView('user')} style={{ marginRight: '10px' }}>My Attendance</button>
              {isAdmin && (
                <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={{ background: '#dc3545', color: 'white' }}>ADMIN PANEL</button>
              )}
            </div>
            <button onClick={() => supabase.auth.signOut()}>Logout ({user.email})</button>
          </div>

          {view === 'user' ? (
            /* USER INTERFACE */
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginBottom: '20px' }}>
                {!todayRecord ? (
                  <button onClick={handleTimeIn} style={{ padding: '15px 40px', background: 'green', color: 'white', borderRadius: '5px', fontSize: '18px' }}>TIME IN</button>
                ) : !todayRecord.time_out ? (
                  <button onClick={handleTimeOut} style={{ padding: '15px 40px', background: '#fd7e14', color: 'white', borderRadius: '5px', fontSize: '18px' }}>TIME OUT</button>
                ) : <h2 style={{ color: '#007bff' }}>✅ You are done for today!</h2>}
              </div>
              
              <h3>My History</h3>
              <table border="1" width="100%" style={{ borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#eee' }}>
                  <tr><th>Date</th><th>Time In</th><th>Time Out</th></tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '10px' }}>{log.date}</td>
                      <td style={{ padding: '10px' }}>{new Date(log.time_in).toLocaleTimeString()}</td>
                      <td style={{ padding: '10px' }}>{log.time_out ? new Date(log.time_out).toLocaleTimeString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ADMIN INTERFACE */
            <div>
              <h2 style={{ color: '#dc3545' }}>Admin Dashboard</h2>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#fff5f5', padding: '15px', borderRadius: '5px' }}>
                <div>
                  <label>Filter Date: </label>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                </div>
                <div>
                  <label>Search User ID: </label>
                  <input type="text" placeholder="Search..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                </div>
                <button onClick={() => { setDateFilter(''); setUserSearch(''); }}>Reset</button>
              </div>

              <table border="1" width="100%" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#eee' }}><th>User ID</th><th>Date</th><th>Time In</th><th>Time Out</th></tr>
                </thead>
                <tbody>
                  {filteredRecords.map(rec => (
                    <tr key={rec.id}>
                      <td style={{ padding: '8px', fontSize: '12px' }}>{rec.user_id}</td>
                      <td style={{ padding: '8px' }}>{rec.date}</td>
                      <td style={{ padding: '8px' }}>{new Date(rec.time_in).toLocaleTimeString()}</td>
                      <td style={{ padding: '8px' }}>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : <b style={{color:'green'}}>Active</b>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}