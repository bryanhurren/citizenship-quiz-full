import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

type RouteParams = {
  FocusedModeComplete: {
    previousIncorrect: number;
    nowCorrect: number;
    stillIncorrect: number;
    previousAccuracy: number;
    newAccuracy: number;
    testVersion: '2008' | '2025';
  };
};

export const FocusedModeCompleteScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'FocusedModeComplete'>>();

  // Defensive check: If route params are missing (e.g., direct navigation or page refresh on web),
  // redirect to profile to prevent white screen error
  if (!route.params) {
    React.useEffect(() => {
      (navigation as any).navigate('You');
    }, []);
    return null;
  }

  const {
    previousIncorrect,
    nowCorrect,
    stillIncorrect,
    previousAccuracy,
    newAccuracy,
    testVersion
  } = route.params;

  const handlePracticeAgain = () => {
    // Navigate back to mode selection with focused mode pre-selected
    (navigation as any).navigate('Session', {
      screen: 'ModeSelection',
    });
  };

  const handleReturnToProfile = () => {
    (navigation as any).navigate('You');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Focused Practice Complete!</Text>

        <Text style={styles.subtitle}>
          You've reviewed all {previousIncorrect} questions from your weak areas!
        </Text>

        <View style={styles.divider} />

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Session Results:</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Now correct:</Text>
            <Text style={[styles.statValue, styles.correctText]}>{nowCorrect}</Text>
          </View>
          {stillIncorrect > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Still need review:</Text>
              <Text style={[styles.statValue, styles.incorrectText]}>{stillIncorrect}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Updated Progress:</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Accuracy:</Text>
            <Text style={styles.statValue}>
              {newAccuracy.toFixed(0)}%
              {newAccuracy > previousAccuracy && (
                <Text style={styles.improvementText}> (was {previousAccuracy.toFixed(0)}%)</Text>
              )}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.buttonSection}>
          {stillIncorrect > 0 && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePracticeAgain}
            >
              <Text style={styles.primaryButtonText}>
                Practice Remaining {stillIncorrect} Again
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleReturnToProfile}
          >
            <Text style={styles.secondaryButtonText}>Return to Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: Spacing.lg,
  },
  statsSection: {
    backgroundColor: 'white',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  statsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#374151',
    marginBottom: Spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSizes.md,
    color: '#6b7280',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#1f2937',
  },
  correctText: {
    color: Colors.correct,
  },
  incorrectText: {
    color: Colors.partial,
  },
  improvementText: {
    fontSize: FontSizes.sm,
    color: '#6b7280',
    fontWeight: 'normal',
  },
  buttonSection: {
    marginTop: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
