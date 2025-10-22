import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, View } from 'react-native';
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
      <View style={styles.contentContainer}>
        <View style={styles.radioContainer}>
          <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
            {selected && <View style={styles.radioInner} />}
          </View>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, selected && styles.selectedText]}>{title}</Text>
          <Text style={[styles.description, selected && styles.selectedDescription]}>
            {description}
          </Text>
        </View>
      </View>
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
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioContainer: {
    paddingTop: 2,
    marginRight: Spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.white,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.white,
  },
  textContainer: {
    flex: 1,
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
