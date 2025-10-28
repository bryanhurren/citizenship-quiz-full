import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { Button } from '../components';
import { setWelcomeShown } from '../services/guestMode';
import { useQuizStore } from '../store/quizStore';

export const WelcomeScreen = () => {
  const navigation = useNavigation();
  const setGuestMode = useQuizStore((state) => state.setGuestMode);

  const handleGetStarted = async () => {
    // Mark welcome as shown
    await setWelcomeShown();

    // Set guest mode
    setGuestMode();

    // Navigate to Mode Selection
    navigation.navigate('Main' as never, {
      screen: 'Session',
      params: { screen: 'ModeSelection' },
    } as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>US Citizenship Quiz</Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Master the US Citizenship civics test with interactive practice sessions.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                Choose between <Text style={styles.bold}>2008</Text> or <Text style={styles.bold}>2025</Text> test versions based on your Form N-400 filing date
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                Practice in <Text style={styles.bold}>Formal Mode</Text> (professional USCIS simulation) or <Text style={styles.bold}>Comedy Mode</Text> (entertaining study with humor)
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                Get instant AI-powered feedback.
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                Track your progress and resume sessions across devices
              </Text>
            </View>
          </View>

          <Text style={styles.guestNotice}>
            Try up to 5 questions as a guest, or create a free account to unlock unlimited practice and save your progress.
          </Text>
        </View>

        {/* Get Started Button */}
        <Button
          title="Let's Get Started!"
          onPress={handleGetStarted}
        />

        {/* Legal Links */}
        <View style={styles.legalLinksContainer}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.theeclodapps.com/privacy.html')}
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.theeclodapps.com/eula.html')}
          >
            <Text style={styles.legalLink}>EULA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  descriptionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: FontSizes.lg * 1.5,
  },
  featureList: {
    marginBottom: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  featureBullet: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginRight: Spacing.sm,
    fontWeight: 'bold',
  },
  featureText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: FontSizes.md * 1.5,
  },
  bold: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  guestNotice: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
    lineHeight: FontSizes.sm * 1.5,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  legalLink: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  legalSeparator: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.sm,
  },
});
