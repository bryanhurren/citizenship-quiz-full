import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, SessionStackParamList } from '../types';
import {
  WelcomeScreen,
  LoginScreen,
  ModeSelectionScreen,
  QuizScreen,
  ResultsScreen,
  ProfileScreen,
  PastSessionsScreen,
  FocusedModeCompleteScreen,
} from '../screens';
import { Colors } from '../constants/theme';
import { useQuizStore } from '../store/quizStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const SessionStack = createNativeStackNavigator<SessionStackParamList>();

// Session Tab Stack Navigator
function SessionStackNavigator() {
  const currentUser = useQuizStore((state) => state.currentUser);
  const navigationRef = React.useRef<any>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  // Determine initial route based on session status
  const initialRouteName = currentUser?.session_status === 'in_progress' ? 'Quiz' : 'ModeSelection';

  // Listen for navigation state changes and reset if needed
  const handleNavigationReady = React.useCallback(() => {
    if (!navigationRef.current) return;

    if (currentUser?.session_status === 'in_progress') {
      // If we have an active session, ensure we're on Quiz screen
      const currentRoute = navigationRef.current.getCurrentRoute?.()?.name;
      if (currentRoute === 'ModeSelection') {
        navigationRef.current.navigate('Quiz');
      }
    } else {
      // No active session - reset to ModeSelection if we're on a completion screen
      const currentRoute = navigationRef.current.getCurrentRoute?.()?.name;
      if (currentRoute === 'FocusedModeComplete' || currentRoute === 'Results') {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'ModeSelection' }],
        });
      }
    }
  }, [currentUser?.session_status]);

  // Run on session status changes
  React.useEffect(() => {
    handleNavigationReady();
  }, [currentUser?.session_status, handleNavigationReady]);

  // Also run when this navigator becomes focused (tab switch)
  React.useEffect(() => {
    if (isFocused) {
      // Small delay to ensure navigation state is ready
      setTimeout(handleNavigationReady, 100);
    }
  }, [isFocused, handleNavigationReady]);

  return (
    <SessionStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={initialRouteName}
      ref={navigationRef}
      screenListeners={{
        state: () => {
          // Track when this navigator's state changes
          setIsFocused(true);
        },
        blur: () => {
          setIsFocused(false);
        },
      }}
    >
      <SessionStack.Screen
        name="ModeSelection"
        component={ModeSelectionScreen}
      />
      <SessionStack.Screen
        name="Quiz"
        component={QuizScreen}
      />
      <SessionStack.Screen
        name="Results"
        component={ResultsScreen}
      />
      <SessionStack.Screen
        name="FocusedModeComplete"
        component={FocusedModeCompleteScreen}
        options={{ title: 'Practice Complete' }}
      />
    </SessionStack.Navigator>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="You"
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerShown: false,
        // IMPORTANT: Don't unmount screens when navigating away
        // This preserves the navigation state when switching tabs
        unmountOnBlur: false,
      }}
    >
      <Tab.Screen
        name="Session"
        component={SessionStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="You"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Welcome' | 'Login' | 'Main'>('Login');
  const currentUser = useQuizStore((state) => state.currentUser);
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);
  const setGuestMode = useQuizStore((state) => state.setGuestMode);
  const loadSession = useQuizStore((state) => state.loadSession);
  const {getUser} = require('../services/supabase');
  const {getLoggedInUser} = require('../store/quizStore');
  const {hasEverCreatedAccount} = require('../services/guestMode');

  // Auto-login on app startup and determine initial route
  useEffect(() => {
    async function checkLoggedInUser() {
      try {
        const email = await getLoggedInUser();
        if (email) {
          const user = await getUser(email);
          if (user) {
            setCurrentUser(user);
            // Load session data into memory if there's an active session
            if (user.session_status === 'in_progress') {
              await loadSession();
            }
            setInitialRoute('Main');
            return;
          }
        }

        // No logged in user - check if they have ever created an account
        const hasAccount = await hasEverCreatedAccount();

        if (!hasAccount) {
          // No account (first-time or returning guest) - show welcome screen
          setInitialRoute('Welcome');
        } else {
          // Has account but not logged in - show login
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('Error loading logged in user:', error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    }
    checkLoggedInUser();
  }, []);

  if (isLoading) {
    // Show loading screen while checking auth
    return null;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        <RootStack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{
            animationEnabled: false,
            gestureEnabled: false,
          }}
        />
        <RootStack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animationEnabled: false,
            gestureEnabled: false,
          }}
        />
        <RootStack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{
            animationEnabled: false,
            gestureEnabled: false,
          }}
        />
        <RootStack.Screen
          name="PastSessions"
          component={PastSessionsScreen}
          options={{ headerShown: true, title: 'Past Sessions' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
