import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');

  const [logs, setLogs] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [openRecord, setOpenRecord] = useState(null);

  const [view, setView] = useState('user');
  const [dateFilter, setDateFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTimeIn, setEditTimeIn] = useState('');
  const [editTimeOut, setEditTimeOut] = useState('');

  const SHIFT_START_HOUR = 8;
  const ADMIN_EMAIL = 'admin@test.com';

  const s = {
    container: {
      backgroundColor: '#f1f5f9',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },
    wrapper: {
      width: '100%',
      maxWidth: '1250px',
      padding: '40px 20px'
    },
    card: {
      background: 'white',
      padding: '32px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      marginBottom: '24px',
      border: '1px solid #e2e8f0'
    },
    input: {
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      fontSize: '14px',
      width: '100%',
      marginBottom: '16px',
      color: '#1e293b',
      boxSizing: 'border-box',
      outlineColor: '#2563eb'
    },
    smallInput: {
      padding: '8px 10px',
      borderRadius: '6px',
      border: '1px solid #cbd5e1',
      fontSize: '13px',
      width: '100%',
      color: '#1e293b',
      boxSizing: 'border-box'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '700',
      color: '#475569',
      marginBottom: '6px',
      textTransform: 'uppercase'
    },
    btnPrimary: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '700',
      background: '#2563eb',
      color: 'white'
    },
    btnAdmin: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '700',
      background: '#ef4444',
      color: 'white'
    },
    btnDelete: {
      background: '#fee2e2',
      color: '#ef4444',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '700'
    },
    btnEdit: {
      background: '#dbeafe',
      color: '#2563eb',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '700',
      marginRight: '6px'
    },
    btnSave: {
      background: '#dcfce7',
      color: '#16a34a',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '700',
      marginRight: '6px'
    },
    btnCancel: {
      background: '#f1f5f9',
      color: '#475569',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '700'
    },
    tableHeader: {
      background: '#f8fafc',
      padding: '16px',
      textAlign: 'left',
      color: '#64748b',
      fontSize: '11px',
      fontWeight: '800',
      borderBottom: '2px solid #e2e8f0',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '14px',
      color: '#1e293b',
      verticalAlign: 'top'
    }
  };

  function badgeStyle(color) {
    return {
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '700',
      backgroundColor: color,
      color: 'white',
      display: 'inline-block'
    };
  }

  function formatLocalDateOnly(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function formatTimeDisplay(value) {
    if (!value) return '--';
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDateTimeForInput(dateValue) {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return year + '-' + month + '-' + day + 'T' + hours + ':' + mins;
  }

  function getLateStatus(dateTimeString) {
    if (!dateTimeString) {
      return { text: '--', late: false };
    }

    const d = new Date(dateTimeString);
    const shiftStart = new Date(d);
    shiftStart.setHours(SHIFT_START_HOUR, 0, 0, 0);

    return {
      text: d > shiftStart ? 'Late' : 'On Time',
      late: d > shiftStart
    };
  }

  async function fetchAttendance(userId) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('time_in', { ascending: false });

    if (error) {
      console.log('fetchAttendance error:', error);
      return;
    }

    const records = data || [];
    setLogs(records);

    const active = records.find(function (r) {
      return r.time_out === null;
    });

    setOpenRecord(active || null);
  }

  async function fetchAllRecords() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('time_in', { ascending: false });

    if (error) {
      console.log('fetchAllRecords error:', error);
      return;
    }

    setAllRecords(data || []);
  }

  useEffect(function () {
    supabase.auth.getSession().then(function (result) {
      const session = result.data.session;

      if (session && session.user) {
        setUser(session.user);
        fetchAttendance(session.user.id);
      }

      setLoading(false);
    });

    const authData = supabase.auth.onAuthStateChange(function (_event, session) {
      setUser(session ? session.user : null);

      if (session && session.user) {
        fetchAttendance(session.user.id);
      } else {
        setLogs([]);
        setAllRecords([]);
        setOpenRecord(null);
      }
    });

    return function () {
      authData.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(function () {
    if (user && view === 'admin' && user.email === ADMIN_EMAIL) {
      fetchAllRecords();
    }
  }, [user, view]);

  async function handleAttendance() {
    if (!user) return;

    const { data: latestRecords, error: latestError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .order('time_in', { ascending: false })
      .limit(1);

    if (latestError) {
      alert('Failed to check attendance: ' + latestError.message);
      return;
    }

    const now = new Date();
    const isoNow = now.toISOString();
    const localDate = formatLocalDateOnly(now);

    const latestRecord =
      latestRecords && latestRecords.length > 0 ? latestRecords[0] : null;

    if (latestRecord && latestRecord.time_out === null) {
      const { error } = await supabase
        .from('attendance')
        .update({ time_out: isoNow })
        .eq('id', latestRecord.id);

      if (error) {
        alert('Failed to clock out: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('attendance').insert([
        {
          user_id: user.id,
          date: localDate,
          time_in: isoNow,
          time_out: null
        }
      ]);

      if (error) {
        alert('Failed to clock in: ' + error.message);
        return;
      }
    }

    await fetchAttendance(user.id);

    if (user.email === ADMIN_EMAIL && view === 'admin') {
      await fetchAllRecords();
    }
  }

  async function handleAuth(e) {
    e.preventDefault();

    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert('Login Failed: ' + error.message);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      });

      if (error) {
        alert('Registration Failed: ' + error.message);
      } else if (data.user) {
        alert('Success! You can now log in.');
        setAuthMode('login');
      }
    }
  }

  async function deleteRecord(id) {
    const confirmed = window.confirm('Delete this log permanently?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Delete failed: ' + error.message);
      return;
    }

    await fetchAllRecords();

    if (user) {
      await fetchAttendance(user.id);
    }
  }

  function startEdit(rec) {
    setEditingId(rec.id);
    setEditDate(rec.date || '');
    setEditTimeIn(formatDateTimeForInput(rec.time_in));
    setEditTimeOut(rec.time_out ? formatDateTimeForInput(rec.time_out) : '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDate('');
    setEditTimeIn('');
    setEditTimeOut('');
  }

  async function saveEdit(id) {
    if (!editDate || !editTimeIn) {
      alert('Date and Time In are required.');
      return;
    }

    const newTimeIn = new Date(editTimeIn);
    const newTimeOut = editTimeOut ? new Date(editTimeOut) : null;

    if (newTimeOut && newTimeOut < newTimeIn) {
      alert('Time Out cannot be earlier than Time In.');
      return;
    }

    const payload = {
      date: editDate,
      time_in: newTimeIn.toISOString(),
      time_out: newTimeOut ? newTimeOut.toISOString() : null
    };

    const { error } = await supabase
      .from('attendance')
      .update(payload)
      .eq('id', id);

    if (error) {
      alert('Update failed: ' + error.message);
      return;
    }

    cancelEdit();
    await fetchAllRecords();

    if (user) {
      await fetchAttendance(user.id);
    }
  }

  const isAdmin = user && user.email === ADMIN_EMAIL;

  const filteredRecords = allRecords.filter(function (r) {
    const matchDate = dateFilter === '' || r.date === dateFilter;
    const matchUser =
      userSearch === '' ||
      String(r.user_id || '').toLowerCase().includes(userSearch.toLowerCase());

    return matchDate && matchUser;
  });

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#f1f5f9',
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#64748b',
          fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}
      >
        Loading Attendance System...
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {!user ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '60px' }}>
            <div style={{ ...s.card, width: '100%', maxWidth: '420px' }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1
                  style={{
                    color: '#0f172a',
                    fontSize: '32px',
                    fontWeight: '800',
                    marginBottom: '8px'
                  }}
                >
                  {authMode === 'login' ? 'Sign In' : 'Register'}
                </h1>

                <p style={{ color: '#64748b', fontSize: '15px' }}>
                  {authMode === 'login'
                    ? 'Welcome back! Please enter your details.'
                    : 'Start tracking your time today.'}
                </p>
              </div>

              <form onSubmit={handleAuth}>
                <label style={s.label}>Email Address</label>
                <input
                  style={s.input}
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={function (e) {
                    setEmail(e.target.value);
                  }}
                  required
                />

                <label style={s.label}>Password</label>
                <input
                  style={s.input}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={function (e) {
                    setPassword(e.target.value);
                  }}
                  required
                />

                <button
                  type="submit"
                  style={{
                    ...s.btnPrimary,
                    width: '100%',
                    fontSize: '16px',
                    marginTop: '10px'
                  }}
                >
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div
                style={{
                  marginTop: '25px',
                  textAlign: 'center',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '20px'
                }}
              >
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    onClick={function () {
                      setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: '700',
                      cursor: 'pointer',
                      marginLeft: '6px'
                    }}
                  >
                    {authMode === 'login' ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '32px',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <span
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}
                >
                  Current User
                </span>

                <div style={{ color: '#0f172a', fontWeight: '800', fontSize: '20px' }}>
                  {user.email}
                </div>

                <div style={{ marginTop: '6px' }}>
                  <span style={badgeStyle('#334155')}>Start Time: 8:00 AM</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={function () {
                    setView('user');
                  }}
                  style={{
                    ...s.btnPrimary,
                    background: view === 'user' ? '#2563eb' : 'white',
                    color: view === 'user' ? 'white' : '#64748b',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  My Logs
                </button>

                {isAdmin ? (
                  <button
                    onClick={function () {
                      setView('admin');
                      fetchAllRecords();
                    }}
                    style={{
                      ...s.btnAdmin,
                      background: view === 'admin' ? '#ef4444' : '#fee2e2',
                      color: view === 'admin' ? 'white' : '#ef4444'
                    }}
                  >
                    Admin Panel
                  </button>
                ) : null}

                <button
                  onClick={function () {
                    supabase.auth.signOut();
                  }}
                  style={{
                    ...s.btnPrimary,
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            {view === 'user' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '24px'
                }}
              >
                <div style={s.card}>
                  <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '20px' }}>
                    Punch Clock
                  </h3>

                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                    Employees and admin can clock in and clock out multiple times. Only one
                    active open record is allowed at a time.
                  </p>

                  <div style={{ marginBottom: '20px' }}>
                    {openRecord ? (
                      <span style={badgeStyle('#f59e0b')}>Currently Timed In</span>
                    ) : (
                      <span style={badgeStyle('#10b981')}>Ready to Time In</span>
                    )}
                  </div>

                  <button
                    onClick={handleAttendance}
                    style={{
                      ...s.btnPrimary,
                      width: '100%',
                      padding: '50px 20px',
                      fontSize: '24px',
                      background: openRecord ? '#f59e0b' : '#10b981',
                      boxShadow: openRecord
                        ? '0 10px 15px -3px rgba(245, 158, 11, 0.3)'
                        : '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {openRecord ? 'CLOCK OUT' : 'CLOCK IN'}
                  </button>
                </div>

                <div style={s.card}>
                  <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '20px' }}>
                    My History
                  </h3>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={s.tableHeader}>DATE</th>
                          <th style={s.tableHeader}>IN</th>
                          <th style={s.tableHeader}>OUT</th>
                          <th style={s.tableHeader}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map(function (log) {
                          const status = getLateStatus(log.time_in);

                          return (
                            <tr key={log.id}>
                              <td style={s.td}>{log.date}</td>
                              <td style={s.td}>{formatTimeDisplay(log.time_in)}</td>
                              <td style={s.td}>
                                {log.time_out ? (
                                  formatTimeDisplay(log.time_out)
                                ) : (
                                  <span style={badgeStyle('#10b981')}>ACTIVE</span>
                                )}
                              </td>
                              <td style={s.td}>
                                <span style={badgeStyle(status.late ? '#ef4444' : '#10b981')}>
                                  {status.text}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {logs.length === 0 ? (
                          <tr>
                            <td style={s.td} colSpan={4}>
                              No attendance logs yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div style={s.card}>
                <h2 style={{ marginTop: 0, color: '#0f172a' }}>Staff Attendance Logs</h2>

                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '24px',
                    background: '#f8fafc',
                    padding: '20px',
                    borderRadius: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <label style={s.label}>Filter Date</label>
                    <input
                      style={{
                        ...s.input,
                        marginBottom: 0
                      }}
                      type="date"
                      value={dateFilter}
                      onChange={function (e) {
                        setDateFilter(e.target.value);
                      }}
                    />
                  </div>

                  <div style={{ flex: 2, minWidth: '250px' }}>
                    <label style={s.label}>Search User ID</label>
                    <input
                      style={{
                        ...s.input,
                        marginBottom: 0
                      }}
                      placeholder="Search by user id..."
                      value={userSearch}
                      onChange={function (e) {
                        setUserSearch(e.target.value);
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={s.tableHeader}>USER ID</th>
                        <th style={s.tableHeader}>DATE</th>
                        <th style={s.tableHeader}>TIME IN</th>
                        <th style={s.tableHeader}>TIME OUT</th>
                        <th style={s.tableHeader}>STATUS</th>
                        <th style={s.tableHeader}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(function (rec) {
                        const status = getLateStatus(rec.time_in);
                        const isEditing = editingId === rec.id;

                        return (
                          <tr key={rec.id}>
                            <td style={{ ...s.td, fontWeight: '700', color: '#2563eb' }}>
                              {rec.user_id}
                            </td>

                            <td style={s.td}>
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={function (e) {
                                    setEditDate(e.target.value);
                                  }}
                                  style={s.smallInput}
                                />
                              ) : (
                                rec.date
                              )}
                            </td>

                            <td style={s.td}>
                              {isEditing ? (
                                <input
                                  type="datetime-local"
                                  value={editTimeIn}
                                  onChange={function (e) {
                                    setEditTimeIn(e.target.value);
                                  }}
                                  style={s.smallInput}
                                />
                              ) : (
                                formatTimeDisplay(rec.time_in)
                              )}
                            </td>

                            <td style={s.td}>
                              {isEditing ? (
                                <input
                                  type="datetime-local"
                                  value={editTimeOut}
                                  onChange={function (e) {
                                    setEditTimeOut(e.target.value);
                                  }}
                                  style={s.smallInput}
                                />
                              ) : rec.time_out ? (
                                formatTimeDisplay(rec.time_out)
                              ) : (
                                '--'
                              )}
                            </td>

                            <td style={s.td}>
                              <span style={badgeStyle(status.late ? '#ef4444' : '#10b981')}>
                                {status.text}
                              </span>
                            </td>

                            <td style={s.td}>
                              {isEditing ? (
                                <span>
                                  <button
                                    style={s.btnSave}
                                    onClick={function () {
                                      saveEdit(rec.id);
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button style={s.btnCancel} onClick={cancelEdit}>
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <span>
                                  <button
                                    style={s.btnEdit}
                                    onClick={function () {
                                      startEdit(rec);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    style={s.btnDelete}
                                    onClick={function () {
                                      deleteRecord(rec.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td style={s.td} colSpan={6}>
                            No records found.
                          </td>
                        </tr>
                      ) : null}
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
