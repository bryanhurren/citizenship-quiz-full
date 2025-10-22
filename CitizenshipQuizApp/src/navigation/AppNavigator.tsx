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
} from '../screens';
import { Colors } from '../constants/theme';
import { useQuizStore } from '../store/quizStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const SessionStack = createNativeStackNavigator<SessionStackParamList>();

// Session Tab Stack Navigator
function SessionStackNavigator() {
  return (
    <SessionStack.Navigator screenOptions={{ headerShown: false }}>
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
