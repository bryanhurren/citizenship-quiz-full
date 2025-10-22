import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Badge, Header } from '../components';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useQuizStore } from '../store/quizStore';
import { AnswerGrade } from '../types';

export const ResultsScreen = () => {
  const navigation = useNavigation();

  // Zustand store
  const currentUser = useQuizStore((state) => state.currentUser);
  const selectedTestVersion = useQuizStore((state) => state.selectedTestVersion);
  const selectedMode = useQuizStore((state) => state.selectedMode);
  const correctCount = useQuizStore((state) => state.correctCount);
  const partialCount = useQuizStore((state) => state.partialCount);
  const incorrectCount = useQuizStore((state) => state.incorrectCount);
  const questionResults = useQuizStore((state) => state.questionResults);
  const resetQuiz = useQuizStore((state) => state.resetQuiz);

  // Calculate results
  const totalQuestions = questionResults.length;
  const scorePercentage = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  // Determine pass/fail based on test version
  const getPassingThreshold = () => {
    if (selectedTestVersion === '2025') {
      return { required: 77, total: 128 }; // 60% of 128
    }
    return { required: 60, total: 100 }; // 60% of 100
  };

  const threshold = getPassingThreshold();
  const hasPassed = correctCount >= threshold.required;

  // Get celebration message
  const getCelebrationMessage = () => {
    if (hasPassed) {
      if (scorePercentage >= 95) {
        return "Outstanding! You're more than ready for the citizenship interview!";
      } else if (scorePercentage >= 85) {
        return 'Excellent work! You have a strong understanding of the material.';
      } else {
        return "Congratulations! You've passed the practice quiz!";
      }
    } else {
      const questionsNeeded = threshold.required - correctCount;
      return `You need ${questionsNeeded} more correct answers to pass. Keep studying and try again!`;
    }
  };

  // Filter partial and incorrect answers for review
  const reviewAnswers = questionResults.filter(
    (result) => result.grade === 'partial' || result.grade === 'incorrect'
  );

  const handleStartNewSession = () => {
    resetQuiz();
    navigation.navigate('ModeSelection' as never);
  };

  // Get grade badge variant
  const getGradeBadgeVariant = (grade: AnswerGrade) => {
    if (grade === 'correct') return 'primary';
    if (grade === 'partial') return 'comedy';
    return 'formal';
  };

  // Get grade background color
  const getGradeBackgroundColor = (grade: AnswerGrade) => {
    if (grade === 'correct') return Colors.correct;
    if (grade === 'partial') return Colors.partial;
    return Colors.incorrect;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Pass/Fail Header */}
        <View
        style={[
          styles.resultHeader,
          { backgroundColor: hasPassed ? Colors.correct : Colors.incorrect },
        ]}
      >
        <Text style={styles.resultTitle}>
          {hasPassed ? '✓ PASSED' : '✗ NOT PASSED'}
        </Text>
        <Text style={styles.scoreText}>{scorePercentage}%</Text>
        <Text style={styles.scoreSubtext}>
          {correctCount} correct out of {totalQuestions} questions
        </Text>
      </View>

      {/* Celebration/Encouragement Message */}
      <Card>
        <Text style={styles.messageText}>{getCelebrationMessage()}</Text>
      </Card>

      {/* Test Info */}
      <Card>
        <Text style={styles.sectionTitle}>Test Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Test Version:</Text>
          <Badge
            text={selectedTestVersion || '2008'}
            variant="primary"
          />
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Quiz Mode:</Text>
          <Badge
            text={selectedMode || 'formal'}
            variant={selectedMode === 'formal' ? 'formal' : 'comedy'}
          />
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Passing Score:</Text>
          <Text style={styles.infoValue}>
            {threshold.required}/{threshold.total} ({Math.round((threshold.required / threshold.total) * 100)}%)
          </Text>
        </View>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: Colors.correct }]}>
              {correctCount}
            </Text>
            <Text style={styles.statLabel}>Correct</Text>
            <Text style={styles.statPercentage}>
              {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: Colors.partial }]}>
              {partialCount}
            </Text>
            <Text style={styles.statLabel}>Partial</Text>
            <Text style={styles.statPercentage}>
              {totalQuestions > 0 ? Math.round((partialCount / totalQuestions) * 100) : 0}%
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: Colors.incorrect }]}>
              {incorrectCount}
            </Text>
            <Text style={styles.statLabel}>Incorrect</Text>
            <Text style={styles.statPercentage}>
              {totalQuestions > 0 ? Math.round((incorrectCount / totalQuestions) * 100) : 0}%
            </Text>
          </View>
        </View>
      </Card>

      {/* Review Section */}
      {reviewAnswers.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>
            Review ({reviewAnswers.length} {reviewAnswers.length === 1 ? 'question' : 'questions'})
          </Text>
          <Text style={styles.reviewDescription}>
            Review your partial and incorrect answers to improve your understanding:
          </Text>

          {reviewAnswers.map((result, index) => (
            <View
              key={index}
              style={[
                styles.reviewItem,
                { borderLeftColor: getGradeBackgroundColor(result.grade) },
              ]}
            >
              <View style={styles.reviewHeader}>
                <Badge
                  text={result.grade.toUpperCase()}
                  variant={getGradeBadgeVariant(result.grade)}
                />
              </View>

              <Text style={styles.reviewQuestionLabel}>Question:</Text>
              <Text style={styles.reviewQuestionText}>{result.question}</Text>

              <Text style={styles.reviewAnswerLabel}>Your Answer:</Text>
              <Text style={styles.reviewAnswerText}>{result.userAnswer}</Text>

              <Text style={styles.reviewCorrectLabel}>Correct Answer:</Text>
              <Text style={styles.reviewCorrectText}>{result.correctAnswer}</Text>

              {result.feedback && (
                <>
                  <Text style={styles.reviewFeedbackLabel}>Feedback:</Text>
                  <Text style={styles.reviewFeedbackText}>{result.feedback}</Text>
                </>
              )}
            </View>
          ))}
        </Card>
      )}

      {/* Action Buttons */}
      <Button
        title="Start New Session"
        onPress={handleStartNewSession}
        style={styles.newSessionButton}
      />

      <Button
        title="View Profile"
        onPress={() => navigation.navigate('You' as never)}
        variant="secondary"
        style={styles.profileButton}
      />
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  resultHeader: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  resultTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  scoreSubtext: {
    fontSize: FontSizes.base,
    color: Colors.white,
    opacity: 0.9,
  },
  messageText: {
    fontSize: FontSizes.lg,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  statPercentage: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  reviewDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  reviewItem: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
  },
  reviewHeader: {
    marginBottom: Spacing.sm,
  },
  reviewQuestionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  reviewQuestionText: {
    fontSize: FontSizes.base,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  reviewAnswerLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  reviewAnswerText: {
    fontSize: FontSizes.base,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  reviewCorrectLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.correct,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  reviewCorrectText: {
    fontSize: FontSizes.base,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  reviewFeedbackLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  reviewFeedbackText: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  newSessionButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  profileButton: {
    marginBottom: Spacing.xl,
  },
});
