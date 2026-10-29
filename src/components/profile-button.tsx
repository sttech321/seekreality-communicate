import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@/lib/api';
import { useAppTheme, type AppColors } from '@/lib/app-theme';

type Props = {
  token: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  showTrigger?: boolean;
};
type Profile = { name: string; email: string };

function errorMessage(data: any, fallback: string) {
  const first = data?.errors ? Object.values(data.errors).flat()[0] : null;
  return typeof first === 'string' ? first : data?.message || fallback;
}

export function ProfileButton({ token, visible, onVisibleChange, showTrigger = true }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = visible ?? internalVisible;
  const changeVisible = (next: boolean) => {
    if (visible === undefined) setInternalVisible(next);
    onVisibleChange?.(next);
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isVisible) return;
    let active = true;
    setLoading(true);
    setError('');
    setNotice('');
    fetch(`${API_BASE_URL}/user`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(errorMessage(data, 'Could not load your profile.'));
        return data;
      })
      .then((data) => {
        if (!active) return;
        const user = data.user || data.data || data;
        const nextProfile = { name: user.name || '', email: user.email || '' };
        setProfile(nextProfile);
        setName(nextProfile.name);
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Could not load your profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, isVisible]);

  const submit = async (endpoint: 'profile' | 'password', method: 'PATCH' | 'PUT', body: Record<string, string>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(data, 'The request could not be completed.'));
      if (endpoint === 'profile') {
        const savedName = data.user?.name || body.name;
        setName(savedName);
        setProfile((current) => current ? { ...current, name: savedName } : current);
        setNotice(data.message || 'Your name has been updated.');
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmation('');
        setNotice(data.message || 'Your password has been updated.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your profile.');
    } finally {
      setBusy(false);
    }
  };

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter your name.'); return; }
    void submit('profile', 'PATCH', { name: trimmed });
  };

  const savePassword = () => {
    if (!currentPassword) { setError('Enter your current password.'); return; }
    if (newPassword.length < 8) { setError('Your new password must be at least 8 characters.'); return; }
    if (newPassword !== confirmation) { setError('The new passwords do not match.'); return; }
    void submit('password', 'PUT', { current_password: currentPassword, password: newPassword, password_confirmation: confirmation });
  };

  return (
    <>
      {showTrigger && <Pressable accessibilityRole="button" onPress={() => changeVisible(true)} style={styles.openButton}>
        <Text style={styles.openButtonText}>Profile</Text>
      </Pressable>}
      <Modal visible={isVisible} transparent animationType="fade" onRequestClose={() => changeVisible(false)}>
        <View style={styles.overlay}>
          <SafeAreaView style={styles.safeFrame}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={styles.card}>
                <View style={styles.modalHeader}>
                  <View><Text style={styles.eyebrow}>ACCOUNT SETTINGS</Text><Text style={styles.title}>Your profile</Text></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close profile" onPress={() => changeVisible(false)} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>
                </View>
                {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : (
                  <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                    {!!profile?.email && <Text style={styles.email}>{profile.email}</Text>}
                    <Text style={styles.sectionTitle}>Name</Text>
                    <TextInput accessibilityLabel="Name" value={name} onChangeText={setName} autoCapitalize="words" autoCorrect={false} style={styles.input} placeholder="Your name" placeholderTextColor={colors.muted} />
                    <Pressable disabled={busy} onPress={saveName} style={[styles.saveButton, busy && styles.disabled]}>
                      {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveText}>Save name</Text>}
                    </Pressable>
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>Change password</Text>
                    <TextInput accessibilityLabel="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" style={styles.input} placeholder="Current password" placeholderTextColor={colors.muted} />
                    <TextInput accessibilityLabel="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" style={styles.input} placeholder="New password (8+ characters)" placeholderTextColor={colors.muted} />
                    <TextInput accessibilityLabel="Confirm new password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" style={styles.input} placeholder="Confirm new password" placeholderTextColor={colors.muted} />
                    <Pressable disabled={busy} onPress={savePassword} style={[styles.secondaryButton, busy && styles.disabled]}>
                      {busy ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.secondaryText}>Update password</Text>}
                    </Pressable>
                    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
                    {!!notice && <Text style={styles.notice}>{notice}</Text>}
                  </ScrollView>
                )}
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function createStyles(c: AppColors) { return StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center' }, safeFrame: { flex: 1, justifyContent: 'center', padding: 20 }, overlay: { flex: 1, justifyContent: 'center', backgroundColor: '#0008' },
  card: { width: '100%', maxWidth: 480, maxHeight: '90%', alignSelf: 'center', borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  modalHeader: { padding: 22, borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: c.accent, fontSize: 9, letterSpacing: 1.6, fontWeight: '700' }, title: { color: c.text, fontSize: 24, fontFamily: 'serif', marginTop: 5 },
  closeButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: c.field }, closeText: { color: c.accent, fontWeight: '700', fontSize: 12 }, loader: { margin: 32 }, form: { padding: 22, gap: 12 }, email: { color: c.muted, fontSize: 13, marginBottom: 5 }, sectionTitle: { color: c.text, fontSize: 14, fontWeight: '700', marginTop: 3 },
  input: { height: 48, borderRadius: 12, backgroundColor: c.field, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, color: c.text, fontSize: 14 }, saveButton: { minHeight: 46, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }, saveText: { color: c.surface, fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 8 }, secondaryButton: { minHeight: 46, borderWidth: 1, borderColor: c.accent, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: c.accent, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 }, error: { color: c.danger, fontSize: 12, lineHeight: 18, padding: 10, borderRadius: 10, backgroundColor: c.paywall }, notice: { color: c.green, fontSize: 12, lineHeight: 18, padding: 10, borderRadius: 10, backgroundColor: c.access },
  openButton: { minWidth: 70, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }, openButtonText: { color: c.accent, fontSize: 13, fontWeight: '600' },
}); }
