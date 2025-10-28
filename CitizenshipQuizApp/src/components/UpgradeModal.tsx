import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { Button } from './Button';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => Promise<void>;
  title?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  title = 'Upgrade to Premium',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await onUpgrade();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={isProcessing ? undefined : onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={isProcessing ? undefined : onClose}
        disabled={isProcessing}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.benefitsSection}>
              <Text style={styles.sectionTitle}>Premium Benefits</Text>

              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>
                  Unlimited questions every day
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>
                  No daily limits on practice sessions
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>
                  Support AI-powered feedback system
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>
                  Premium trophy badge on your profile
                </Text>
              </View>
            </View>

            <View style={styles.pricingSection}>
              <Text style={styles.price}>$0.99/week</Text>
              <Text style={styles.pricingSubtext}>
                Your subscription helps cover AI processing costs and keeps the app running
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Upgrade Now"
                onPress={handleUpgrade}
                style={styles.upgradeButton}
                disabled={isProcessing}
              />
              <Button
                title="Maybe Later"
                onPress={onClose}
                variant="secondary"
                style={styles.closeButton}
                disabled={isProcessing}
              />
            </View>
          </ScrollView>

          {/* Processing Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.processingText}>Processing...</Text>
                <Text style={styles.processingSubtext}>This may take a few seconds</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '85%',
    maxHeight: '80%',
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  benefitsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  benefitIcon: {
    fontSize: FontSizes.xl,
    color: Colors.primary,
    marginRight: Spacing.sm,
    fontWeight: '700',
  },
  benefitText: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.text,
    lineHeight: 22,
  },
  pricingSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  price: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  pricingSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  upgradeButton: {
    marginBottom: 0,
  },
  closeButton: {
    marginBottom: 0,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  processingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  processingText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  processingSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
});
