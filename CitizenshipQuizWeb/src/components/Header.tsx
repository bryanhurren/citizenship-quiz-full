import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Colors, Spacing, FontSizes } from '../constants/theme';

export const Header = () => {
  return (
    <View style={styles.header}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>AI Citizenship Quiz</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#e5e7eb',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1000,
      },
    }),
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: Spacing.sm,
  },
  appName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
});
