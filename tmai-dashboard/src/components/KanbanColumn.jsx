import { useState } from 'react';
import TaskCard from './TaskCard';

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

export default function KanbanColumn({ column, updateColumn, updateTask, updateTaskProgress, addTask, deleteTask }) {
  return (
    <div className="column">
      {/* Header */}
      <div className="col-header">
        <span style={{ fontSize: 16 }}>{column.icon}</span>
        <div className="col-dot" style={{ background: column.dotColor }} />
        <EditableText
          value={column.title}
          onChange={v => updateColumn(column.id, 'title', v)}
          className="col-title"
        />
        <span className="col-count">{column.tasks.length}</span>
        <span className="col-chevron">∨</span>
        <span className="col-more">···</span>
      </div>

      {/* Progress */}
      <div className="col-progress-row">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${column.progress}%`, background: column.dotColor }}
          />
        </div>
        <EditableText
          value={column.pts}
          onChange={v => updateColumn(column.id, 'pts', v)}
        />
      </div>

      {/* Tasks */}
      <div className="col-tasks">
        {column.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            colId={column.id}
            updateTask={updateTask}
            updateTaskProgress={updateTaskProgress}
            deleteTask={deleteTask}
          />
        ))}
      </div>

      <button className="add-task" onClick={() => addTask(column.id)}>
        + Add task
      </button>
    </div>
  );
}
