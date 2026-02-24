import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ScreenTitleProps {
  title: string;
  marginBottom?: number;
}

export function ScreenTitle({ title, marginBottom = 8 }: ScreenTitleProps) {
  return (
    <Text style={[styles.title, { marginBottom }]}>{title}</Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
});
