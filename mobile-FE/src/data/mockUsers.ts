export interface MockUser {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: string;
}

export const MOCK_USERS: MockUser[] = [
  { id: 1, name: 'Sarah Chen',   initials: 'SC', email: 'sarah@company.com', role: 'Senior Engineer' },
  { id: 2, name: 'Mike Johnson', initials: 'MJ', email: 'mike@company.com',  role: 'Product Designer' },
  { id: 3, name: 'Alex Rivera',  initials: 'AR', email: 'alex@company.com',  role: 'Backend Engineer' },
  { id: 4, name: 'Emma Davis',   initials: 'ED', email: 'emma@company.com', role: 'QA Engineer' },
  { id: 5, name: 'John Smith',   initials: 'JS', email: 'john@company.com', role: 'DevOps Engineer' },
  { id: 6, name: 'Lisa Wang',    initials: 'LW', email: 'lisa@company.com', role: 'Security Engineer' },
];
