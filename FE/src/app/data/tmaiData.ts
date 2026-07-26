export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type RiskLevel = "safe" | "medium" | "high" | "critical";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  matchScore?: number;
  skills: string[];
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  risk: RiskLevel;
  riskScore: number; // 0-100
  assignee: TeamMember;
  deadline: string;
  tags: string[];
  progress: number; // 0-100
  aiInsight: string;
  subtasks?: { id: string; title: string; done: boolean }[];
  comments: number;
  attachments: number;
  storyPoints: number;
}

export type ProjectType = "Personal" | "Team";

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  taskCount: number;
  riskScore: number;
  progress?: number;
  teamId?: number;
  projectType?: ProjectType;
  createdBy?: number;
  children?: Project[];
}

export const teamMembers: TeamMember[] = [
  {
    id: "t1",
    name: "An Le",
    role: "Senior Dev",
    avatar: "https://images.unsplash.com/photo-1763128516808-785e80c1dd68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100",
    matchScore: 98,
    skills: ["React", "Node.js", "AI/ML"],
  },
  {
    id: "t2",
    name: "Minh Tran",
    role: "UI/UX",
    avatar: "https://images.unsplash.com/photo-1762753674498-73ec49feafc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100",
    matchScore: 91,
    skills: ["Figma", "CSS", "React"],
  },
  {
    id: "t3",
    name: "Linh Nguyen",
    role: "Backend",
    avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100",
    matchScore: 87,
    skills: ["Python", "Django", "PostgreSQL"],
  },
  {
    id: "t4",
    name: "Huy Pham",
    role: "DevOps",
    avatar: "https://images.unsplash.com/photo-1601513043334-36a0088140d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100",
    matchScore: 82,
    skills: ["Docker", "K8s", "AWS"],
  },
];

export const projects: Project[] = [
  {
    id: "p1",
    name: "TMAI Platform",
    color: "#1E88E5",
    icon: "🚀",
    taskCount: 24,
    riskScore: 35,
    children: [
      { id: "p1a", name: "Frontend", color: "#7C4DFF", icon: "💻", taskCount: 10, riskScore: 20 },
      { id: "p1b", name: "Backend API", color: "#00ACC1", icon: "⚙️", taskCount: 8, riskScore: 60 },
      { id: "p1c", name: "AI Engine", color: "#F4511E", icon: "🤖", taskCount: 6, riskScore: 45 },
    ],
  },
  {
    id: "p2",
    name: "Mobile App",
    color: "#43A047",
    icon: "📱",
    taskCount: 18,
    riskScore: 25,
    children: [
      { id: "p2a", name: "Android", color: "#1E88E5", icon: "🤖", taskCount: 9, riskScore: 15 },
      { id: "p2b", name: "iOS", color: "#E53935", icon: "🍎", taskCount: 9, riskScore: 35 },
    ],
  },
  {
    id: "p3",
    name: "Analytics Dashboard",
    color: "#8E24AA",
    icon: "📊",
    taskCount: 12,
    riskScore: 70,
  },
  {
    id: "p4",
    name: "Security Audit",
    color: "#E53935",
    icon: "🔐",
    taskCount: 8,
    riskScore: 85,
  },
];

