export const navItems = [
  { icon: '⊞', label: 'Dashboard', active: true },
  { icon: '📊', label: 'Reports' },
  { icon: '👥', label: 'Team' },
  { icon: '🔔', label: 'Notifications', badge: 5 },
  { icon: '⚙️', label: 'Settings' },
];

export const subProjects = [
  { name: 'Frontend', color: '#3b82f6', count: 10 },
  { name: 'Backend API', color: '#ef4444', count: 8 },
  { name: 'AI Engine', color: '#f59e0b', count: 6 },
  { name: 'Mobile App', color: '#22c55e', count: 18 },
  { name: 'Android', color: '#22c55e', count: 9 },
];

export const stats = [
  { icon: '✅', bg: '#dcfce7', value: '18%', badge: '+5% this week', badgeStyle: { background: '#dcfce7', color: '#16a34a' }, label: 'Completion Rate' },
  { icon: '⚠️', bg: '#fef3c7', value: '33', badge: '1 critical', badgeStyle: { background: '#fee2e2', color: '#dc2626' }, label: 'AI Risk Score' },
  { icon: '⚡', bg: '#ede9fe', value: '3', badge: 'Sprint ongoing', badgeStyle: { background: '#ede9fe', color: '#7c3aed' }, label: 'In Progress' },
  { icon: '📈', bg: '#dbeafe', value: '84', badge: '+12 from last sprint', badgeStyle: { background: '#dbeafe', color: '#2563eb' }, label: 'Team Velocity' },
  { icon: '✨', bg: '#fce7f3', value: '7', badge: '3 urgent', badgeStyle: { background: '#fee2e2', color: '#dc2626' }, label: 'AI Suggestions' },
];

export const columns = [
  {
    id: 'backlog',
    icon: '📋',
    dotColor: '#6b7280',
    title: 'Backlog',
    count: 2,
    progress: 30,
    pts: '13 pts',
    tasks: [
      {
        id: 1,
        tags: [
          { label: 'AI', style: 'purple' },
          { label: 'Architecture', style: 'gray' },
        ],
        risk: { label: '⚠️ At Risk', style: 'high' },
        title: 'Define AI Model Architecture',
        insight: 'Team lacks specialized ML expertise. Consider hiring or training.',
        assignee: { initial: 'A', name: 'An', gradient: 'linear-gradient(135deg,#a78bfa,#6c63ff)' },
        meta: { days: '15d', comments: 3, attachments: 2 },
      },
      {
        id: 2,
        tags: [
          { label: 'Database', style: 'blue' },
          { label: 'Backend', style: 'gray' },
        ],
        risk: { label: '✅ Safe', style: 'safe' },
        title: 'Database Schema Design',
        insight: 'Schema aligns well with planned queries. Low risk.',
        assignee: { initial: 'L', name: 'Linh', gradient: 'linear-gradient(135deg,#f472b6,#ec4899)' },
        meta: { days: '10d', comments: 1, attachments: 1 },
      },
    ],
  },
  {
    id: 'todo',
    icon: '📌',
    dotColor: '#3b82f6',
    title: 'To Do',
    count: 2,
    progress: 50,
    pts: '21 pts',
    tasks: [
      {
        id: 3,
        tags: [
          { label: 'API', style: 'red' },
          { label: 'Integration', style: 'gray' },
        ],
        risk: { label: '🔥 High Risk', style: 'high' },
        title: 'API Integration',
        insight: 'Deadline conflict detected. 3 blockers identified. Suggest...',
        assignee: { initial: 'A', name: 'An', gradient: 'linear-gradient(135deg,#a78bfa,#6c63ff)' },
        meta: { days: '5d', comments: 7, attachments: 4 },
      },
      {
        id: 4,
        tags: [
          { label: 'Frontend', style: 'orange' },
          { label: 'Design System', style: 'gray' },
        ],
        risk: { label: '✅ Safe', style: 'safe' },
        title: 'UI Component Library',
        insight: 'Assignee has strong design pattern experience. On track.',
        assignee: { initial: 'M', name: 'Minh', gradient: 'linear-gradient(135deg,#34d399,#059669)' },
        meta: { days: '8d', comments: 2, attachments: 5 },
      },
    ],
  },
  {
    id: 'inprogress',
    icon: '⚡',
    dotColor: '#8b5cf6',
    title: 'In Progress',
    count: 3,
    progress: 75,
    pts: '36 pts',
    tasks: [
      {
        id: 5,
        tags: [
          { label: 'AI', style: 'purple' },
          { label: 'ML', style: 'gray' },
        ],
        risk: { label: '🔴 Critical', style: 'critical' },
        title: 'Risk Prediction Engine',
        insight: 'Model accuracy below target (78% vs 90%). Deadline in 2 days. HIGH...',
        progress: { value: 65, color: '#8b5cf6' },
        assignee: { initial: 'A', name: 'An', gradient: 'linear-gradient(135deg,#a78bfa,#6c63ff)' },
        meta: { days: '2d', comments: 14, attachments: 8 },
      },
      {
        id: 6,
        tags: [
          { label: 'Security', style: 'orange' },
          { label: 'Backend', style: 'gray' },
        ],
        risk: { label: '⚠️ At Risk', style: 'high' },
        title: 'User Authentication System',
        insight: 'Progress on track. Monitor security test coverage.',
        progress: { value: 45, color: '#3b82f6' },
        assignee: { initial: 'L', name: 'Linh', gradient: 'linear-gradient(135deg,#f472b6,#ec4899)' },
        meta: { days: '10d', comments: 5, attachments: 2 },
      },
    ],
  },
  {
    id: 'inreview',
    icon: '🔍',
    dotColor: '#f59e0b',
    title: 'In Review',
    count: 2,
    progress: 45,
    pts: '13 pts',
    tasks: [
      {
        id: 7,
        tags: [
          { label: 'Performance', style: 'purple' },
          { label: 'DevOps', style: 'blue' },
        ],
        risk: { label: '⚠️ At Risk', style: 'high' },
        title: 'Performance Benchmarking',
        insight: 'Test results show 340ms avg response. Target met.',
        assignee: { initial: 'H', name: 'Huy', gradient: 'linear-gradient(135deg,#34d399,#059669)' },
        meta: { days: '4d', comments: 8, attachments: 6 },
      },
      {
        id: 8,
        tags: [
          { label: 'Backend', style: 'blue' },
          { label: 'Notifications', style: 'gray' },
        ],
        risk: { label: '✅ Safe', style: 'safe' },
        title: 'Notification Service',
        insight: 'All unit tests passing. Ready for production.',
        assignee: { initial: 'L', name: 'Linh', gradient: 'linear-gradient(135deg,#f472b6,#ec4899)' },
        meta: { days: '6d', comments: 4, attachments: 2 },
      },
    ],
  },
  {
    id: 'done',
    icon: '✅',
    dotColor: '#22c55e',
    title: 'Done',
    count: 1,
    progress: 100,
    pts: '8 pts',
    tasks: [
      {
        id: 9,
        tags: [{ label: 'Infrastructure', style: 'gray' }],
        risk: { label: '✅ Safe', style: 'safe' },
        title: 'CI/CD Pipeline Setup',
        done: true,
        insight: 'Deployment pipeline fully configured and tested.',
        assignee: { initial: 'H', name: 'Huy', gradient: 'linear-gradient(135deg,#34d399,#059669)' },
        meta: { days: '3d', comments: 6, attachments: 3 },
      },
    ],
  },
];
