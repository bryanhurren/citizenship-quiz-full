import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, SessionStackParamList } from '../types';
import {
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

  // Determine initial route based on session status
  const initialRouteName = currentUser?.session_status === 'in_progress' ? 'Quiz' : 'ModeSelection';

  // Listen for tab focus and navigate to correct screen based on session status
  React.useEffect(() => {
    if (navigationRef.current) {
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
    }
  }, [currentUser?.session_status]);

  return (
    <SessionStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
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
  const currentUser = useQuizStore((state) => state.currentUser);
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);
  const loadSession = useQuizStore((state) => state.loadSession);
  const {getUser} = require('../services/supabase');
  const {getLoggedInUser} = require('../store/quizStore');

  // Auto-login on app startup
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
          }
        }
      } catch (error) {
        console.error('Error loading logged in user:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkLoggedInUser();
  }, []);

  // Check for Stripe checkout success and refresh user data
  useEffect(() => {
    async function handleStripeSuccess() {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
          console.log('Stripe checkout successful, refreshing user data...');
          // Remove query params from URL
          window.history.replaceState({}, '', window.location.pathname);

          // Refresh user data after a short delay to allow webhook to process
          setTimeout(async () => {
            const email = await getLoggedInUser();
            if (email) {
              const user = await getUser(email);
              if (user) {
                console.log('User data refreshed after Stripe checkout');
                setCurrentUser(user);
              }
            }
          }, 2000); // Wait 2 seconds for webhook to process
        }
      }
    }
    handleStripeSuccess();
  }, []);

  if (isLoading) {
    // Show loading screen while checking auth
    return null;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={currentUser ? 'Main' : 'Login'}
      >
        <RootStack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        <RootStack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{
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
