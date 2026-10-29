import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/lib/app-theme';

type Props = {
  onPrevious: () => void;
  onHome: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
  loading?: 'previous' | 'next' | null;
};

export function LessonBottomNav({ onPrevious, onHome, onNext, canPrevious, canNext, loading = null }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={loading === 'previous' ? 'Loading previous lesson' : 'Previous lesson'} disabled={!canPrevious || loading !== null} onPress={onPrevious} style={[styles.sideAction, !canPrevious && styles.disabled]}>
        {loading === 'previous' ? <ActivityIndicator size="small" color={colors.accent} /> : <Image source={require('@/assets/images/arrow-left.png')} resizeMode="contain" style={styles.arrowIcon} />}
        <Text style={[styles.sideLabel, { color: colors.muted }]}>{loading === 'previous' ? 'Loading' : 'Previous'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Return to lessons home" disabled={loading !== null} onPress={onHome} style={[styles.homeAction, loading !== null && styles.disabled]}>
        <Image source={require('@/assets/images/home.png')} resizeMode="contain" style={styles.homeIcon} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={loading === 'next' ? 'Loading next lesson' : 'Next lesson'} disabled={!canNext || loading !== null} onPress={onNext} style={[styles.sideAction, !canNext && styles.disabled]}>
        <Text style={[styles.sideLabel, { color: colors.muted }]}>{loading === 'next' ? 'Loading' : 'Next'}</Text>
        {loading === 'next' ? <ActivityIndicator size="small" color={colors.accent} /> : <Image source={require('@/assets/images/arrow-right.png')} resizeMode="contain" style={styles.arrowIcon} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 72, borderTopWidth: 1, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideAction: { minWidth: 96, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  arrowIcon: { width: 18, height: 18 },
  sideLabel: { fontSize: 12, fontWeight: '600' },
  homeAction: { width: 56, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  homeIcon: { width: 38, height: 38 },
  disabled: { opacity: 0.35 },
});
