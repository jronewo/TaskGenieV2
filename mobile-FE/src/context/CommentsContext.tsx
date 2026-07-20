import React, { createContext, useContext, useState } from 'react';

export interface Comment {
  id: number;
  author: { name: string; initials: string };
  content: string;
  createdAt: string;
}

const INITIAL_COMMENTS: Record<string, Comment[]> = {
  '1': [
    { id: 1, author: { name: 'Mike Johnson', initials: 'MJ' }, content: 'Schema draft looks good — can we double check the auth resolver edge cases?', createdAt: '2 giờ trước' },
    { id: 2, author: { name: 'Sarah Chen', initials: 'SC' }, content: 'Yes, adding integration tests for that today.', createdAt: '1 giờ trước' },
  ],
  '2': [
    { id: 1, author: { name: 'Alex Rivera', initials: 'AR' }, content: 'QA sign-off is scheduled for tomorrow morning.', createdAt: '5 giờ trước' },
  ],
};

interface CommentsContextValue {
  getComments: (taskId: string) => Comment[];
  addComment: (taskId: string, content: string, author: { name: string; initials: string }) => void;
}

const CommentsContext = createContext<CommentsContextValue | undefined>(undefined);

export function CommentsProvider({ children }: { children: React.ReactNode }) {
  const [comments, setComments] = useState<Record<string, Comment[]>>(INITIAL_COMMENTS);

  const getComments = (taskId: string) => comments[taskId] ?? [];

  const addComment: CommentsContextValue['addComment'] = (taskId, content, author) => {
    setComments(prev => {
      const existing = prev[taskId] ?? [];
      const nextId = existing.length ? Math.max(...existing.map(c => c.id)) + 1 : 1;
      return {
        ...prev,
        [taskId]: [...existing, { id: nextId, author, content, createdAt: 'Vừa xong' }],
      };
    });
  };

  return (
    <CommentsContext.Provider value={{ getComments, addComment }}>
      {children}
    </CommentsContext.Provider>
  );
}

export function useComments() {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error('useComments must be used within CommentsProvider');
  return ctx;
}
