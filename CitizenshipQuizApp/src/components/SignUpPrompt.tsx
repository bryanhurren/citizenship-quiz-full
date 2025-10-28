import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SignUpPromptProps {
  visible: boolean;
  onDismiss: () => void;
  onAppleSignIn: () => void;
  onGoogleSignIn: () => void;
}

export const SignUpPrompt: React.FC<SignUpPromptProps> = ({
  visible,
  onDismiss,
  onAppleSignIn,
  onGoogleSignIn,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Text style={styles.title}>Daily Limit Reached</Text>
          <Text style={styles.message}>
            As a guest, you're entitled to answer 5 questions daily.{'\n\n'}
            Create a free account to:{'\n'}
            • Save your progress{'\n'}
            • Track your scores{'\n'}
            • Resume across devices{'\n'}
            • Access premium features
          </Text>

          {/* Sign-in options */}
          <View style={styles.signInContainer}>
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={8}
                style={styles.appleButton}
                onPress={onAppleSignIn}
              />
            )}

            <GoogleSignInButton onPress={onGoogleSignIn} />
          </View>

          {/* Continue as guest option */}
          <TouchableOpacity style={styles.continueButton} onPress={onDismiss}>
            <Text style={styles.continueButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  signInContainer: {
    marginBottom: Spacing.lg,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: Spacing.md,
  },
  continueButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
