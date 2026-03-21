import { useState } from "react";

export default function App1() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Setup Project", desc: "Initialize React App", status: "Finished", dep: null }
  ]);
  const [form, setForm] = useState({ title: "", desc: "", dep: "" });
  const [hoveredId, setHoveredId] = useState(null);

  const statusConfig = {
    Open: { bg: '#fef2f2', border: '#fee2e2', text: '#991b1b', label: '🔴 Open' },
    Ongoing: { bg: '#fffbeb', border: '#fef3c7', text: '#92400e', label: '🟡 Ongoing' },
    Finished: { bg: '#f0fdf4', border: '#dcfce7', text: '#166534', label: '🟢 Finished' }
  };

  const addTask = () => {
    if (!form.title) return;
    setTasks(prev => [...prev, { 
      ...form, id: Date.now(), status: "Open", dep: form.dep ? Number(form.dep) : null 
    }]);
    setForm({ title: "", desc: "", dep: "" });
  };

  const updateTaskContent = (id, field, value) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id).map(t => t.dep === id ? { ...t, dep: null } : t));
  };

  const updateStatus = (id, newStatus) => {
    const task = tasks.find(t => t.id === id);
    const parent = tasks.find(t => t.id === task.dep);
    if (task.status === 'Finished') return;
    if (parent && parent.status !== 'Finished') return;
    setTasks(tasks.map(t => (t.id === id ? { ...t, status: newStatus } : t)));
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', fontFamily: '"Inter", sans-serif', color: '#1f2937' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', color: '#111827' }}>Task Flow</h1>
        <p style={{ color: '#6b7280' }}>Simple to-do-list web.</p>
      </header>

      {/* New Task Creator */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr auto', gap: '12px', background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginBottom: '40px', border: '1px solid #f3f4f6' }}>
        <input style={inputStyle} placeholder="Task name..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input style={inputStyle} placeholder="What is the task all about?" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
        <select style={inputStyle} value={form.dep} onChange={e => setForm({ ...form, dep: e.target.value })}>
          <option value="">No Dependency</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <button onClick={addTask} style={buttonStyle}>Add Task</button>
      </div>

      {/* Task Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {tasks.map(t => {
          const parentTask = tasks.find(p => p.id === t.dep);
          const isBlocked = parentTask && parentTask.status !== 'Finished';
          const isFinished = t.status === 'Finished';
          const isHovered = hoveredId === t.id;

          return (
            <div 
              key={t.id} 
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ 
                backgroundColor: statusConfig[t.status].bg, 
                padding: '24px', borderRadius: '12px',
                border: `2px solid ${isHovered ? '#2563eb' : statusConfig[t.status].border}`,
                display: 'flex', flexDirection: 'column', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                boxShadow: isHovered ? '0 20px 25px -5px rgb(0 0 0 / 0.1)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                opacity: isFinished ? 0.6 : (isBlocked ? 0.8 : 1),
                filter: isFinished ? 'grayscale(0.4)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: statusConfig[t.status].text }}>
                  {statusConfig[t.status].label}
                </div>
                {isFinished ? <span>🏁</span> : (isBlocked && <span>🔒</span>)}
              </div>

              {/* EDITABLE TITLE */}
              <input 
                value={t.title}
                onChange={(e) => updateTaskContent(t.id, 'title', e.target.value)}
                disabled={isFinished}
                style={{
                  background: 'transparent', border: 'none', fontSize: '1.25rem', fontWeight: '700',
                  color: '#111827', marginBottom: '4px', outline: 'none', padding: '0',
                  textDecoration: isFinished ? 'line-through' : 'none',
                  width: '100%', cursor: isFinished ? 'not-allowed' : 'text'
                }}
              />
              
              {parentTask && (
                <div style={{ fontSize: '0.75rem', color: isBlocked ? '#b91c1c' : '#166534', marginBottom: '12px', fontWeight: '600' }}>
                  {isBlocked ? '⛓️ Finish this task first: ' : '✅ Parent Task is Completed: '} {parentTask.title}
                </div>
              )}

              {/* EDITABLE DESCRIPTION */}
              <textarea 
                value={t.desc}
                onChange={(e) => updateTaskContent(t.id, 'desc', e.target.value)}
                disabled={isFinished}
                rows="3"
                style={{
                  background: 'transparent', border: 'none', fontSize: '0.9rem', color: '#4b5563',
                  marginBottom: '20px', flexGrow: 1, outline: 'none', padding: '0',
                  resize: 'none', width: '100%', fontFamily: 'inherit',
                  cursor: isFinished ? 'not-allowed' : 'text'
                }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select 
                  value={t.status} 
                  onChange={e => updateStatus(t.id, e.target.value)}
                  disabled={isFinished || isBlocked}
                  style={{ 
                    ...inputStyle, padding: '8px 10px', flex: 1, 
                    cursor: (isFinished || isBlocked) ? 'not-allowed' : 'pointer',
                    background: (isFinished || isBlocked) ? '#f3f4f6' : '#fff',
                    color: (isFinished || isBlocked) ? '#9ca3af' : '#111827',
                    fontWeight: '500'
                  }}
                >
                  {['Open', 'Ongoing', 'Finished'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button 
                  onClick={() => deleteTask(t.id)} 
                  style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', outline: 'none' };
const buttonStyle = { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' };