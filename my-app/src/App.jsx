import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);

  useEffect(() => {
    // Check for active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchAttendance(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes (Login/Logout)
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
      .order('date', { ascending: false });
    
    if (!error) {
      setLogs(data || []);
      const today = new Date().toISOString().split('T')[0];
      setTodayRecord(data?.find(r => r.date === today));
    }
  }

  const handleAuth = async (type) => {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) alert(error.message);
    else if (type === 'signup') alert("Account created! You can now login.");
  };

  const handleTimeIn = async () => {
    const { error } = await supabase
      .from('attendance')
      .insert([{ user_id: user.id }]);
    
    if (error) alert("Error: Maybe you already timed in today?");
    else fetchAttendance(user.id);
  };

  const handleTimeOut = async () => {
    const { error } = await supabase
      .from('attendance')
      .update({ time_out: new Date().toISOString() })
      .eq('id', todayRecord.id);
    
    if (error) alert(error.message);
    else fetchAttendance(user.id);
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Attendance Tracking System</h1>
      <hr />

      {!user ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <h3>Login or Register</h3>
          <input 
            style={{ padding: '10px' }}
            type="email" placeholder="Email" value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            style={{ padding: '10px' }}
            type="password" placeholder="Password" value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button onClick={() => handleAuth('login')} style={{ padding: '10px', cursor: 'pointer' }}>Login</button>
          <button onClick={() => handleAuth('signup')} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
            Create new account
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p>Logged in as: <strong>{user.email}</strong></p>
            <button onClick={() => supabase.auth.signOut()} style={{ padding: '5px 10px' }}>Logout</button>
          </div>

          <div style={{ backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px', margin: '20px 0', textAlign: 'center' }}>
            <h2>Daily Record</h2>
            {!todayRecord ? (
              <button onClick={handleTimeIn} style={{ padding: '15px 30px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>
                TIME IN
              </button>
            ) : !todayRecord.time_out ? (
              <button onClick={handleTimeOut} style={{ padding: '15px 30px', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>
                TIME OUT
              </button>
            ) : (
              <p style={{ color: '#007bff', fontWeight: 'bold', fontSize: '18px' }}>✅ Attendance Completed for Today</p>
            )}
          </div>

          <h3>Your History</h3>
          <table border="1" width="100%" style={{ borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#eee' }}>
              <tr>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>In</th>
                <th style={{ padding: '10px' }}>Out</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(log => (
                <tr key={log.id}>
                  <td style={{ padding: '10px' }}>{log.date}</td>
                  <td style={{ padding: '10px' }}>{new Date(log.time_in).toLocaleTimeString()}</td>
                  <td style={{ padding: '10px' }}>{log.time_out ? new Date(log.time_out).toLocaleTimeString() : '--'}</td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{ padding: '10px', textAlign: 'center' }}>No records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}