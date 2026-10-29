import { AccountMenu } from '@/components/account-menu';
import { ExpandableLessonTitle } from '@/components/expandable-lesson-title';
import { LessonBodyView } from '@/components/lesson-body-view';
import { LessonBottomNav } from '@/components/lesson-bottom-nav';
import { LessonPaymentDialog } from '@/components/lesson-payment-dialog';
import { COMMUNICATE_API_URL } from '@/lib/api';
import { useAppTheme, type AppColors } from '@/lib/app-theme';
import { ErrorCode, getAvailablePurchases as getStorePurchases, restorePurchases as restoreStorePurchases, useIAP, type Product, type Purchase } from 'expo-iap';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LessonContent, LessonSummary, LessonsScreenProps } from './lesson-types';
import WebLessonsScreen from './lessons-screen.web';

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstError = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
    throw new Error(typeof firstError === 'string' ? firstError : data?.message || 'The request could not be completed.');
  }
  return data;
}

const hasNativeIapModule = Platform.OS !== 'web' && Boolean(requireOptionalNativeModule('ExpoIap'));

export default function LessonsScreen(props: LessonsScreenProps) {
  if (Platform.OS === 'web') return <WebLessonsScreen {...props} />;
  if (!hasNativeIapModule) return <IapUnavailableScreen {...props} />;
  return <LessonsScreenWithIap {...props} />;
}

function IapUnavailableScreen({ token, onLogout }: LessonsScreenProps) {
  const { colors: c } = useAppTheme();
  const styles = createStyles(c);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [selected, setSelected] = useState<LessonContent | null>(null);
  const [lockedLesson, setLockedLesson] = useState<LessonSummary | null>(null);
  const [paymentLesson, setPaymentLesson] = useState<LessonSummary | null>(null);
  const [loadingDirection, setLoadingDirection] = useState<'previous' | 'next' | null>(null);
  const [openingLesson, setOpeningLesson] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${COMMUNICATE_API_URL}/lessons`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
      .then(readJson)
      .then((data) => setLessons(data.data || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load lessons.'));
  }, [token]);

  const openLesson = async (lesson: LessonSummary) => {
    if (!lesson.is_unlocked) {
      setPaymentLesson(lesson);
      setError('');
      return;
    }
    setOpeningLesson(lesson.slug);
    try {
      const response = await fetch(`${COMMUNICATE_API_URL}/lessons/${encodeURIComponent(lesson.slug)}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await readJson(response);
      setSelected(data.data);
      setLockedLesson(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this lesson.');
    } finally {
      setOpeningLesson(null);
    }
  };

  const fallbackCurrent = selected || lockedLesson;
  const fallbackIndex = fallbackCurrent ? lessons.findIndex((lesson) => lesson.slug === fallbackCurrent.slug) : -1;
  const fallbackHome = () => { setSelected(null); setLockedLesson(null); };
  const fallbackNavigate = async (index: number, direction: 'previous' | 'next') => {
    const lesson = lessons[index];
    if (!lesson) return;
    if (!lesson.is_unlocked) { setPaymentLesson(lesson); return; }
    setLoadingDirection(direction);
    try { await openLesson(lesson); } finally { setLoadingDirection(null); }
  };

  if (fallbackCurrent) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.lessonHeader}>
        <ExpandableLessonTitle title={fallbackCurrent.title} />
      </View>
      {selected ? <LessonBodyView key={selected.slug} lesson={selected} /> : <View style={styles.lockedScreen}>
        <Text style={styles.lockedKicker}>LESSON {String(lockedLesson?.position || '').padStart(2, '0')} Â· FULL COURSE</Text>
        <Text style={styles.lockedTitle}>Continue with the complete course</Text>
        <Text style={styles.heroSubtitle}>This lesson is included with your one-time course unlock. Your free lesson stays available.</Text>
        <View style={styles.iapUnavailable}><Text style={styles.paywallTitle}>Purchases need the installed app</Text><Text style={styles.heroSubtitle}>Install the Seek Reality app build to unlock the complete course.</Text></View>
      </View>}
      <LessonBottomNav onPrevious={() => void fallbackNavigate(fallbackIndex - 1, 'previous')} onHome={fallbackHome} onNext={() => void fallbackNavigate(fallbackIndex + 1, 'next')} canPrevious={fallbackIndex > 0} canNext={fallbackIndex >= 0 && fallbackIndex < lessons.length - 1} loading={loadingDirection} />
      <LessonPaymentDialog visible={!!paymentLesson} lessonTitle={paymentLesson?.title} onClose={() => setPaymentLesson(null)} message="Purchases need the installed Seek Reality app. Install the app to unlock the complete course." />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.brandBlock}><Image accessibilityLabel="Seek Reality" source={require('@/assets/images/arei_logo.png')} resizeMode="contain" style={styles.brandLogo} /></View>
        <Text pointerEvents="none" style={styles.topTitle}>All lessons</Text>
        <AccountMenu token={token} onLogout={onLogout} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {lessons.map((lesson) => (
          <Pressable key={lesson.slug} disabled={openingLesson !== null} onPress={() => void openLesson(lesson)} style={[styles.lessonRow, openingLesson !== null && styles.disabled]}>
            <View style={[styles.numberBadge, lesson.is_unlocked && styles.numberBadgeOpen]}>
              <Text style={[styles.numberText, lesson.is_unlocked && styles.numberTextOpen]}>{String(lesson.position).padStart(2, '0')}</Text>
            </View>
            <View style={styles.lessonDetails}>
              <Text style={styles.lessonEyebrow}>{lesson.eyebrow || `LESSON ${lesson.position}`}</Text>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <View style={[styles.actionPill, lesson.is_unlocked ? styles.actionPillOpen : styles.actionPillLocked]}>
                {openingLesson === lesson.slug ? <><ActivityIndicator size="small" color="#fff" /><Text style={styles.actionPillTextOpen}>Opening…</Text></> : <><Text style={lesson.is_unlocked ? styles.actionPillTextOpen : styles.actionPillTextLocked}>{lesson.is_unlocked ? 'Read lesson' : 'Unlock lesson'}</Text><Image source={lesson.is_unlocked ? require('@/assets/images/open-unlock-arrow.png') : require('@/assets/images/unlock.png')} resizeMode="contain" style={lesson.is_unlocked ? [styles.actionIcon, styles.actionIconOpen] : styles.lockIcon} /></>}
              </View>
            </View>
          </Pressable>
        ))}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.paywall}>
          <Text style={styles.paywallTitle}>Store purchases need the app build</Text>
          <Text style={styles.heroSubtitle}>You can view unlocked lessons here. Install a development build of Seek Reality to purchase or restore the full course.</Text>
        </View>
      </ScrollView>
      <LessonPaymentDialog visible={!!paymentLesson} lessonTitle={paymentLesson?.title} onClose={() => setPaymentLesson(null)} message="Purchases need the installed Seek Reality app. Install the app to unlock the complete course." />
    </SafeAreaView>
  );
}

