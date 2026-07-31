import { useState } from 'react';

const tagClass = { purple: 'tag-purple', blue: 'tag-blue', orange: 'tag-orange', red: 'tag-red', gray: 'tag-gray' };
const riskClass = { high: 'risk-high', critical: 'risk-critical', safe: 'risk-safe' };

function EditableText({ value, onChange, className = '', multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  const commit = () => { onChange(local); setEditing(false); };

  if (editing) {
    return multiline ? (
      <textarea
        className={`editable-input ${className}`}
        value={local}
        autoFocus
        rows={2}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
      />
    ) : (
      <input
        className={`editable-input ${className}`}
        value={local}
        autoFocus
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }

  return (
    <span
      className={`editable-text ${className}`}
      title="Click để chỉnh sửa"
      onClick={() => { setLocal(value); setEditing(true); }}
    >
      {value}
    </span>
  );
}

export default function TaskCard({ task, colId, updateTask, updateTaskProgress, deleteTask }) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={`task-card ${task.done ? 'done' : ''}`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Delete button */}
      {showDelete && (
        <button
          className="delete-btn"
          onClick={() => deleteTask(colId, task.id)}
          title="Xóa task"
        >✕</button>
      )}

      {/* Tags + Risk */}
      <div className="tags">
        {task.tags.map((t) => (
          <span key={t.label} className={`tag ${tagClass[t.style]}`}>{t.label}</span>
        ))}
        <span className={`risk-badge ${riskClass[task.risk.style]}`}>{task.risk.label}</span>
      </div>

      {/* Title */}
      <EditableText
        value={task.title}
        onChange={v => updateTask(colId, task.id, 'title', v)}
        className={`task-title ${task.done ? 'done' : ''}`}
      />

      {/* Progress bar */}
      {task.progress && (
        <>
          <div className="progress-label">
            <span>Progress</span>
            <strong>{task.progress.value}%</strong>
          </div>
          <div className="card-progress">
            <div
              className="card-progress-fill"
              style={{ width: `${task.progress.value}%`, background: task.progress.color }}
            />
          </div>
          <input
            type="range"
            min={0} max={100}
            value={task.progress.value}
            onChange={e => updateTaskProgress(colId, task.id, e.target.value)}
            className="progress-slider"
            title="Kéo để thay đổi tiến độ"
          />
        </>
      )}

      {/* AI Insight */}
      <div className="ai-insight">
        <span className="ai-insight-icon">✦</span>
        <EditableText
          value={task.insight}
          onChange={v => updateTask(colId, task.id, 'insight', v)}
          multiline
        />
      </div>

      {/* Footer */}
      <div className="task-footer">
        <div className="assignee" style={{ background: task.assignee.gradient }}>
          {task.assignee.initial}
        </div>
        <EditableText
          value={task.assignee.name}
          onChange={v => updateTask(colId, task.id, 'assignee', { ...task.assignee, name: v })}
          className="assignee-name"
        />
        <div className="meta">
          <span className="meta-item">⏱
            <EditableText
              value={task.meta.days}
              onChange={v => updateTask(colId, task.id, 'meta', { ...task.meta, days: v })}
            />
          </span>
          <span className="meta-item">💬
            <EditableText
              value={String(task.meta.comments)}
              onChange={v => updateTask(colId, task.id, 'meta', { ...task.meta, comments: Number(v) || 0 })}
            />
          </span>
          <span className="meta-item">📎
            <EditableText
              value={String(task.meta.attachments)}
              onChange={v => updateTask(colId, task.id, 'meta', { ...task.meta, attachments: Number(v) || 0 })}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
