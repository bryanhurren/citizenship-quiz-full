import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface ModeOptionCardProps {
  title: string;
  description: string;
  onPress: () => void;
  selected?: boolean;
  style?: ViewStyle;
}

export const ModeOptionCard: React.FC<ModeOptionCardProps> = ({
  title,
  description,
  onPress,
  selected = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.selectedCard,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.title, selected && styles.selectedText]}>{title}</Text>
      <Text style={[styles.description, selected && styles.selectedDescription]}>
        {description}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  title: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    lineHeight: 18,
  },
  selectedText: {
    color: Colors.white,
  },
  selectedDescription: {
    color: Colors.white,
    opacity: 0.9,
  },
});
