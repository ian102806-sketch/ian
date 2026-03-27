import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [allRecords, setAllRecords] = useState([]); // For Admin View
  const [todayRecord, setTodayRecord] = useState(null);
  const [view, setView] = useState('user'); // 'user' or 'admin'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchAttendance(session.user.id);
      }
      setLoading(false);
    });
  }, []);

  // --- USER LOGIC ---
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

  // --- ADMIN LOGIC ---
  async function fetchAllRecords() {
    const { data, error } = await supabase
      .from('attendance')
      .select(`*, user_id`); // In a real app, you'd join with a profiles table
    
    if (!error) setAllRecords(data || []);
  }

  const handleAuth = async (type) => {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
  };

  const handleTimeIn = async () => {
    await supabase.from('attendance').insert([{ user_id: user.id }]);
    fetchAttendance(user.id);
  };

  const handleTimeOut = async () => {
    await supabase.from('attendance').update({ time_out: new Date().toISOString() }).eq('id', todayRecord.id);
    fetchAttendance(user.id);
  };

  // Check if current user should see Admin button
  // TIP: Replace 'your-email@gmail.com' with your actual email
  const isAdmin = user?.email === 'admin@test.com'; 

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Attendance System</h1>

      {!user ? (
        <div>
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => handleAuth('login')}>Login</button>
          <button onClick={() => handleAuth('signup')}>Sign Up</button>
        </div>
      ) : (
        <div>
          <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
            <button onClick={() => setView('user')}>My Attendance</button>
            {isAdmin && (
              <button onClick={() => { setView('admin'); fetchAllRecords(); }} style={{ marginLeft: '10px', color: 'red' }}>
                ADMIN PANEL
              </button>
            )}
            <button onClick={() => supabase.auth.signOut()} style={{ float: 'right' }}>Logout</button>
          </nav>

          {view === 'user' ? (
            /* USER INTERFACE */
            <div>
              <h3>Welcome, {user.email}</h3>
              {!todayRecord ? (
                <button onClick={handleTimeIn} style={{ background: 'green', color: 'white', padding: '10px' }}>TIME IN</button>
              ) : !todayRecord.time_out ? (
                <button onClick={handleTimeOut} style={{ background: 'orange', padding: '10px' }}>TIME OUT</button>
              ) : <p>✅ Done for today!</p>}
              
              <h4>My History</h4>
              <table border="1" width="100%">
                <thead><tr><th>Date</th><th>In</th><th>Out</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}><td>{log.date}</td><td>{log.time_in}</td><td>{log.time_out || '--'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ADMIN INTERFACE */
            <div>
              <h2 style={{ color: 'red' }}>Administrator Dashboard</h2>
              <p>Viewing all user records</p>
              <table border="1" width="100%" style={{ backgroundColor: '#fff4f4' }}>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                  </tr>
                </thead>
                <tbody>
                  {allRecords.map(rec => (
                    <tr key={rec.id}>
                      <td style={{ fontSize: '10px' }}>{rec.user_id}</td>
                      <td>{rec.date}</td>
                      <td>{new Date(rec.time_in).toLocaleTimeString()}</td>
                      <td>{rec.time_out ? new Date(rec.time_out).toLocaleTimeString() : 'Active'}</td>
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