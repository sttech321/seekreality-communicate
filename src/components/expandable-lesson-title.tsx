import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/lib/app-theme';

export function ExpandableLessonTitle({ title }: { title: string }) {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useAppTheme();
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={expanded ? 'Collapse lesson title' : `Show full lesson title: ${title}`}
    accessibilityHint={expanded ? 'Collapses the title' : 'Expands the title to show all of it'}
    onPress={() => setExpanded((value) => !value)}
    style={styles.button}
  >
    <Text numberOfLines={expanded ? undefined : 1} style={[styles.title, { color: colors.text }]}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  title: { width: '100%', fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
});
