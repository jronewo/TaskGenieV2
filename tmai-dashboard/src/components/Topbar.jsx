const titles = {
  dashboard: 'Kanban Board',
  reports: 'Analytics & Reports',
  notifications: 'Notifications',
  team: 'Team',
  settings: 'Settings',
};

export default function Topbar({ page }) {
  return (
    <div className="topbar">
      <button className="menu-btn">☰</button>
      <div className="breadcrumb">
        <span>TMAI Platform</span>
        <span>›</span>
        <strong>{titles[page] || 'Dashboard'}</strong>
      </div>
      <div className="search-box">
        <span>🔍</span>
        <input type="text" placeholder="Search tasks, projects, members..." />
        <span className="kbd">⌘K</span>
      </div>
      <div className="topbar-right">
        <button className="btn-ai">✦ AI Suggest</button>
        <div className="icon-btn active">⊞</div>
        <div className="icon-btn">☰</div>
        <div className="icon-btn">⋁</div>
        <button className="btn-new">+ New Task</button>
        <button className="notif-btn">🔔<div className="notif-dot" /></button>
        <div className="avatar-top">HP</div>
      </div>
    </div>
  );
}
