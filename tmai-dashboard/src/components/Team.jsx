import { useState } from 'react';

const initialMembers = [
  {
    id: 1,
    name: 'An Le',
    role: 'Senior Dev',
    initial: 'AL',
    gradient: 'linear-gradient(135deg,#a78bfa,#6c63ff)',
    skills: ['React', 'Node.js', 'AI/ML'],
    tasks: 4,
    completion: 75,
  },
  {
    id: 2,
    name: 'Minh Tran',
    role: 'UI/UX Designer',
    initial: 'MT',
    gradient: 'linear-gradient(135deg,#34d399,#059669)',
    skills: ['Figma', 'CSS', 'React'],
    tasks: 3,
    completion: 88,
  },
  {
    id: 3,
    name: 'Linh Nguyen',
    role: 'Backend Dev',
    initial: 'LN',
    gradient: 'linear-gradient(135deg,#f472b6,#ec4899)',
    skills: ['Python', 'Django', 'PostgreSQL'],
    tasks: 2,
    completion: 50,
  },
  {
    id: 4,
    name: 'Huy Pham',
    role: 'DevOps Engineer',
    initial: 'HP',
    gradient: 'linear-gradient(135deg,#60a5fa,#2563eb)',
    skills: ['Docker', 'K8s', 'AWS'],
    tasks: 2,
    completion: 97,
  },
];

function EditableText({ value, onChange, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const commit = () => { onChange(local); setEditing(false); };
  if (editing) return (
    <input
      className={`editable-input ${className}`}
      value={local} autoFocus
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
    />
  );
  return (
    <span className={`editable-text ${className}`} title="Click để chỉnh sửa" onClick={() => { setLocal(value); setEditing(true); }}>
      {value}
    </span>
  );
}

export default function Team() {
  const [members, setMembers] = useState(initialMembers);

  const updateMember = (id, field, value) =>
    setMembers(prev => prev.map(m => m.id !== id ? m : { ...m, [field]: value }));

  return (
    <div className="team-page">
      <h1 className="team-heading">Team Members</h1>
      <div className="team-grid">
        {members.map((m) => (
          <div key={m.id} className="team-card">
            <div className="team-avatar-wrap">
              <div className="team-avatar-lg" style={{ background: m.gradient }}>{m.initial}</div>
            </div>
            <EditableText value={m.name} onChange={v => updateMember(m.id, 'name', v)} className="team-card-name" />
            <EditableText value={m.role} onChange={v => updateMember(m.id, 'role', v)} className="team-card-role" />
            <div className="team-skills">
              {m.skills.map((s) => <span key={s} className="team-skill-tag">{s}</span>)}
            </div>
            <div className="team-card-meta">
              <span className="team-card-tasks">
                <EditableText value={String(m.tasks)} onChange={v => updateMember(m.id, 'tasks', Number(v) || 0)} /> tasks
              </span>
              <span className="team-card-pct" style={{ color: '#6c63ff', fontWeight: 700 }}>
                <EditableText value={String(m.completion)} onChange={v => updateMember(m.id, 'completion', Math.min(100, Math.max(0, Number(v) || 0)))} />%
              </span>
            </div>
            <div className="team-card-bar">
              <div className="team-card-bar-fill" style={{ width: `${m.completion}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