export const tasks: Task[] = [
  // BACKLOG
  {
    id: "task-1",
    title: "Define AI Model Architecture",
    description: "Design the neural network architecture for risk prediction. Research transformer-based models for NLP task analysis.",
    status: "backlog",
    priority: "high",
    risk: "medium",
    riskScore: 45,
    assignee: teamMembers[0],
    deadline: "2026-05-25",
    tags: ["AI", "Architecture"],
    progress: 0,
    aiInsight: "Team lacks specialized ML expertise. Consider hiring or training.",
    subtasks: [
      { id: "s1", title: "Research BERT variants", done: false },
      { id: "s2", title: "Benchmark existing models", done: false },
    ],
    comments: 3,
    attachments: 2,
    storyPoints: 8,
  },
  {
    id: "task-2",
    title: "Database Schema Design",
    description: "Create optimized PostgreSQL schema for task relationships and AI metadata storage.",
    status: "backlog",
    priority: "medium",
    risk: "safe",
    riskScore: 15,
    assignee: teamMembers[2],
    deadline: "2026-05-20",
    tags: ["Database", "Backend"],
    progress: 10,
    aiInsight: "Schema aligns well with planned queries. Low risk.",
    comments: 1,
    attachments: 1,
    storyPoints: 5,
  },
  // TODO
  {
    id: "task-3",
    title: "API Integration",
    description: "Integrate third-party REST APIs for calendar sync and notification services.",
    status: "todo",
    priority: "urgent",
    risk: "high",
    riskScore: 72,
    assignee: teamMembers[0],
    deadline: "2026-05-15",
    tags: ["API", "Integration", "Backend"],
    progress: 0,
    aiInsight: "Deadline conflict detected. 3 blockers identified. Suggest reassigning 1 task.",
    subtasks: [
      { id: "s3", title: "OAuth2 authentication flow", done: false },
      { id: "s4", title: "Rate limiting implementation", done: false },
      { id: "s5", title: "Error handling & retries", done: false },
    ],
    comments: 7,
    attachments: 4,
    storyPoints: 13,
  },
  {
    id: "task-4",
    title: "UI Component Library",
    description: "Build reusable React components following the TMAI design system guidelines.",
    status: "todo",
    priority: "high",
    risk: "safe",
    riskScore: 20,
    assignee: teamMembers[1],
    deadline: "2026-05-18",
    tags: ["Frontend", "Design System"],
    progress: 15,
    aiInsight: "Assignee has strong design pattern experience. On track.",
    comments: 2,
    attachments: 5,
    storyPoints: 8,
  },
  // IN PROGRESS
  {
    id: "task-5",
    title: "Risk Prediction Engine",
    description: "Develop the ML pipeline for real-time task risk assessment and deadline prediction.",
    status: "in_progress",
    priority: "urgent",
    risk: "critical",
    riskScore: 88,
    assignee: teamMembers[0],
    deadline: "2026-05-12",
    tags: ["AI", "ML", "Core"],
    progress: 65,
    aiInsight: "Model accuracy below target (78% vs 90%). Deadline in 2 days. HIGH ALERT.",
    subtasks: [
      { id: "s6", title: "Data preprocessing pipeline", done: true },
      { id: "s7", title: "Model training loop", done: true },
      { id: "s8", title: "Accuracy optimization", done: false },
      { id: "s9", title: "API endpoint creation", done: false },
    ],
    comments: 14,
    attachments: 8,
    storyPoints: 21,
  },
  {
    id: "task-6",
    title: "User Authentication System",
    description: "Implement JWT-based auth with SSO support for enterprise clients.",
    status: "in_progress",
    priority: "high",
    risk: "medium",
    riskScore: 42,
    assignee: teamMembers[2],
    deadline: "2026-05-20",
    tags: ["Security", "Backend", "Auth"],
    progress: 45,
    aiInsight: "Progress on track. Monitor security test coverage.",
    comments: 5,
    attachments: 2,
    storyPoints: 10,
  },
  {
    id: "task-7",
    title: "Kanban Board Drag & Drop",
    description: "Implement smooth drag-and-drop interactions for task cards with real-time sync.",
    status: "in_progress",
    priority: "medium",
    risk: "safe",
    riskScore: 18,
    assignee: teamMembers[1],
    deadline: "2026-05-22",
    tags: ["Frontend", "UX"],
    progress: 80,
    aiInsight: "Almost complete. No blockers detected.",
    comments: 3,
    attachments: 1,
    storyPoints: 5,
  },
  // REVIEW
  {
    id: "task-8",
    title: "Performance Benchmarking",
    description: "Load testing and performance optimization for the API layer under concurrent users.",
    status: "review",
    priority: "high",
    risk: "medium",
    riskScore: 38,
    assignee: teamMembers[3],
    deadline: "2026-05-14",
    tags: ["Performance", "DevOps"],
    progress: 95,
    aiInsight: "Test results show 340ms avg response. Target met.",
    comments: 8,
    attachments: 6,
    storyPoints: 8,
  },
  {
    id: "task-9",
    title: "Notification Service",
    description: "Build push notification system for deadline reminders and AI alerts.",
    status: "review",
    priority: "medium",
    risk: "safe",
    riskScore: 12,
    assignee: teamMembers[2],
    deadline: "2026-05-16",
    tags: ["Backend", "Notifications"],
    progress: 100,
    aiInsight: "All unit tests passing. Ready for production.",
    comments: 4,
    attachments: 2,
    storyPoints: 5,
  },
  // DONE
  {
    id: "task-10",
    title: "Project Setup & CI/CD Pipeline",
    description: "Initialize monorepo structure, configure GitHub Actions workflows.",
    status: "done",
    priority: "high",
    risk: "safe",
    riskScore: 5,
    assignee: teamMembers[3],
    deadline: "2026-05-01",
    tags: ["DevOps", "Infrastructure"],
    progress: 100,
    aiInsight: "Completed ahead of schedule. Excellent pipeline design.",
    comments: 6,
    attachments: 3,
    storyPoints: 8,
  },
  {
    id: "task-11",
    title: "Design System Foundations",
    description: "Establish color tokens, typography scale, and base component specs.",
    status: "done",
    priority: "high",
    risk: "safe",
    riskScore: 5,
    assignee: teamMembers[1],
    deadline: "2026-05-05",
    tags: ["Design", "Frontend"],
    progress: 100,
    aiInsight: "Strong foundation. Reusability score: 94%.",
    comments: 9,
    attachments: 12,
    storyPoints: 13,
  },
];

export const aiSuggestedMembers = [
  { member: teamMembers[0], score: 98, reason: "Expert in AI/ML + API integrations" },
  { member: teamMembers[2], score: 91, reason: "Strong backend & database skills" },
  { member: teamMembers[1], score: 87, reason: "UI expertise for API documentation" },
  { member: teamMembers[3], score: 82, reason: "DevOps experience for deployment" },
];

export const statusColumns = [
  { id: "backlog", label: "Backlog", color: "#64748B" },
  { id: "todo", label: "To Do", color: "#1E88E5" },
  { id: "in_progress", label: "In Progress", color: "#7C4DFF" },
  { id: "review", label: "In Review", color: "#F59E0B" },
  { id: "done", label: "Done", color: "#10B981" },
];
