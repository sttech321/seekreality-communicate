import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';

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
const INDEX_V2_KEY = 'communicate_journal_v1:index:v2';
const INDEX_CHUNK_CODE_POINTS = 300;
const ENTRY_KEY = (slug: string) => `communicate_journal_v1:${encodeURIComponent(slug)}`;
const CHUNK_CODE_POINTS = 300;
let fallbackWrites = Promise.resolve();

function getFallbackFile() {
  return new File(Paths.document, 'communicate-journal-fallback.json');
}

async function readFallbackStore(): Promise<Record<string, string | null>> {
  const fallbackFile = getFallbackFile();
  if (!fallbackFile.exists) return {};
  try {
    return JSON.parse(await fallbackFile.text()) as Record<string, string | null>;
  } catch {
    return {};
  }
}

async function updateFallbackStore(key: string, value: string | null | undefined): Promise<void> {
  const update = fallbackWrites.then(async () => {
    const fallbackFile = getFallbackFile();
    const store = await readFallbackStore();
    if (value === undefined && !Object.prototype.hasOwnProperty.call(store, key)) return;
    if (value === undefined) delete store[key];
    else store[key] = value;
    if (!fallbackFile.exists) fallbackFile.create();
    await fallbackFile.write(JSON.stringify(store));
  });
  fallbackWrites = update.catch(() => {});
  await update;
}

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  const fallback = await readFallbackStore();
  if (Object.prototype.hasOwnProperty.call(fallback, key)) return fallback[key];
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
    await updateFallbackStore(key, undefined).catch(() => {});
  } catch {
    await updateFallbackStore(key, value);
  }
}

async function deleteValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
    await updateFallbackStore(key, undefined).catch(() => {});
  } catch {
    await updateFallbackStore(key, null);
  }
}

async function readIndex(): Promise<JournalEntryIndex[]> {
  const countValue = await readValue(INDEX_V2_KEY);
  let value: string | null = null;
  if (countValue) {
    const count = Number(countValue);
    if (!Number.isInteger(count) || count < 0) return [];
    const chunks = await Promise.all(Array.from({ length: count }, (_, index) => readValue(`${INDEX_V2_KEY}:${index}`)));
    value = chunks.map((chunk) => chunk || '').join('');
  } else {
    value = await readValue(INDEX_KEY);
  }
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
  const serializedIndex = JSON.stringify([updated, ...index.filter((item) => item.lessonSlug !== entry.lessonSlug)]);
  const indexPoints = Array.from(serializedIndex);
  const indexChunks: string[] = [];
  for (let offset = 0; offset < indexPoints.length; offset += INDEX_CHUNK_CODE_POINTS) {
    indexChunks.push(indexPoints.slice(offset, offset + INDEX_CHUNK_CODE_POINTS).join(''));
  }
  const previousCount = Number(await readValue(INDEX_V2_KEY) || 0);
  await Promise.all(indexChunks.map((chunk, chunkIndex) => writeValue(`${INDEX_V2_KEY}:${chunkIndex}`, chunk)));
  for (let chunkIndex = indexChunks.length; chunkIndex < previousCount; chunkIndex += 1) {
    await deleteValue(`${INDEX_V2_KEY}:${chunkIndex}`);
  }
  await writeValue(INDEX_V2_KEY, String(indexChunks.length));
  await deleteValue(INDEX_KEY);
}
