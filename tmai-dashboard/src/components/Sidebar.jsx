import { subProjects } from '../data';

const navItems = [
  { icon: '⊞', label: 'Dashboard', key: 'dashboard' },
  { icon: '📊', label: 'Reports',   key: 'reports' },
  { icon: '👥', label: 'Team',      key: 'team' },
  { icon: '🔔', label: 'Notifications', key: 'notifications', badge: 5 },
  { icon: '⚙️', label: 'Settings', key: 'settings' },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">✦</div>
        <div className="logo-text">
          <h2>TMAI</h2>
          <p>AI Task Intelligence</p>
        </div>
      </div>

      <div className="ai-status">
        <span>✦ AI Engine Active</span>
        <div className="dot-group">
          <div className="dot" /><div className="dot" /><div className="dot" />
        </div>
      </div>

      <nav className="nav-section">
        {navItems.map((item) => (
          <div
            key={item.key}
            className={`nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </div>
        ))}
      </nav>

      <div className="project-list">
        <div className="project-header">
          <span>PROJECTS</span>
          <button>+</button>
        </div>
        <div className="project-item active">
          <span className="project-icon">🚀</span>
          <span className="project-name">TMAI Platform</span>
          <span className="project-count">● 24</span>
        </div>
        <div className="sub-projects">
          {subProjects.map((p) => (
            <div key={p.name} className="sub-item">
              <div className="sub-dot" style={{ background: p.color }} />
              {p.name}
              <span className="sub-count">● {p.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="avatar-sm">HP</div>
        <div className="user-info">
          <h4>Huy Pham</h4>
          <p>Admin</p>
        </div>
        <button className="logout-btn">↗</button>
      </div>
    </aside>
  );
}
