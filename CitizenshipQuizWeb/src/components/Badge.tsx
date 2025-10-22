import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface BadgeProps {
  text: string;
  variant?: 'formal' | 'comedy' | 'primary';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'primary', style }) => {
  const badgeStyle = [
    styles.badge,
    variant === 'formal' && styles.formalBadge,
    variant === 'comedy' && styles.comedyBadge,
    variant === 'primary' && styles.primaryBadge,
    style,
  ];

  return (
    <View style={badgeStyle}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  formalBadge: {
    backgroundColor: Colors.formalBadge,
  },
  comedyBadge: {
    backgroundColor: Colors.comedyBadge,
  },
  primaryBadge: {
    backgroundColor: Colors.primary,
  },
  text: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
