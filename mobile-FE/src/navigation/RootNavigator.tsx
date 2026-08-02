import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Bell, Sparkles, CreditCard, User } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import InboxScreen from '../screens/InboxScreen';
import AssistantScreen from '../screens/AssistantScreen';
import PlanScreen from '../screens/PlanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProjectTasksScreen from '../screens/ProjectTasksScreen';
import TaskScreen from '../screens/TaskScreen';
import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../auth/AuthContext';
import { useNotificationWatcher, presentNotification } from '../notifications/pushNotifications';
import { useRealtime } from '../realtime/useRealtime';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Four tabs, deliberately.
 *
 * The web console also has Analytics, Team, Evaluations, Organizations and Administration. On a
 * phone those are either reporting nobody acts on while walking, or platform administration that
 * has no business on a device — so they stay on the web. What is left is the work itself, what
 * changed, the assistant, and billing.
 */
const TABS = [
  { name: 'Home', title: 'Việc của tôi', component: HomeScreen, icon: Home },
  { name: 'Inbox', title: 'Thông báo', component: InboxScreen, icon: Bell },
  { name: 'Assistant', title: 'Trợ lý', component: AssistantScreen, icon: Sparkles },
  { name: 'Plan', title: 'Gói', component: PlanScreen, icon: CreditCard },
  { name: 'Profile', title: 'Hồ sơ', component: ProfileScreen, icon: User },
];

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.foreground,
    border: colors.border,
    primary: colors.blue,
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, focused }) => {
          const item = TABS.find((t) => t.name === route.name);
          if (!item) return null;
          const Icon = item.icon;
          return <Icon size={21} color={color} strokeWidth={focused ? 2.3 : 1.8} />;
        },
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.title }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, accessToken, isReady } = useAuth();
  const navigationRef = useNavigationContainerRef();

  // Raises a real Android notification for anything new, from wherever the user happens to be.
  // The poll is the floor; the socket below is what makes it feel instant.
  useNotificationWatcher(user?.userId ?? null);

  // Same hub the web console listens on, so a comment posted at a desk shows on the phone at once.
  useRealtime(accessToken, (payload) => {
    void presentNotification(payload);
  });

  // Tapping a notification has to land on the thing it is about, not just open the app.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        notificationId?: number;
        referenceType?: string;
        referenceId?: number;
        projectId?: number;
      };
      if (!navigationRef.isReady()) return;

      if (data?.notificationId != null) {
        navigationRef.navigate(
          'NotificationDetail' as never,
          { notificationId: data.notificationId } as never
        );
      } else if (data?.referenceType === 'TASK' && data.referenceId != null) {
        navigationRef.navigate('TaskDetail' as never, { taskId: data.referenceId } as never);
      } else if (data?.projectId != null) {
        navigationRef.navigate('ProjectTasks' as never, { projectId: data.projectId } as never);
      }
    });
    return () => subscription.remove();
  }, [navigationRef]);

  // Deciding before the stored session has been read would flash the login screen at someone who
  // is already signed in.
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontSize: 16 },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="NotificationDetail"
              component={NotificationScreen}
              options={{ title: 'Thông báo' }}
            />
            <Stack.Screen name="ProjectTasks" component={ProjectTasksScreen} options={{ title: 'Dự án' }} />
            <Stack.Screen name="TaskDetail" component={TaskScreen} options={{ title: 'Công việc' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
