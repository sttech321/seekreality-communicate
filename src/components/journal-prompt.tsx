import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllJournalEntries, getJournalEntry, saveJournalEntry, type JournalEntry } from '@/lib/journal-storage';
import { useAppTheme } from '@/lib/app-theme';
import type { LessonContent } from './lesson-types';

export function JournalPrompt({ lesson }: { lesson: LessonContent }) {
  const { colors: c } = useAppTheme();
  const styles = makeStyles(c);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getJournalEntry(lesson.slug), getAllJournalEntries()])
      .then(([saved, savedEntries]) => {
        if (!active) return;
        setEntry(saved);
        setEntries(savedEntries);
        setDraft(saved?.text || '');
      })
      .catch(() => { if (active) setError('Your journal entry could not be loaded from this device.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lesson.slug]);

  const openEntries = async () => {
    setError('');
    try {
      setEntries(await getAllJournalEntries());
      setShowEntries(true);
    } catch {
      setError('Your journal entries could not be loaded from this device.');
    }
  };

  const save = async () => {
    const text = draft.trim();
    if (!text) {
      setError('Write something in your journal before saving.');
      return;
    }
    setSaving(true);
    setError('');
    const saved: JournalEntry = {
      lessonSlug: lesson.slug,
      lessonNumber: lesson.position,
      lessonEyebrow: lesson.eyebrow,
      lessonTitle: lesson.title,
      text: draft,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveJournalEntry(saved);
      setEntry(saved);
      setEditing(false);
      setEntries(await getAllJournalEntries());
    } catch {
      setError('Your entry could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <View style={styles.card}>
    <Text style={styles.kicker}>JOURNAL PROMPT</Text>
    {!!lesson.reflection?.trim() && <Text style={styles.prompt}>{lesson.reflection}</Text>}

    {!editing && <Pressable accessibilityRole="button" onPress={() => { setDraft(entry?.text || ''); setEditing(true); setError(''); }} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
      <Text style={styles.actionText}>{entry ? 'Edit your entry' : 'Write in your journal'}</Text>
    </Pressable>}

    {loading && <ActivityIndicator color={c.accent} style={styles.loader} />}
    {editing && <>
      <TextInput
        accessibilityLabel="Journal entry"
        multiline
        textAlignVertical="top"
        value={draft}
        onChangeText={setDraft}
        placeholder="Write your thoughts here…"
        placeholderTextColor={c.muted}
        style={styles.input}
      />
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabled]}>
        <Text style={styles.saveText}>{saving ? 'Saving…' : entry ? 'Save changes' : 'Save entry'}</Text>
      </Pressable>
    </>}

    {!!entry && !editing && <Text style={styles.saved}>✓ Saved · {formatDate(entry.updatedAt)}</Text>}
    {entries.length > 0 && <Pressable accessibilityRole="button" onPress={() => void openEntries()} style={styles.entriesLink}>
      <Text style={styles.entriesLinkText}>View all journal entries →</Text>
    </Pressable>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

    <Modal visible={showEntries} animationType="slide" onRequestClose={() => setShowEntries(false)} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Your journal entries</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close journal entries" onPress={() => setShowEntries(false)} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.entryList}>
          {entries.length === 0 && <Text style={styles.emptyText}>Your saved entries will appear here.</Text>}
          {entries.map((saved) => <View key={saved.lessonSlug} style={styles.entryCard}>
            <View style={styles.entryMeta}>
              <Text style={styles.entryLesson}>{saved.lessonEyebrow || (saved.lessonNumber === 1 ? 'INTRODUCTION' : 'LESSON')} · {String(saved.lessonNumber).padStart(2, '0')}</Text>
              <Text style={styles.entryDate}>{formatDate(saved.updatedAt)}</Text>
            </View>
            <Text style={styles.entryTitle}>{saved.lessonTitle}</Text>
            <Text selectable style={styles.entryText}>{saved.text}</Text>
          </View>)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </View>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function makeStyles(c: ReturnType<typeof useAppTheme>['colors']) { return StyleSheet.create({
  card: { width: '100%', gap: 14, padding: 19, borderRadius: 8, borderWidth: 1, borderColor: c.paywallBorder, backgroundColor: c.paywall },
  kicker: { color: c.accent, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  prompt: { color: c.text, fontFamily: 'serif', fontSize: 17, lineHeight: 27, fontStyle: 'italic' },
  actionButton: { alignSelf: 'flex-start', minHeight: 43, justifyContent: 'center', paddingHorizontal: 17, borderRadius: 5, backgroundColor: '#ee984c' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.6 }, loader: { alignSelf: 'flex-start' },
  input: { minHeight: 145, width: '100%', padding: 14, borderWidth: 1, borderColor: c.paywallBorder, borderRadius: 7, backgroundColor: c.surface, color: c.text, fontSize: 14, lineHeight: 21 },
  saveButton: { alignSelf: 'flex-start', minHeight: 42, minWidth: 98, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, borderRadius: 5, backgroundColor: '#1d2a48' },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700' }, saved: { color: c.green, fontSize: 12 },
  entriesLink: { alignSelf: 'flex-start' }, entriesLinkText: { color: '#d96f24', fontSize: 13, textDecorationLine: 'underline' },
  error: { color: c.danger, fontSize: 13, lineHeight: 19 },
  modalSafe: { flex: 1, backgroundColor: c.background }, modalHeader: { minHeight: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.border },
  modalTitle: { color: c.text, fontFamily: 'serif', fontSize: 21 }, closeButton: { paddingVertical: 8, paddingHorizontal: 12 }, closeText: { color: c.accent, fontSize: 14, fontWeight: '700' },
  entryList: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 12 }, entryCard: { padding: 16, gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, entryLesson: { color: c.accent, fontSize: 10, letterSpacing: 1.2, fontWeight: '700' }, entryDate: { color: c.muted, fontSize: 11 }, entryTitle: { color: c.text, fontSize: 14, fontWeight: '700' }, entryText: { color: c.text, fontSize: 14, lineHeight: 21 }, emptyText: { color: c.muted, fontSize: 14 },
}); }
