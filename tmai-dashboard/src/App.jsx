import { useState } from 'react';
import './App.css';
import { columns as initialColumns, stats as initialStats } from './data';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import StatsBar from './components/StatsBar';
import KanbanColumn from './components/KanbanColumn';
import Reports from './components/Reports';
import Notifications from './components/Notifications';
import Team from './components/Team';
import Settings from './components/Settings';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [stats, setStats] = useState(initialStats);
  const [columns, setColumns] = useState(initialColumns);

  const updateStat = (index, field, value) =>
    setStats(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));

  const updateTask = (colId, taskId, field, value) =>
    setColumns(prev => prev.map(col =>
      col.id !== colId ? col : {
        ...col,
        tasks: col.tasks.map(t => t.id !== taskId ? t : { ...t, [field]: value })
      }
    ));

  const updateTaskProgress = (colId, taskId, value) =>
    setColumns(prev => prev.map(col =>
      col.id !== colId ? col : {
        ...col,
        tasks: col.tasks.map(t =>
          t.id !== taskId ? t : { ...t, progress: { ...t.progress, value: Number(value) } }
        )
      }
    ));

  const updateColumn = (colId, field, value) =>
    setColumns(prev => prev.map(col =>
      col.id !== colId ? col : { ...col, [field]: value }
    ));

  const addTask = (colId) => {
    const newTask = {
      id: Date.now(),
      tags: [{ label: 'New', style: 'gray' }],
      risk: { label: '✅ Safe', style: 'safe' },
      title: 'New Task',
      insight: 'Click to edit this task.',
      assignee: { initial: '?', name: 'Unassigned', gradient: 'linear-gradient(135deg,#cbd5e1,#94a3b8)' },
      meta: { days: '0d', comments: 0, attachments: 0 },
    };
    setColumns(prev => prev.map(col =>
      col.id !== colId ? col : { ...col, tasks: [...col.tasks, newTask], count: col.count + 1 }
    ));
  };

  const deleteTask = (colId, taskId) =>
    setColumns(prev => prev.map(col =>
      col.id !== colId ? col : {
        ...col,
        tasks: col.tasks.filter(t => t.id !== taskId),
        count: col.count - 1,
      }
    ));

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />
      <div className="main">
        <Topbar page={page} />
        {page === 'dashboard' && (
          <>
            <StatsBar stats={stats} updateStat={updateStat} />
            <div className="board-wrap">
              <div className="board">
                {columns.map(col => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    updateColumn={updateColumn}
                    updateTask={updateTask}
                    updateTaskProgress={updateTaskProgress}
                    addTask={addTask}
                    deleteTask={deleteTask}
                  />
                ))}
              </div>
            </div>
          </>
        )}
        {page === 'reports'       && <Reports />}
        {page === 'notifications' && <Notifications />}
        {page === 'team'          && <Team />}
        {page === 'settings'      && <Settings />}
      </div>
    </div>
  );
}
