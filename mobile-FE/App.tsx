import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { TasksProvider } from './src/context/TasksContext';
import { CommentsProvider } from './src/context/CommentsContext';

export default function App() {
  return (
    <AuthProvider>
      <TasksProvider>
        <CommentsProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </CommentsProvider>
      </TasksProvider>
    </AuthProvider>
  );
}
