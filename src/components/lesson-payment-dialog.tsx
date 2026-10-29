import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/lib/app-theme';

type Props = {
  visible: boolean;
  lessonTitle?: string;
  onClose: () => void;
  onPurchase?: () => void;
  purchaseLabel?: string;
  working?: boolean;
  message?: string;
};

export function LessonPaymentDialog({ visible, lessonTitle, onClose, onPurchase, purchaseLabel = 'Unlock all 10 lessons', working = false, message }: Props) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View accessibilityRole="alert" style={styles.dialog}>
        <Text style={styles.kicker}>FULL COURSE</Text>
        <Text style={styles.title}>Unlock this lesson</Text>
        <Text style={styles.description}>{lessonTitle ? `${lessonTitle} is part of the complete course.` : 'This lesson is part of the complete course.'} Get one-time access to all 10 lessons.</Text>
        {!!message && <Text style={styles.message}>{message}</Text>}
        {onPurchase && <Pressable accessibilityRole="button" onPress={onPurchase} disabled={working} style={[styles.primary, working && styles.disabled]}>
          {working ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{purchaseLabel}</Text>}
        </Pressable>}
        <Pressable accessibilityRole="button" onPress={onClose} disabled={working} style={styles.secondary}>
          <Text style={styles.secondaryText}>Maybe later</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>['colors']) { return StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.48)' },
  dialog: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 22, backgroundColor: c.background, borderWidth: 1, borderColor: c.border, gap: 13, elevation: 8 },
  kicker: { color: c.accent, fontSize: 10, fontWeight: '700', letterSpacing: 2 }, title: { color: c.text, fontFamily: 'serif', fontSize: 25, lineHeight: 31 },
  description: { color: c.muted, fontSize: 14, lineHeight: 21 }, message: { color: c.danger, fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 48, marginTop: 4, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: c.accent }, primaryText: { color: c.surface, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondary: { minHeight: 42, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: c.muted, fontSize: 13, fontWeight: '600' }, disabled: { opacity: 0.7 },
}); }
