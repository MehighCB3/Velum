import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface Tab {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl({ tabs, activeTab, onTabChange, style }: SegmentedControlProps) {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f0ece6',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.text,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: '#fff',
  },
});
