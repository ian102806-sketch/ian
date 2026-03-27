import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAttendance(session.user.id);
      setLoading(false);
    });
  }, []);

  async function fetchAttendance(userId) {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    setLogs(data || []);
    // Check if user already timed in today
    const today = new Date().toISOString().split('T')[0];
    setTodayRecord(data?.find(r => r.date === today));
  }

  const handleTimeIn = async () => {
    const { error } = await supabase
      .from('attendance')
      .insert([{ user_id: user.id }]);
    
    if (error) alert("You already timed in today!");
    else fetchAttendance(user.id);
  };

  const handleTimeOut = async () => {
    const { error } = await supabase
      .from('attendance')
      .update({ time_out: new Date().toISOString() })
      .eq('id', todayRecord.id);
    
    if (!error) fetchAttendance(user.id);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Attendance Tracker</h1>
      
      {!user ? (
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}>
          Login with GitHub
        </button>
      ) : (
        <div>
          <p>Welcome, {user.email} <button onClick={() => supabase.auth.signOut()}>Logout</button></p>
          
          <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc' }}>
            <h3>Today's Actions</h3>
            {!todayRecord ? (
              <button onClick={handleTimeIn} style={{ background: 'green', color: 'white' }}>Time In</button>
            ) : !todayRecord.time_out ? (
              <button onClick={handleTimeOut} style={{ background: 'orange' }}>Time Out</button>
            ) : (
              <p style={{ color: 'blue' }}>✅ Work finished for today!</p>
            )}
          </div>

          <h3>Your History</h3>
          <table border="1" width="100%" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>In</th>
                <th>Out</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{log.date}</td>
                  <td>{new Date(log.time_in).toLocaleTimeString()}</td>
                  <td>{log.time_out ? new Date(log.time_out).toLocaleTimeString() : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}