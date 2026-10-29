import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProfileButton } from '@/components/profile-button';
import { useAppTheme, type AppColors, type ThemeMode } from '@/lib/app-theme';

type Props = { token: string; onLogout: () => void };

export function AccountMenu({ token, onLogout }: Props) {
  const { colors, mode, setMode } = useAppTheme();
  const styles = createStyles(colors);
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  const openProfile = () => {
    setMenuVisible(false);
    setTimeout(() => setProfileVisible(true), 120);
  };

  const signOut = () => {
    setMenuVisible(false);
    onLogout();
  };

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Open account menu" onPress={() => setMenuVisible(true)} style={styles.hamburgerButton}>
        <View style={styles.hamburgerLines}><View style={styles.hamburgerLine} /><View style={styles.hamburgerLine} /><View style={styles.hamburgerLine} /></View>
      </Pressable>
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Close account menu" style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View style={styles.menuCard}>
            <Pressable accessibilityRole="button" onPress={openProfile} style={styles.menuItem}>
              <Text style={styles.menuItemText}>Profile</Text>
            </Pressable>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Appearance</Text>
            <View style={styles.themeOptionsRow}>{([
              { mode: 'system', label: 'System', name: { ios: 'circle.lefthalf.filled', android: 'brightness_auto', web: 'brightness_auto' }, fallback: '◐' },
              { mode: 'light', label: 'Light', name: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' }, fallback: '☀' },
              { mode: 'dark', label: 'Dark', name: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' }, fallback: '☾' },
            ] as const).map((item) => <Pressable
              key={item.mode}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === item.mode }}
              onPress={() => setMode(item.mode as ThemeMode)}
              style={[styles.themeItem, mode === item.mode && styles.themeItemSelected]}
            >
              <SymbolView name={item.name} fallback={<Text style={styles.iconFallback}>{item.fallback}</Text>} size={19} tintColor={colors.accent} style={styles.themeIcon} />
              <Text style={[styles.menuItemText, styles.themeLabel]}>{item.label}</Text>
            </Pressable>)}</View>
            <View style={styles.divider} />
            <Pressable accessibilityRole="button" onPress={signOut} style={styles.menuItem}>
              <Text style={[styles.menuItemText, styles.signOutText]}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ProfileButton token={token} visible={profileVisible} onVisibleChange={setProfileVisible} showTrigger={false} />
    </>
  );
}

function createStyles(c: AppColors) { return StyleSheet.create({
  hamburgerButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  hamburgerLines: { width: 19, gap: 4 }, hamburgerLine: { height: 2, borderRadius: 2, backgroundColor: c.accent, width: '100%' },
  overlay: { flex: 1, alignItems: 'flex-end', paddingTop: 76, paddingRight: 18, backgroundColor: '#0002' },
  menuCard: { width: 220, paddingVertical: 6, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 14 },
  menuItem: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 17 }, menuItemText: { color: c.text, fontSize: 14, fontWeight: '600' }, signOutText: { color: c.danger }, divider: { height: 1, backgroundColor: c.border, marginHorizontal: 15 },
  sectionLabel: { color: c.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 17, paddingTop: 12, paddingBottom: 5 },
  themeOptionsRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, gap: 5 },
  themeItem: { flex: 1, minHeight: 62, paddingVertical: 7, paddingHorizontal: 3, borderRadius: 11, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }, themeItemSelected: { backgroundColor: c.access }, themeIcon: { width: 20, height: 20 }, iconFallback: { fontSize: 18, color: c.accent }, themeLabel: { fontSize: 11, textAlign: 'center' },
}); }
