import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface TagProps {
  children: React.ReactNode;
  variant?: 'muted' | 'accent' | 'green';
}

export function Tag({ children, variant = 'muted' }: TagProps) {
  const bg =
    variant === 'accent'
      ? colors.accentLight
      : variant === 'green'
      ? colors.greenLight
      : colors.borderLight;
  const color =
    variant === 'accent'
      ? colors.accent
      : variant === 'green'
      ? colors.green
      : colors.textSub;

  return (
    <Text style={[styles.tag, { backgroundColor: bg, color }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
});
