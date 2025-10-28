import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useQuizStore } from '../store/quizStore';
import { getUserSessions } from '../services/supabase';
import { Card } from '../components';

interface PastSession {
  id: string;
  completed_at: string;
  correct_count: number;
  partial_count: number;
  incorrect_count: number;
  total_questions_asked: number;
  session_status: 'passed' | 'failed';
  test_version: '2008' | '2025';
  mode: 'formal' | 'comedy';
  study_mode?: 'random' | 'focused'; // Optional for backward compatibility
}

// Format date as MM/DD/YYYY
const formatDateShort = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Format time as HH:MM am/pm
const formatTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12; // Convert to 12-hour format
  return `${hours}:${minutes} ${ampm}`;
};

export const PastSessionsScreen = () => {
  const currentUser = useQuizStore((state) => state.currentUser);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPastSessions();
  }, [currentUser]);

  const loadPastSessions = async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      const sessions = await getUserSessions(currentUser.id);
      setPastSessions(sessions || []);
    } catch (error) {
      console.error('Error loading past sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Past Sessions</Text>

        {pastSessions.length > 0 ? (
          <Card>
            <View style={styles.pastSessionTable}>
              {/* Table Header */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date / Time</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Score</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Result</Text>
              </View>

              {/* Table Data Rows - All sessions */}
              {pastSessions.map((session) => {
                const maxQuestions = session.test_version === '2025' ? 20 : 10;
                const passThreshold = session.test_version === '2025' ? 12 : 6;

                // For focused mode, show as "complete" with neutral/positive color
                const isFocusedMode = session.study_mode === 'focused';
                const sessionPassed = isFocusedMode ? true : session.correct_count >= passThreshold;
                const statusText = isFocusedMode ? 'COMPLETE' : (session.session_status === 'passed' ? 'PASS' : 'FAIL');

                return (
                  <View key={session.id} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { flex: 2 }]} numberOfLines={1}>
                      {formatDateShort(session.completed_at)} / {formatTime(session.completed_at)}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                      {session.correct_count}/{session.total_questions_asked}
                    </Text>
                    <Text
                      style={[
                        styles.tableCellText,
                        { flex: 1, textAlign: 'center', fontWeight: '600' },
                        { color: sessionPassed ? Colors.correct : Colors.incorrect }
                      ]}
                      numberOfLines={1}
                    >
                      {statusText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={styles.noSessionText}>
              You have no past sessions yet.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  pastSessionTable: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  tableHeaderText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  tableCellText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  noSessionText: {
    fontSize: FontSizes.base,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
