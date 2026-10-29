import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type JournalEntry = {
  lessonSlug: string;
  lessonNumber: number;
  lessonEyebrow?: string;
  lessonTitle: string;
  text: string;
  updatedAt: string;
};

type JournalEntryIndex = Omit<JournalEntry, 'text'> & { chunks: number };

const INDEX_KEY = 'communicate_journal_v1:index';
const ENTRY_KEY = (slug: string) => `communicate_journal_v1:${encodeURIComponent(slug)}`;
const CHUNK_CODE_POINTS = 300;

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function readIndex(): Promise<JournalEntryIndex[]> {
  const value = await readValue(INDEX_KEY);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as JournalEntryIndex[] : [];
  } catch {
    return [];
  }
}

export async function getJournalEntry(slug: string): Promise<JournalEntry | null> {
  const metadata = (await readIndex()).find((entry) => entry.lessonSlug === slug);
  if (!metadata) return null;
  const baseKey = ENTRY_KEY(slug);
  const chunks = await Promise.all(Array.from({ length: metadata.chunks }, (_, index) => readValue(`${baseKey}:${index}`)));
  return {
    lessonSlug: metadata.lessonSlug,
    lessonNumber: metadata.lessonNumber,
    lessonEyebrow: metadata.lessonEyebrow,
    lessonTitle: metadata.lessonTitle,
    updatedAt: metadata.updatedAt,
    text: chunks.map((chunk) => chunk || '').join(''),
  };
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const metadata = await readIndex();
  const entries = await Promise.all(metadata.map((item) => getJournalEntry(item.lessonSlug)));
  return entries.filter((entry): entry is JournalEntry => entry !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const index = await readIndex();
  const previous = index.find((item) => item.lessonSlug === entry.lessonSlug);
  const points = Array.from(entry.text);
  const chunks: string[] = [];
  for (let offset = 0; offset < points.length; offset += CHUNK_CODE_POINTS) {
    chunks.push(points.slice(offset, offset + CHUNK_CODE_POINTS).join(''));
  }

  const baseKey = ENTRY_KEY(entry.lessonSlug);
  await Promise.all(chunks.map((chunk, chunkIndex) => writeValue(`${baseKey}:${chunkIndex}`, chunk)));
  for (let chunkIndex = chunks.length; chunkIndex < (previous?.chunks || 0); chunkIndex += 1) {
    await deleteValue(`${baseKey}:${chunkIndex}`);
  }

  const updated: JournalEntryIndex = {
    lessonSlug: entry.lessonSlug,
    lessonNumber: entry.lessonNumber,
    lessonEyebrow: entry.lessonEyebrow,
    lessonTitle: entry.lessonTitle,
    updatedAt: entry.updatedAt,
    chunks: chunks.length,
  };
  await writeValue(INDEX_KEY, JSON.stringify([updated, ...index.filter((item) => item.lessonSlug !== entry.lessonSlug)]));
}
