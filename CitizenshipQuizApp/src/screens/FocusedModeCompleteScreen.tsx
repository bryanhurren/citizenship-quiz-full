import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { SessionStackParamList } from '../types';

type RouteParams = RouteProp<SessionStackParamList, 'FocusedModeComplete'>;

export const FocusedModeCompleteScreen = () => {
  const route = useRoute<RouteParams>();

  const {
    previousIncorrect,
    nowCorrect,
    stillIncorrect,
    previousAccuracy,
    newAccuracy,
    testVersion,
  } = route.params;

  const totalPracticed = nowCorrect + stillIncorrect;
  const improvementRate = totalPracticed > 0 ? (nowCorrect / totalPracticed) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <Text style={styles.title}>Practice Complete!</Text>
          <Text style={styles.subtitle}>
            You've finished reviewing your {testVersion === '2025' ? '2025' : '2008'} test questions
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Questions Practiced</Text>
            <Text style={styles.statValue}>{totalPracticed}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Now Correct</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{nowCorrect}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Still Need Review</Text>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{stillIncorrect}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Improvement Rate</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {improvementRate.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Progress Message */}
        <View style={styles.messageCard}>
          <Ionicons
            name={improvementRate >= 70 ? 'trending-up' : improvementRate >= 50 ? 'stats-chart' : 'refresh'}
            size={32}
            color={improvementRate >= 70 ? Colors.success : improvementRate >= 50 ? Colors.primary : Colors.warning}
            style={styles.messageIcon}
          />
          <Text style={styles.messageTitle}>
            {improvementRate >= 70 ? 'Excellent Progress!' : improvementRate >= 50 ? 'Good Work!' : 'Keep Practicing!'}
          </Text>
          <Text style={styles.messageText}>
            {improvementRate >= 70
              ? 'You\'re mastering these questions! Keep up the great work.'
              : improvementRate >= 50
              ? 'You\'re making solid progress. Review the questions you missed and try again.'
              : 'Practice makes perfect! Review the material and come back for more practice.'}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
  },
  messageCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageIcon: {
    marginBottom: Spacing.md,
  },
  messageTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  messageText: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
