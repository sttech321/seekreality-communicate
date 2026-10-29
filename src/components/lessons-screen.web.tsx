import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountMenu } from '@/components/account-menu';
import { ExpandableLessonTitle } from '@/components/expandable-lesson-title';
import { LessonBodyView } from '@/components/lesson-body-view';
import { LessonBottomNav } from '@/components/lesson-bottom-nav';
import { LessonPaymentDialog } from '@/components/lesson-payment-dialog';
import { COMMUNICATE_API_URL } from '@/lib/api';
import { useAppTheme, type AppColors } from '@/lib/app-theme';
import type { LessonContent, LessonSummary, LessonsScreenProps } from './lesson-types';

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'The request could not be completed.');
  return data;
}

export default function LessonsScreen({ token, onLogout }: LessonsScreenProps) {
  const { colors: c } = useAppTheme();
  const styles = createStyles(c);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [courseAccess, setCourseAccess] = useState(false);
  const [selected, setSelected] = useState<LessonContent | null>(null);
  const [lockedLesson, setLockedLesson] = useState<LessonSummary | null>(null);
  const [paymentLesson, setPaymentLesson] = useState<LessonSummary | null>(null);
  const [loadingDirection, setLoadingDirection] = useState<'previous' | 'next' | null>(null);
  const [openingLesson, setOpeningLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLessons = useCallback(async () => {
    const response = await fetch(`${COMMUNICATE_API_URL}/lessons`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
    const data = await readJson(response);
    setLessons(data.data || []);
    setCourseAccess(Boolean(data.course_access));
  }, [token]);

  useEffect(() => {
    loadLessons().catch((e) => setError(e instanceof Error ? e.message : 'Could not load lessons.')).finally(() => setLoading(false));
  }, [loadLessons]);

  const openLesson = async (lesson: LessonSummary) => {
    setError('');
    if (!lesson.is_unlocked) {
      setPaymentLesson(lesson);
      return;
    }
    setOpeningLesson(lesson.slug);
    setLoading(true);
    try {
      const response = await fetch(`${COMMUNICATE_API_URL}/lessons/${encodeURIComponent(lesson.slug)}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      const data = await readJson(response);
      setSelected(data.data);
      setLockedLesson(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this lesson.');
    } finally {
      setLoading(false);
      setOpeningLesson(null);
    }
  };

  const current = selected || lockedLesson;
  const currentIndex = current ? lessons.findIndex((lesson) => lesson.slug === current.slug) : -1;
  const goHome = () => { setSelected(null); setLockedLesson(null); setError(''); };
  const navigate = async (index: number, direction: 'previous' | 'next') => {
    const lesson = lessons[index];
    if (!lesson) return;
    if (!lesson.is_unlocked) { setPaymentLesson(lesson); return; }
    setLoadingDirection(direction);
    try { await openLesson(lesson); } finally { setLoadingDirection(null); }
  };

  if (current) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ExpandableLessonTitle title={current.title} />
      </View>
      {selected ? <LessonBodyView key={selected.slug} lesson={selected} /> : (
        <View style={styles.lockedScreen}>
          <Text style={styles.kicker}>LESSON {String(lockedLesson?.position || '').padStart(2, '0')} · FULL COURSE</Text>
          <Text style={styles.lockedTitle}>Continue with the complete course</Text>
          <Text style={styles.subtitle}>This lesson is included with your one-time course unlock. Your free lesson stays available.</Text>
          <View style={styles.paywall}><Text style={styles.title}>Unlock all 5 lessons</Text><Text style={styles.subtitle}>Complete your purchase in the iOS or Android app.</Text></View>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
      <LessonBottomNav onPrevious={() => void navigate(currentIndex - 1, 'previous')} onHome={goHome} onNext={() => void navigate(currentIndex + 1, 'next')} canPrevious={currentIndex > 0} canNext={currentIndex >= 0 && currentIndex < lessons.length - 1} loading={loadingDirection} />
      <LessonPaymentDialog visible={!!paymentLesson} lessonTitle={paymentLesson?.title} onClose={() => setPaymentLesson(null)} message="Complete your one-time course purchase in the iOS or Android app." />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.brandBlock}><Image accessibilityLabel="AERI" source={require('@/assets/images/arei_logo.png')} resizeMode="contain" style={styles.brandLogo} /></View>
        <Text pointerEvents="none" style={styles.headerTitle}>All lessons</Text>
        <AccountMenu token={token} onLogout={onLogout} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}><Text style={styles.kicker}>AREA 1 · AFTERLIFE EVIDENCE</Text><Text style={styles.heroTitle}>Continue your journey</Text>
          <Text style={styles.subtitle}>Start with the free introduction, then unlock the four guided stages.</Text>
          <Text style={styles.progress}>{lessons.filter((l) => l.is_unlocked).length} of {lessons.length || 5} lessons available</Text></View>
        {loading && <ActivityIndicator color={c.accent} style={{ margin: 30 }} />}
        {lessons.map((lesson) => <Pressable key={lesson.slug} disabled={openingLesson !== null} onPress={() => void openLesson(lesson)} style={({ pressed }) => [styles.row, pressed && styles.pressed, openingLesson !== null && openingLesson !== lesson.slug && styles.disabled]}>
          <Text style={[styles.number, lesson.is_unlocked && styles.unlocked]}>{String(lesson.position).padStart(2, '0')}</Text>
          <View style={styles.lessonDetails}>
            <Text style={styles.eyebrow}>{lesson.eyebrow || `LESSON ${lesson.position}`}</Text>
            <Text style={styles.title}>{lesson.title}</Text>
            <View style={[styles.actionPill, lesson.is_unlocked ? styles.actionOpen : styles.actionLocked]}>
              {openingLesson === lesson.slug ? <><ActivityIndicator size="small" color="#fff" /><Text style={styles.actionOpenText}>Opening…</Text></> : <><Text style={lesson.is_unlocked ? styles.actionOpenText : styles.actionLockedText}>{lesson.is_unlocked ? 'Read lesson' : 'Unlock lesson'}</Text><Image source={lesson.is_unlocked ? require('@/assets/images/open-unlock-arrow.png') : require('@/assets/images/unlock.png')} resizeMode="contain" style={lesson.is_unlocked ? [styles.actionIcon, styles.actionIconOpen] : styles.lockIcon} /></>}
            </View>
          </View>
        </Pressable>)}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!courseAccess && <View style={styles.paywall}><Text style={styles.title}>Unlock all 5 lessons</Text><Text style={styles.subtitle}>One payment · permanent access</Text><Text style={styles.restore}>Complete your purchase in the iOS or Android app.</Text></View>}
        {courseAccess && <Text style={styles.unlocked}>FULL COURSE UNLOCKED</Text>}
      </ScrollView>
      <LessonPaymentDialog visible={!!paymentLesson} lessonTitle={paymentLesson?.title} onClose={() => setPaymentLesson(null)} message="Complete your one-time course purchase in the iOS or Android app." />
    </SafeAreaView>
  );
}

function createStyles(c: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 12 },
  header: { position: 'relative', minHeight: 72, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.border },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brandLogo: { width: 94, height: 40 },
  brand: { color: c.accent, fontSize: 10, letterSpacing: 2.4, fontWeight: '700' }, headerTitle: { position: 'absolute', left: '30%', right: '30%', color: c.text, fontSize: 18, fontFamily: 'serif', textAlign: 'center' }, lessonTitleCentered: { flex: 1, textAlign: 'center', marginTop: 0, fontSize: 14, fontWeight: '600' }, link: { color: c.accent, fontSize: 13, fontWeight: '600' },
  hero: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 18, padding: 22, marginBottom: 4 }, kicker: { color: c.accent, fontSize: 9, letterSpacing: 2, fontWeight: '700' }, heroTitle: { color: c.text, fontSize: 25, fontFamily: 'serif', marginTop: 10 }, subtitle: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 7 }, progress: { color: c.muted, fontSize: 11, marginTop: 16 },
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 15, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.6 }, number: { width: 39, height: 39, borderRadius: 13, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', backgroundColor: c.field, color: c.muted, fontWeight: '700', fontSize: 13, paddingTop: 11 }, unlocked: { color: c.green, fontWeight: '700', fontSize: 10 }, lessonDetails: { flex: 1, gap: 5 }, eyebrow: { color: c.muted, fontSize: 8, letterSpacing: 1.2 }, title: { color: c.text, fontWeight: '600', fontSize: 13, lineHeight: 18, marginTop: 2 },
  actionPill: { alignSelf: 'flex-start', minHeight: 29, marginTop: 2, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10 }, actionOpen: { backgroundColor: c.accent }, actionLocked: { backgroundColor: c.field }, actionOpenText: { color: '#fff', fontWeight: '700', fontSize: 10 }, actionLockedText: { color: c.accent, fontWeight: '700', fontSize: 10 }, actionIcon: { width: 12, height: 12 }, actionIconOpen: { tintColor: '#fff' }, lockIcon: { width: 16, height: 16 },
  paywall: { backgroundColor: c.paywall, borderRadius: 18, borderWidth: 1, borderColor: c.paywallBorder, padding: 18, marginTop: 6 }, restore: { color: c.muted, fontSize: 12, marginTop: 14 }, error: { backgroundColor: c.paywall, color: c.danger, padding: 12, borderRadius: 10 },
  lessonBody: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 22 }, bodyText: { color: c.text, fontSize: 16, lineHeight: 27 }, lockedScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 }, lockedTitle: { color: c.text, fontSize: 26, lineHeight: 32, fontFamily: 'serif', textAlign: 'center' },
}); }

