import { useState } from 'react';

function EditableValue({ value, onChange, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  if (editing) {
    return (
      <input
        className="editable-input stat-input"
        value={local}
        autoFocus
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { onChange(local); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(local); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        style={style}
      />
    );
  }
  return (
    <span
      className="editable-text"
      title="Click để chỉnh sửa"
      onClick={() => { setLocal(value); setEditing(true); }}
      style={style}
    >
      {value}
    </span>
  );
}

export default function StatsBar({ stats, updateStat }) {
  return (
    <div className="stats-bar">
      {stats.map((s, i) => (
        <div key={s.label} className="stat-card">
          <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
          <div>
            <div className="stat-main">
              <EditableValue
                value={s.value}
                onChange={v => updateStat(i, 'value', v)}
                style={{ fontSize: 22, fontWeight: 800, color: '#1a1f3c' }}
              />
              <EditableValue
                value={s.badge}
                onChange={v => updateStat(i, 'badge', v)}
                style={{ ...s.badgeStyle, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6 }}
              />
            </div>
            <EditableValue
              value={s.label}
              onChange={v => updateStat(i, 'label', v)}
              style={{ color: '#7b82a0', fontSize: 11 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