function LessonsScreenWithIap({ token, onLogout }: LessonsScreenProps) {
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
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const productId = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID || 'product-id'
    : process.env.EXPO_PUBLIC_GOOGLE_PRODUCT_ID || 'product-id';
  const finishTransactionRef = useRef<((args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>) | null>(null);

  const loadLessons = useCallback(async () => {
    const response = await fetch(`${COMMUNICATE_API_URL}/lessons`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const data = await readJson(response);
    setLessons(data.data || []);
    setCourseAccess(Boolean(data.course_access));
  }, [token]);

  const handlePurchase = useCallback(async (purchase: Purchase) => {
    if (purchase.purchaseState !== 'purchased') {
      setWorking(false);
      if (purchase.purchaseState === 'pending') setNotice('Your purchase is pending approval from the app store.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const store = purchase.store === 'apple' ? 'apple' : purchase.store === 'google' ? 'google' : null;
      if (!store) throw new Error('This purchase came from an unsupported store.');
      const body = store === 'apple'
        ? { store, transaction_id: purchase.transactionId || purchase.id }
        : { store, purchase_token: purchase.purchaseToken || '' };
      const response = await fetch(`${COMMUNICATE_API_URL}/purchases/verify`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await readJson(response);
      await finishTransactionRef.current?.({ purchase, isConsumable: false });
      await loadLessons();
      setPaymentLesson(null);
      setNotice(data.message || 'Purchase verified. All 5 lessons are now unlocked.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not verify your purchase. Try again.');
    } finally {
      setWorking(false);
    }
  }, [loadLessons, token]);

  const onPurchaseSuccess = useCallback((purchase: Purchase) => {
    void handlePurchase(purchase);
  }, [handlePurchase]);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess,
    onPurchaseError: (purchaseError) => {
      setWorking(false);
      if (purchaseError.code !== ErrorCode.UserCancelled) setError(purchaseError.message || 'Purchase failed. Please try again.');
    },
    onError: (iapError) => setError(iapError.message || 'The app store is unavailable right now.'),
  });
  finishTransactionRef.current = finishTransaction;

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadLessons().catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Could not load lessons.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadLessons]);

  useEffect(() => {
    if (!connected || !productId || productId === 'product-id') return;
    void fetchProducts({ skus: [productId], type: 'in-app' }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not load the course price.');
    });
  }, [connected, fetchProducts, productId]);

  const product = products.find((item: Product) => item.id === productId);
  const restore = async () => {
    setError('');
    setNotice('');
    setWorking(true);
    try {
      await restoreStorePurchases();
      const purchases = await getStorePurchases({ onlyIncludeActiveItemsIOS: false });
      const coursePurchases = purchases.filter((purchase) => purchase.productId === productId);
      if (!coursePurchases.length) {
        setNotice('No purchases were found for this store account.');
      } else {
        for (const purchase of coursePurchases) await handlePurchase(purchase);
        await loadLessons();
        setNotice('Your purchase status has been restored.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore purchases.');
    } finally {
      setWorking(false);
    }
  };

  const buy = async () => {
    setError('');
    setNotice('');
    if (!productId || productId === 'product-id') {
      setError(`Set the EXPO_PUBLIC_${Platform.OS === 'ios' ? 'APPLE' : 'GOOGLE'}_PRODUCT_ID to your active one-time product ID.`);
      return;
    }
    if (!connected || !product) {
      setError('The course is not available in the app store yet. Check the product ID and store setup.');
      return;
    }
    try {
      setWorking(true);
      await requestPurchase({
        request: Platform.OS === 'ios'
          ? { apple: { sku: productId } }
          : { google: { skus: [productId] } },
        type: 'in-app',
      });
    } catch (e) {
      setWorking(false);
      setError(e instanceof Error ? e.message : 'Could not start the purchase.');
    }
  };

  const openLesson = async (lesson: LessonSummary) => {
    if (!lesson.is_unlocked) {
      setPaymentLesson(lesson);
      setError('');
      setNotice('');
      return;
    }
    setError('');
    setNotice('');
    setOpeningLesson(lesson.slug);
    try {
      const response = await fetch(`${COMMUNICATE_API_URL}/lessons/${encodeURIComponent(lesson.slug)}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await readJson(response);
      setSelected(data.data);
      setLockedLesson(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this lesson.');
    } finally {
      setOpeningLesson(null);
    }
  };

  const currentLesson = selected || lockedLesson;
  const currentIndex = currentLesson ? lessons.findIndex((lesson) => lesson.slug === currentLesson.slug) : -1;
  const navigateLesson = async (index: number, direction: 'previous' | 'next') => {
    const lesson = lessons[index];
    if (!lesson) return;
    if (!lesson.is_unlocked) { setPaymentLesson(lesson); return; }
    setLoadingDirection(direction);
    try { await openLesson(lesson); } finally { setLoadingDirection(null); }
  };

  if (currentLesson) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.lessonHeader}>
        <ExpandableLessonTitle title={currentLesson.title} />
      </View>
      {selected ? <LessonBodyView key={selected.slug} lesson={selected} /> : (
        <View style={styles.lockedScreen}>
          <Text style={styles.lockedKicker}>LESSON {String(lockedLesson?.position || '').padStart(2, '0')} Â· FULL COURSE</Text>
          <Text style={styles.lockedTitle}>Continue with the complete course</Text>
          <Text style={styles.heroSubtitle}>This lesson is included with your one-time course unlock. Your free lesson stays available.</Text>
          <Pressable onPress={() => void buy()} disabled={working} style={({ pressed }) => [styles.buyButton, pressed && styles.pressed, working && styles.disabled]}>
            {working ? <ActivityIndicator color={c.background} /> : <Text style={styles.buyText}>{product?.displayPrice ? `Unlock all lessons Â· ${product.displayPrice}` : 'Unlock all 5 lessons'}</Text>}
          </Pressable>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}
        </View>
      )}
      <LessonBottomNav onPrevious={() => void navigateLesson(currentIndex - 1, 'previous')} onHome={() => { setSelected(null); setLockedLesson(null); }} onNext={() => void navigateLesson(currentIndex + 1, 'next')} canPrevious={currentIndex > 0} canNext={currentIndex >= 0 && currentIndex < lessons.length - 1} loading={loadingDirection} />
      <LessonPaymentDialog visible={!!paymentLesson} lessonTitle={paymentLesson?.title} onClose={() => { setPaymentLesson(null); setError(''); }} onPurchase={() => void buy()} purchaseLabel={product?.displayPrice ? `Unlock all lessons · ${product.displayPrice}` : 'Unlock all 5 lessons'} working={working} message={error} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.brandBlock}><Image accessibilityLabel="AERI" source={require('@/assets/images/arei_logo.png')} resizeMode="contain" style={styles.brandLogo} /></View>
        <Text pointerEvents="none" style={styles.topTitle}>All lessons</Text>
        <AccountMenu token={token} onLogout={onLogout} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>COMMUNICATE WITH YOUR LOVED ONES</Text>
          <Text style={styles.heroTitle}>Continue your journey</Text>
          <Text style={styles.heroSubtitle}>Start with the free introduction, then unlock the four guided stages.</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${lessons.length ? Math.round((lessons.filter((l) => l.is_unlocked).length / lessons.length) * 100) : 0}%` }]} /></View>
          <Text style={styles.progressText}>{lessons.filter((l) => l.is_unlocked).length} of {lessons.length || 5} lessons available</Text>
        </View>

        {loading ? <ActivityIndicator color={c.accent} style={styles.loader} /> : lessons.map((lesson) => (
          <Pressable key={lesson.slug} disabled={openingLesson !== null} onPress={() => void openLesson(lesson)} style={({ pressed }) => [styles.lessonRow, pressed && styles.pressed, openingLesson !== null && styles.disabled]}>
            <View style={[styles.numberBadge, lesson.is_unlocked && styles.numberBadgeOpen]}>
              <Text style={[styles.numberText, lesson.is_unlocked && styles.numberTextOpen]}>{String(lesson.position).padStart(2, '0')}</Text>
            </View>
            <View style={styles.lessonDetails}>
              <Text style={styles.lessonEyebrow}>{lesson.eyebrow || `LESSON ${lesson.position}`}</Text>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <View style={[styles.actionPill, lesson.is_unlocked ? styles.actionPillOpen : styles.actionPillLocked]}>
                {openingLesson === lesson.slug ? <><ActivityIndicator size="small" color="#fff" /><Text style={styles.actionPillTextOpen}>Opening…</Text></> : <><Text style={lesson.is_unlocked ? styles.actionPillTextOpen : styles.actionPillTextLocked}>{lesson.is_unlocked ? 'Read lesson' : 'Unlock lesson'}</Text><Image source={lesson.is_unlocked ? require('@/assets/images/open-unlock-arrow.png') : require('@/assets/images/unlock.png')} resizeMode="contain" style={lesson.is_unlocked ? [styles.actionIcon, styles.actionIconOpen] : styles.lockIcon} /></>}
              </View>
            </View>
          </Pressable>
        ))}

        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        {!courseAccess && <View style={styles.paywall}>
          <View style={styles.paywallCopy}><Text style={styles.paywallTitle}>Unlock all 5 lessons</Text>
            <Text style={styles.paywallSubtitle}>One payment Â· permanent access</Text></View>
          <Pressable onPress={() => void buy()} disabled={working} style={({ pressed }) => [styles.buyButton, pressed && styles.pressed, working && styles.disabled]}>
            {working ? <ActivityIndicator color={c.background} /> : <Text style={styles.buyText}>{product?.displayPrice ? `Unlock Â· ${product.displayPrice}` : 'Unlock full course'}</Text>}
          </Pressable>
          <Pressable onPress={() => void restore()} disabled={working} style={styles.restoreButton}><Text style={styles.link}>Restore previous purchase</Text></Pressable>
          <Text style={styles.storeNote}>Secure one-time purchase through {Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}.</Text>
        </View>}
        {courseAccess && <View style={styles.accessCard}><Text style={styles.openLabel}>FULL COURSE UNLOCKED</Text><Text style={styles.paywallSubtitle}>All lessons are ready when you are.</Text></View>}
      </ScrollView>
      <LessonPaymentDialog visible={!!paymentLesson} lessonTitle={paymentLesson?.title} onClose={() => { setPaymentLesson(null); setError(''); }} onPurchase={() => void buy()} purchaseLabel={product?.displayPrice ? `Unlock all lessons · ${product.displayPrice}` : 'Unlock all 10 lessons'} working={working} message={error} />
      {working && selected === null && <View style={styles.activityOverlay}><ActivityIndicator color={c.accent} /></View>}
    </SafeAreaView>
  );
}

