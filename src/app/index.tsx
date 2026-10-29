import LessonsScreen from '@/components/lessons-screen';
import { API_BASE_URL } from '@/lib/api';
import { useAppTheme, type AppColors } from '@/lib/app-theme';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
type ApiResult = { user?: { name: string; email: string }; access_token?: string; message?: string };

const TOKEN_KEY = 'communicate_access_token';

function messageFrom(data: any, fallback: string) {
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (typeof first === 'string') return first;
  }
  return data?.message || fallback;
}

async function saveToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } else if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export default function AuthScreen() {
  const { colors: palette } = useAppTheme();
  const styles = createStyles(palette);
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = Platform.OS === 'web'
          ? localStorage.getItem(TOKEN_KEY)
          : await SecureStore.getItemAsync(TOKEN_KEY);
        setToken(stored);
      } catch {
        setToken(null);
      } finally {
        setStarting(false);
      }
    };
    void restoreSession();
  }, []);

  const request = async (endpoint: string, body: Record<string, string>) => {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, device_name: 'Seek Reality Mobile' }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(messageFrom(data, 'Something went wrong. Please try again.'));
    return data as ApiResult;
  };

  const submit = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) return setError('Enter your email address.');
    if (mode === 'register' && !name.trim()) return setError('Enter your name.');
    if (mode === 'login' || mode === 'register' || mode === 'reset') {
      if (password.length < 8) return setError('Your password must be at least 8 characters.');
      if (mode !== 'login' && password !== confirmation) return setError('The passwords do not match.');
    }
    if (mode === 'reset' && !/^\d{6}$/.test(otp)) return setError('Enter the 6-digit code from your email.');

    setBusy(true);
    try {
      if (mode === 'login' || mode === 'register') {
        const data = await request(mode, mode === 'login'
          ? { email: email.trim(), password }
          : { name: name.trim(), email: email.trim(), password, password_confirmation: confirmation });
        if (!data.access_token) throw new Error('The server did not return a sign-in token.');
        await saveToken(data.access_token);
        setToken(data.access_token);
      } else if (mode === 'forgot') {
        const data = await request('forgot-password', { email: email.trim() });
        setNotice(data.message || 'If the email is registered, a reset code has been sent.');
        setMode('reset');
      } else if (mode === 'reset') {
        const data = await request('reset-password', {
          email: email.trim(), otp, password, password_confirmation: confirmation,
        });
        setNotice(data.message || 'Your password has been reset. You can sign in now.');
        setPassword('');
        setConfirmation('');
        setOtp('');
        setMode('login');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to the server.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Begin your journey'
    : mode === 'forgot' ? 'Reset your password' : 'Check your email';
  const subtitle = mode === 'login' ? 'Sign in to continue your path.' : mode === 'register'
    ? 'Create an account and continue exploring.' : mode === 'forgot'
      ? 'We’ll send a one-time code to your email.' : 'Enter the 6-digit code and choose a new password.';
  const showPassword = mode === 'login' || mode === 'register' || mode === 'reset';
  const goTo = (next: Mode) => { setError(''); setNotice(''); setMode(next); };

  if (starting) return <SafeAreaView style={styles.centered}><ActivityIndicator color={palette.accent} /></SafeAreaView>;
  if (token) return <LessonsScreen token={token} onLogout={async () => { await saveToken(null); setToken(null); }} />;

  const field = (label: string, value: string, setter: (v: string) => void, options: {
    placeholder?: string; secure?: boolean; keyboardType?: 'default' | 'email-address' | 'number-pad';
    autoCapitalize?: 'none' | 'sentences'; maxLength?: number; returnKeyType?: 'done' | 'go' | 'next'; onSubmitEditing?: () => void;
  } = {}) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={setter}
        placeholder={options.placeholder || label} placeholderTextColor="#737a6e"
        secureTextEntry={options.secure} keyboardType={options.keyboardType || 'default'}
        autoCapitalize={options.autoCapitalize} autoCorrect={false} maxLength={options.maxLength}
        returnKeyType={options.returnKeyType} onSubmitEditing={options.onSubmitEditing}
        style={styles.input} selectionColor={palette.accent} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          <View style={styles.card}>
            <View style={styles.brandRow}><Image accessibilityLabel="Seek Reality" source={require('@/assets/images/arei_logo.png')} resizeMode="contain" style={styles.brandLogo} /></View>
            <View style={styles.rule} />
            <Text style={styles.eyebrow}>A SPACE TO GROW</Text><Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.form}>
              {mode === 'register' && field('Name', name, setName, { autoCapitalize: 'sentences' })}
              {field('Email address', email, setEmail, { placeholder: 'you@example.com', keyboardType: 'email-address', autoCapitalize: 'none' })}
              {mode === 'reset' && field('6-digit code', otp, setOtp, { placeholder: '000000', keyboardType: 'number-pad', maxLength: 6 })}
              {showPassword && field(mode === 'reset' ? 'New password' : 'Password', password, setPassword, { secure: true, returnKeyType: mode === 'login' ? 'go' : 'next', onSubmitEditing: mode === 'login' ? () => { void submit(); } : undefined })}
              {(mode === 'register' || mode === 'reset') && field('Confirm password', confirmation, setConfirmation, { secure: true, returnKeyType: 'go', onSubmitEditing: () => { void submit(); } })}
              {mode === 'login' && <Pressable onPress={() => goTo('forgot')} hitSlop={10} style={styles.forgotLink}><Text style={styles.linkText}>Forgot password?</Text></Pressable>}
              {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              {!!notice && <Text style={styles.notice}>{notice}</Text>}
              <Pressable accessibilityState={{ busy, disabled: busy }} onPress={submit} disabled={busy} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}>
                {busy ? <View style={styles.busyButtonContent}><ActivityIndicator color={palette.background} /><Text style={styles.primaryText}>{mode === 'login' ? 'Signing in…' : mode === 'register' ? 'Creating account…' : mode === 'forgot' ? 'Sending code…' : 'Updating password…'}</Text></View> : <Text style={styles.primaryText}>
                  {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset code' : 'Update password'}
                </Text>}
              </Pressable>
            </View>
            {mode === 'login' && <View style={styles.footerRow}><Text style={styles.footerText}>New to Seek Reality? </Text><Pressable onPress={() => goTo('register')}><Text style={styles.linkText}>Create account</Text></Pressable></View>}
            {mode === 'register' && <View style={styles.footerRow}><Text style={styles.footerText}>Already have an account? </Text><Pressable onPress={() => goTo('login')}><Text style={styles.linkText}>Sign in</Text></Pressable></View>}
            {(mode === 'forgot' || mode === 'reset') && <Pressable onPress={() => goTo('login')} style={styles.backLink}><Text style={styles.linkText}>← Back to sign in</Text></Pressable>}
            {mode === 'reset' && <Pressable onPress={() => goTo('forgot')} style={styles.resendLink}><Text style={styles.footerText}>Need another code? </Text><Text style={styles.linkText}>Send again</Text></Pressable>}
          </View>
          <Text style={styles.bottomCaption}>WISDOM · PRACTICE · REALIZATION</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(palette: AppColors) { return StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: palette.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 24, paddingHorizontal: 28, paddingTop: 26, paddingBottom: 24 },
  brandRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, brandLogo: { width: 142, height: 56 }, brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brandMark: { width: 32, height: 32, borderRadius: 11, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontSize: 19, fontWeight: '700', color: palette.background, fontFamily: 'serif' }, brand: { color: palette.text, fontSize: 12, letterSpacing: 2.6, fontWeight: '700' },
  rule: { height: 1, backgroundColor: palette.border, marginTop: 23, marginBottom: 26 }, eyebrow: { fontSize: 10, color: palette.accent, letterSpacing: 2.4, fontWeight: '700', marginBottom: 10 },
  title: { fontSize: 30, lineHeight: 37, color: palette.text, fontFamily: 'serif' }, subtitle: { fontSize: 14, lineHeight: 21, color: palette.muted, marginTop: 7 },
  form: { marginTop: 26, gap: 17 }, fieldGroup: { gap: 8 }, label: { color: palette.text, fontSize: 12, fontWeight: '600' },
  input: { height: 50, borderRadius: 12, backgroundColor: palette.field, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 15, color: palette.text, fontSize: 15 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -4 }, linkText: { color: palette.accent, fontSize: 13, fontWeight: '600' },
  primaryButton: { minHeight: 51, borderRadius: 12, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 3 },
  busyButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { color: palette.background, fontWeight: '700', fontSize: 15 }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.65 },
  error: { color: palette.danger, fontSize: 13, lineHeight: 19 }, notice: { color: palette.green, fontSize: 13, lineHeight: 20, backgroundColor: palette.access, padding: 12, borderRadius: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 23 }, footerText: { color: palette.muted, fontSize: 13 }, backLink: { alignSelf: 'center', marginTop: 22 },
  resendLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 }, bottomCaption: { color: '#697063', fontSize: 9, letterSpacing: 2.1, marginTop: 22 },
}); }
