import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Home, Kanban, BarChart3, Bell, Users, User,
} from 'lucide-react-native';

import DashboardScreen        from '../screens/DashboardScreen';
import KanbanBoardScreen      from '../screens/KanbanBoardScreen';
import AnalyticsScreen        from '../screens/AnalyticsScreen';
import NotificationsScreen    from '../screens/NotificationsScreen';
import TeamScreen             from '../screens/TeamScreen';
import ProfileScreen          from '../screens/ProfileScreen';
import TaskDetailScreen       from '../screens/TaskDetailScreen';
import CreateTaskScreen       from '../screens/CreateTaskScreen';
import TaskCommentsScreen     from '../screens/TaskCommentsScreen';
import EditProfileScreen      from '../screens/EditProfileScreen';
import ChangePasswordScreen   from '../screens/ChangePasswordScreen';
import LoginScreen            from '../screens/LoginScreen';
import RegisterScreen         from '../screens/RegisterScreen';
import AIAssistantFAB         from '../components/AIAssistantFAB';
import { colors }             from '../theme';
import { useAuth }            from '../context/AuthContext';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const NAV_ITEMS = [
  { name: 'Home',          component: DashboardScreen,     icon: Home },
  { name: 'Board',         component: KanbanBoardScreen,   icon: Kanban },
  { name: 'Analytics',     component: AnalyticsScreen,     icon: BarChart3 },
  { name: 'Notifications', component: NotificationsScreen, icon: Bell },
  { name: 'Team',          component: TeamScreen,          icon: Users },
  { name: 'Profile',       component: ProfileScreen,       icon: User },
];

function TabsWithFAB() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => <View style={styles.tabBarBg} />,
          tabBarActiveTintColor:   colors.blue,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, focused }) => {
            const item = NAV_ITEMS.find(n => n.name === route.name);
            if (!item) return null;
            const Icon = item.icon;
            return (
              <View style={{ alignItems: 'center' }}>
                {focused && <View style={styles.activeIndicator} />}
                <Icon size={22} color={color} strokeWidth={focused ? 2.25 : 1.75} />
              </View>
            );
          },
        })}
      >
        {NAV_ITEMS.map(item => (
          <Tab.Screen key={item.name} name={item.name} component={item.component} />
        ))}
      </Tab.Navigator>
      <AIAssistantFAB />
    </View>
  );
}

function MainStack() {
  return (
    <ProjectProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Tabs"       component={TabsWithFAB} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </ProjectProvider>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Tabs"           component={TabsWithFAB} />
      <Stack.Screen name="TaskDetail"      component={TaskDetailScreen}     options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TaskComments"    component={TaskCommentsScreen}   options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CreateTask"      component={CreateTaskScreen}     options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="EditProfile"     component={EditProfileScreen}    options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ChangePassword"  component={ChangePasswordScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 24,
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    backgroundColor: 'transparent',
  },
  tabBarBg: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(11,23,41,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.blue,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