function createStyles(c: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { padding: 20, paddingBottom: 32, gap: 12 },
  topBar: { position: 'relative', minHeight: 72, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.border },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brandLogo: { width: 94, height: 40 }, brandMark: { width: 42, height: 42, borderRadius: 15, backgroundColor: c.access, alignItems: 'center', justifyContent: 'center' }, brandMarkSmall: { width: 30, height: 30, borderRadius: 11, backgroundColor: c.access, alignItems: 'center', justifyContent: 'center' }, brandMarkLetter: { color: c.accent, fontSize: 17, fontWeight: '700', fontFamily: 'serif' },
  brand: { color: c.accent, fontSize: 10, fontWeight: '700', letterSpacing: 2.4 }, topTitle: { position: 'absolute', left: '30%', right: '30%', textAlign: 'center', color: c.text, fontSize: 18, fontFamily: 'serif' },
  link: { color: c.accent, fontSize: 13, fontWeight: '600' }, hero: { padding: 22, marginBottom: 5, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  kicker: { color: c.accent, fontSize: 9, letterSpacing: 2, fontWeight: '700' }, heroTitle: { color: c.text, fontSize: 25, fontFamily: 'serif', marginTop: 10 },
  heroSubtitle: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 7 }, progressTrack: { height: 4, borderRadius: 3, backgroundColor: c.field, marginTop: 19, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: c.accent }, progressText: { color: c.muted, fontSize: 11, marginTop: 8 }, loader: { marginVertical: 36 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', minHeight: 88, padding: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 15, gap: 13 }, pressed: { opacity: 0.8 },
  numberBadge: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.field }, numberBadgeOpen: { backgroundColor: c.access },
  numberText: { color: c.muted, fontSize: 12, fontWeight: '700' }, numberTextOpen: { color: c.green }, lessonDetails: { flex: 1, gap: 5 },
  lessonEyebrow: { color: c.muted, fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase' }, lessonTitle: { color: c.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actionPill: { alignSelf: 'flex-start', minHeight: 29, marginTop: 2, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10 }, actionPillOpen: { backgroundColor: c.accent }, actionPillLocked: { backgroundColor: c.field }, actionPillTextOpen: { color: '#fff', fontWeight: '700', fontSize: 10 }, actionPillTextLocked: { color: c.accent, fontWeight: '700', fontSize: 10 }, actionIcon: { width: 12, height: 12 }, actionIconOpen: { tintColor: '#fff' }, lockIcon: { width: 16, height: 16 },
  openLabel: { color: c.green, fontSize: 9, letterSpacing: 1.1, fontWeight: '700' }, lockLabel: { color: c.muted, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  error: { color: c.danger, fontSize: 13, lineHeight: 19, padding: 12, backgroundColor: c.paywall, borderRadius: 10 }, notice: { color: c.green, fontSize: 13, lineHeight: 19, padding: 12, backgroundColor: c.access, borderRadius: 10 },
  paywall: { padding: 18, gap: 12, borderRadius: 18, backgroundColor: c.paywall, borderWidth: 1, borderColor: c.paywallBorder, marginTop: 5 }, paywallCopy: { gap: 5 }, paywallTitle: { color: c.text, fontSize: 19, fontFamily: 'serif' },
  paywallSubtitle: { color: c.muted, fontSize: 12 }, buyButton: { height: 49, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, paddingHorizontal: 14 }, buyText: { color: c.background, fontSize: 14, fontWeight: '700' }, disabled: { opacity: 0.6 }, restoreButton: { alignSelf: 'center', paddingVertical: 4 }, storeNote: { textAlign: 'center', color: c.subtle, fontSize: 10 },
  accessCard: { padding: 17, borderRadius: 15, backgroundColor: c.access, gap: 7 }, activityOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: c.overlay },
  lessonHeader: { minHeight: 58, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderColor: c.border }, lessonHeaderTitle: { width: '100%', color: c.text, fontSize: 14, fontWeight: '600', textAlign: 'center' }, webview: { flex: 1, backgroundColor: c.background },
  lockedScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 }, lockedKicker: { color: c.accent, letterSpacing: 1.8, fontSize: 10, fontWeight: '700' }, lockedTitle: { color: c.text, fontSize: 26, lineHeight: 32, fontFamily: 'serif', textAlign: 'center' },
  iapUnavailable: { padding: 24, gap: 10, margin: 20, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  bodyScroll: { flex: 1, padding: 18 }, bodyText: { color: c.text, fontSize: 15, lineHeight: 24 },
}); }

