const notifications = [
  {
    id: 1,
    type: 'urgent',
    icon: '🔥',
    iconBg: '#fee2e2',
    title: 'Critical Risk Detected',
    desc: 'Risk Prediction Engine deadline approaching. Model accuracy at 78%, target 90%.',
    time: '2 minutes ago',
  },
  {
    id: 2,
    type: 'urgent',
    icon: '🤖',
    iconBg: '#fee2e2',
    title: 'AI Deadline Conflict Alert',
    desc: 'API Integration task has 3 blockers. Suggest reassigning 1 task to An Le.',
    time: '15 minutes ago',
  },
  {
    id: 3,
    type: 'comment',
    icon: '💬',
    iconBg: '#f1f5f9',
    title: 'New Comment',
    desc: "An Le commented on Performance Benchmarking: 'Results look good, minor optimization needed'",
    time: '1 hour ago',
  },
  {
    id: 4,
    type: 'done',
    icon: '✅',
    iconBg: '#dcfce7',
    title: 'Task Completed',
    desc: 'Design System Foundations has been marked as complete by Minh Tran.',
    time: '3 hours ago',
  },
  {
    id: 5,
    type: 'assign',
    icon: '👤',
    iconBg: '#f1f5f9',
    title: 'Assignment Update',
    desc: 'You were assigned to Database Schema Design by project admin.',
    time: '5 hours ago',
  },
  {
    id: 6,
    type: 'report',
    icon: '📊',
    iconBg: '#ede9fe',
    title: 'Weekly Report Ready',
    desc: 'Your AI-generated weekly performance report is now available in Reports.',
    time: '1 day ago',
  },
];

export default function Notifications() {
  return (
    <div className="notif-page">
      <h1 className="notif-heading">Notifications</h1>
      <div className="notif-list">
        {notifications.map((n) => (
          <div key={n.id} className={`notif-item ${n.type === 'urgent' ? 'notif-urgent' : ''}`}>
            <div className="notif-icon-wrap" style={{ background: n.iconBg }}>
              {n.icon}
            </div>
            <div className="notif-content">
              <div className="notif-top">
                <span className="notif-title">{n.title}</span>
                {n.type === 'urgent' && <span className="notif-badge-urgent">URGENT</span>}
              </div>
              <p className="notif-desc">{n.desc}</p>
              <span className="notif-time">{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
