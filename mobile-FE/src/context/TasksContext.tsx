import React, { createContext, useContext, useState } from 'react';

export type ColumnId = 'todo' | 'inprogress' | 'review' | 'done';
export type Priority = 'High' | 'Medium' | 'Low';

export interface Subtask {
  id: number;
  title: string;
  done: boolean;
}

export interface Assignee {
  name: string;
  initials: string;
  email: string;
}

export interface Task {
  id: string;
  column: ColumnId;
  title: string;
  description: string;
  priority: Priority;
  status: string;
  assignee: Assignee;
  dueDate: string;
  progress: number;
  risk: number;
  tags: string[];
  subtasks: Subtask[];
}

const INITIAL_TASKS: Task[] = [
  {
    id: '1', column: 'inprogress',
    title: 'API Migration to GraphQL',
    description: 'Migrate the legacy REST API endpoints to GraphQL. Includes schema design, resolver implementation, auth layer, and backward-compatibility shims for mobile clients on v2.3 and below.',
    priority: 'High', status: 'In Progress',
    assignee: { name: 'Sarah Chen', initials: 'SC', email: 'sarah@company.com' },
    dueDate: '2026-05-27', progress: 45, risk: 85,
    tags: ['Backend', 'Critical', 'API'],
    subtasks: [
      { id: 1, title: 'Design GraphQL schema', done: true },
      { id: 2, title: 'Implement core resolvers', done: true },
      { id: 3, title: 'Add authentication layer', done: false },
      { id: 4, title: 'Write integration tests', done: false },
      { id: 5, title: 'Deploy to staging', done: false },
    ],
  },
  {
    id: '2', column: 'review',
    title: 'User Dashboard Redesign',
    description: 'Redesign the analytics dashboard with a focus on data density and mobile readability. Follows the new design system tokens.',
    priority: 'Medium', status: 'In Review',
    assignee: { name: 'Mike Johnson', initials: 'MJ', email: 'mike@company.com' },
    dueDate: '2026-05-28', progress: 80, risk: 20,
    tags: ['Frontend', 'Design'],
    subtasks: [
      { id: 1, title: 'Wireframes approved', done: true },
      { id: 2, title: 'Component build', done: true },
      { id: 3, title: 'QA sign-off', done: false },
    ],
  },
  {
    id: '3', column: 'todo',
    title: 'Database Query Optimization',
    description: 'Profile slow queries on the reporting endpoints and add missing indexes. Target p95 latency under 200ms.',
    priority: 'High', status: 'To Do',
    assignee: { name: 'Alex Rivera', initials: 'AR', email: 'alex@company.com' },
    dueDate: '2026-05-30', progress: 15, risk: 60,
    tags: ['Backend', 'Performance'],
    subtasks: [
      { id: 1, title: 'Profile slow queries', done: true },
      { id: 2, title: 'Add missing indexes', done: false },
      { id: 3, title: 'Benchmark p95 latency', done: false },
    ],
  },
  {
    id: '4', column: 'todo',
    title: 'Mobile App Testing Suite',
    description: 'Set up an end-to-end test suite covering the critical mobile flows: login, task board, and notifications.',
    priority: 'Medium', status: 'To Do',
    assignee: { name: 'Emma Davis', initials: 'ED', email: 'emma@company.com' },
    dueDate: '2026-06-02', progress: 0, risk: 25,
    tags: ['QA', 'Mobile'],
    subtasks: [
      { id: 1, title: 'Set up test runner', done: false },
      { id: 2, title: 'Cover login flow', done: false },
    ],
  },
  {
    id: '5', column: 'inprogress',
    title: 'Stripe Payment Integration',
    description: 'Integrate Stripe checkout for subscription upgrades, including webhook handling for renewals and cancellations.',
    priority: 'High', status: 'In Progress',
    assignee: { name: 'John Smith', initials: 'JS', email: 'john@company.com' },
    dueDate: '2026-05-28', progress: 55, risk: 70,
    tags: ['Backend', 'Finance'],
    subtasks: [
      { id: 1, title: 'Checkout session flow', done: true },
      { id: 2, title: 'Webhook handling', done: false },
    ],
  },
  {
    id: '6', column: 'done',
    title: 'Auth Flow & Session Management',
    description: 'Implemented login, registration, and session persistence across the mobile and web clients.',
    priority: 'High', status: 'Done',
    assignee: { name: 'Lisa Wang', initials: 'LW', email: 'lisa@company.com' },
    dueDate: '2026-05-22', progress: 100, risk: 10,
    tags: ['Security'],
    subtasks: [
      { id: 1, title: 'Login screen', done: true },
      { id: 2, title: 'Session persistence', done: true },
    ],
  },
];

interface TasksContextValue {
  tasks: Task[];
  getTask: (id: string) => Task | undefined;
  tasksByColumn: (column: ColumnId) => Task[];
  addTask: (input: { title: string; description: string; priority: Priority; dueDate: string; assignee: Assignee; tags: string[] }) => void;
  updateAssignee: (id: string, assignee: Assignee) => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const getTask = (id: string) => tasks.find(t => t.id === id);
  const tasksByColumn = (column: ColumnId) => tasks.filter(t => t.column === column);

  const addTask: TasksContextValue['addTask'] = (input) => {
    const nextId = String(Math.max(0, ...tasks.map(t => Number(t.id))) + 1);
    const newTask: Task = {
      id: nextId,
      column: 'todo',
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: 'To Do',
      assignee: input.assignee,
      dueDate: input.dueDate,
      progress: 0,
      risk: 0,
      tags: input.tags,
      subtasks: [],
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateAssignee: TasksContextValue['updateAssignee'] = (id, assignee) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, assignee } : t)));
  };

  return (
    <TasksContext.Provider value={{ tasks, getTask, tasksByColumn, addTask, updateAssignee }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
