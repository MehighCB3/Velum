import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface FABProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  iconColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function FAB({
  icon,
  onPress,
  color = colors.dark,
  iconColor = colors.darkText,
  size = 28,
  style,
}: FABProps) {
  return (
    <Pressable style={[styles.fab, { backgroundColor: color }, style]} onPress={onPress}>
      <Ionicons name={icon} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.fabBottom,
    right: spacing.fabRight,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
