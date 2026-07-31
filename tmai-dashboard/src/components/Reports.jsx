import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  LineChart, Line,
  CartesianGrid,
} from 'recharts';

const sprintVelocity = [
  { sprint: 'S1', pts: 18 },
  { sprint: 'S2', pts: 25 },
  { sprint: 'S3', pts: 21 },
  { sprint: 'S4', pts: 28 },
  { sprint: 'S5', pts: 30 },
  { sprint: 'S6 (Current)', pts: 22 },
];

const riskDist = [
  { name: 'Safe',     value: 6,  color: '#22c55e' },
  { name: 'Medium',   value: 3,  color: '#f59e0b' },
  { name: 'High',     value: 1,  color: '#f97316' },
  { name: 'Critical', value: 1,  color: '#ef4444' },
];

const weeklyRisk = [
  { day: 'Mon', risk: 35 },
  { day: 'Tue', risk: 42 },
  { day: 'Wed', risk: 38 },
  { day: 'Thu', risk: 52 },
  { day: 'Fri', risk: 58 },
  { day: 'Sat', risk: 48 },
  { day: 'Sun', risk: 50 },
];

const burndown = [
  { day: 'Day 1',  pts: 80 },
  { day: 'Day 3',  pts: 68 },
  { day: 'Day 5',  pts: 55 },
  { day: 'Day 7',  pts: 44 },
  { day: 'Day 9',  pts: 30 },
  { day: 'Day 11', pts: 18 },
  { day: 'Day 13', pts: 5  },
];

const team = [
  { name: 'An Le',       role: 'Senior Dev', tasks: 3, completion: 0,  initial: 'AL', gradient: 'linear-gradient(135deg,#a78bfa,#6c63ff)' },
  { name: 'Minh Tran',   role: 'UI/UX',      tasks: 3, completion: 33, initial: 'MT', gradient: 'linear-gradient(135deg,#34d399,#059669)' },
  { name: 'Linh Nguyen', role: 'Backend',     tasks: 3, completion: 0,  initial: 'LN', gradient: 'linear-gradient(135deg,#f472b6,#ec4899)' },
  { name: 'Huy Pham',    role: 'DevOps',      tasks: 2, completion: 50, initial: 'HP', gradient: 'linear-gradient(135deg,#60a5fa,#2563eb)' },
];

const topStats = [
  { icon: '⚡', bg: '#ede9fe', value: '84 pts', badge: '+12%', badgeColor: '#16a34a', label: 'Avg Velocity' },
  { icon: '🎯', bg: '#dbeafe', value: '76%',    badge: '-4%',  badgeColor: '#dc2626', label: 'On-Time Rate' },
  { icon: '👥', bg: '#dcfce7', value: '89%',    badge: '+3%',  badgeColor: '#16a34a', label: 'Team Utilization' },
  { icon: '✨', bg: '#fef3c7', value: '91%',    badge: '+7%',  badgeColor: '#16a34a', label: 'AI Accuracy' },
];

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Reports() {
  return (
    <div className="reports-page">
      {/* Header */}
      <div className="r-page-header">
        <div>
          <h1 className="r-page-title">Analytics &amp; Reports</h1>
          <p className="r-page-sub">Sprint performance &amp; AI risk trends</p>
        </div>
        <div className="r-ai-badge">✨ AI Analysis Active</div>
      </div>

      {/* Top stats */}
      <div className="r-stats-row">
        {topStats.map((s) => (
          <div key={s.label} className="r-stat-card">
            <div className="r-stat-top">
              <div className="r-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <span className="r-stat-badge" style={{ color: s.badgeColor }}>{s.badge}</span>
            </div>
            <div className="r-stat-value">{s.value}</div>
            <div className="r-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="r-charts-row">
        <div className="r-card" style={{ flex: 2 }}>
          <div className="r-card-header">
            <div className="r-card-title-block">
              <span className="r-card-icon">📊</span>
              <div>
                <div className="r-title">Sprint Velocity</div>
                <div className="r-sub">Completed vs Planned tasks</div>
              </div>
            </div>
            <span style={{ color: '#22c55e', fontSize: 20 }}>↗</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sprintVelocity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="sprint" tick={{ fontSize: 11, fill: '#7b82a0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7b82a0' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7ef', fontSize: 12 }} cursor={{ fill: 'rgba(108,99,255,0.06)' }} />
              <Bar dataKey="pts" fill="#1e2580" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="r-card" style={{ flex: 1 }}>
          <div className="r-card-title-block" style={{ marginBottom: 8 }}>
            <span className="r-card-icon">🔴</span>
            <div>
              <div className="r-title">Risk Distribution</div>
              <div className="r-sub">AI risk classification</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={riskDist} cx="50%" cy="50%" outerRadius={85} dataKey="value" labelLine={false} label={renderPieLabel}>
                {riskDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="r-pie-legend">
            {riskDist.map((d) => (
              <div key={d.name} className="r-legend-item">
                <span className="r-legend-dot" style={{ background: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="r-charts-row">
        <div className="r-card" style={{ flex: 1 }}>
          <div className="r-card-title-block" style={{ marginBottom: 12 }}>
            <span className="r-card-icon">⚠️</span>
            <div>
              <div className="r-title">Weekly Risk Trend</div>
              <div className="r-sub">AI-calculated risk scores</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyRisk} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7b82a0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7b82a0' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7ef', fontSize: 12 }} />
              <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fill="url(#riskGrad)" dot={{ fill: '#ef4444', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="r-card" style={{ flex: 1 }}>
          <div className="r-card-title-block" style={{ marginBottom: 12 }}>
            <span className="r-card-icon">🎯</span>
            <div>
              <div className="r-title">Sprint Burndown</div>
              <div className="r-sub">Story points remaining</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={burndown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7b82a0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7b82a0' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7ef', fontSize: 12 }} />
              <Line type="monotone" dataKey="pts" stroke="#6c63ff" strokeWidth={2.5} dot={{ fill: '#6c63ff', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Performance */}
      <div className="r-card">
        <h2 className="r-title" style={{ marginBottom: 20 }}>Team Performance</h2>
        <div className="r-team-grid">
          {team.map((m) => (
            <div key={m.name} className="r-team-card">
              <div className="r-team-avatar" style={{ background: m.gradient }}>{m.initial}</div>
              <div className="r-team-name">{m.name}</div>
              <div className="r-team-role">{m.role}</div>
              <div className="r-team-meta">
                <span>{m.tasks} tasks</span>
                <span style={{ fontWeight: 700, color: m.completion > 0 ? '#6c63ff' : '#7b82a0' }}>{m.completion}%</span>
              </div>
              <div className="r-team-bar">
                <div className="r-team-bar-fill" style={{ width: `${m.completion}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
