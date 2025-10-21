import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { Button } from './Button';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  onUpgrade,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Upgrade to Premium</Text>

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
              <Text style={styles.price}>$1/week</Text>
              <Text style={styles.pricingSubtext}>
                Your subscription helps cover AI processing costs and keeps the app running
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Upgrade Now"
                onPress={onUpgrade}
                style={styles.upgradeButton}
              />
              <Button
                title="Maybe Later"
                onPress={onClose}
                variant="secondary"
                style={styles.closeButton}
              />
            </View>
          </ScrollView>
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
});
