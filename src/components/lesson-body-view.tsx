import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { createContext, useContext, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/lib/app-theme';
import type { LessonContent } from './lesson-types';
import { JournalPrompt } from './journal-prompt';

type Block = Record<string, any>;
type AudioContextValue = { player: ReturnType<typeof useAudioPlayer>; status: ReturnType<typeof useAudioPlayerStatus>; activeSrc: string; setActiveSrc: (src: string) => void };
const AudioContext = createContext<AudioContextValue | null>(null);

function asBlocks(body: unknown): Block[] {
  if (Array.isArray(body)) return body.filter((item): item is Block => !!item && typeof item === 'object' && !Array.isArray(item));
  if (typeof body === 'string') {
    try { return asBlocks(JSON.parse(body)); } catch { return body.trim() ? [{ p: body }] : []; }
  }
  return body && typeof body === 'object' ? [body as Block] : [];
}

export function LessonBodyView({ lesson }: { lesson: LessonContent }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [activeSrc, setActiveSrc] = useState('');
  const blocks = asBlocks(lesson.body);
  const discussion = Array.isArray(lesson.discussion) ? lesson.discussion.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  const topMedia = lesson.media && typeof lesson.media.src === 'string' ? lesson.media : null;
  const hasTopMediaInBody = topMedia && blocks.some((block) => block.media?.src === topMedia.src);

  return <AudioContext.Provider value={{ player, status, activeSrc, setActiveSrc }}><ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
    {topMedia && !hasTopMediaInBody && <MediaBlock media={topMedia} styles={styles} />}
    {blocks.map((block, index) => <BlockView key={`${index}-${Object.keys(block)[0] || 'block'}`} block={block} styles={styles} />)}
    {!!lesson.reflection?.trim() && <JournalPrompt lesson={lesson} />}
    {!!lesson.bridge?.trim() && <Text style={styles.bridge}>{lesson.bridge}</Text>}
    {discussion.length > 0 && <View style={styles.discussionCard}>
      <Text style={styles.discussionTitle}>Questions and Topics for Group Discussion</Text>
      {discussion.map((question, index) => <View key={`${index}-${question.slice(0, 24)}`} style={styles.questionRow}>
        <Text style={styles.questionNumber}>{index + 1}.</Text>
        <Text style={styles.questionText}>{question}</Text>
      </View>)}
    </View>}
    {blocks.length === 0 && !topMedia && <Text style={styles.paragraph}>This lesson does not have any content yet.</Text>}
  </ScrollView></AudioContext.Provider>;
}

function BlockView({ block, styles }: { block: Block; styles: ReturnType<typeof makeStyles> }) {
  if (block.media && typeof block.media === 'object') return <MediaBlock media={block.media} styles={styles} />;
  if (typeof block.image === 'string') return <View style={[styles.imageBlock, block.float || block.floatRight ? styles.imageFloating : null, block.small ? styles.imageSmall : null]}>
    <Image source={{ uri: block.image }} contentFit="contain" style={styles.image} />
    {typeof block.caption === 'string' && <Text style={styles.caption}>{block.caption}</Text>}
  </View>;
  if (Array.isArray(block.dialogue)) return <View style={styles.dialogue}>{block.dialogue.map((line: any, index: number) => {
    const speaker = typeof line === 'object' && line ? line.speaker : '';
    const text = typeof line === 'string' ? line : line?.line ?? line?.text ?? '';
    return <Text key={index} style={styles.dialogueLine}>{speaker ? <Text style={styles.speaker}>{speaker}: </Text> : null}{String(text)}</Text>;
  })}</View>;
  if (block.divider) return <View style={styles.divider} />;
  for (const key of ['heading', 'subcase', 'quote', 'p', 'paragraph', 'text', 'small']) {
    if (typeof block[key] !== 'string' || !block[key].trim()) continue;
    const style = key === 'heading' ? styles.heading : key === 'subcase' ? styles.subcase : key === 'quote' ? styles.quote : key === 'small' ? styles.small : styles.paragraph;
    return <Text style={style}>{block[key]}</Text>;
  }
  return null;
}

function MediaBlock({ media, styles }: { media: { type?: string; label?: string; src?: string }; styles: ReturnType<typeof makeStyles> }) {
  const audio = useContext(AudioContext);
  if (!media.src) return null;
  const label = media.label || (media.type === 'video' ? 'Video' : 'Audio');

  if (media.type === 'video') return <VideoMediaBlock src={media.src} label={label} styles={styles} />;

  if (!audio) return null;
  const { player, status, activeSrc, setActiveSrc } = audio;
  const isCurrent = activeSrc === media.src;
  const isPlaying = isCurrent && status.playing;
  const toggle = async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'doNotMix' });
      if (isCurrent) {
        if (status.playing) player.pause(); else player.play();
      } else {
        setActiveSrc(media.src!);
        player.replace({ uri: media.src! });
        player.play();
      }
    } catch { /* Keep the inline control responsive if the platform cannot start playback. */ }
  };
  const duration = isCurrent && Number.isFinite(status.duration) ? status.duration : 0;
  const currentTime = isCurrent && Number.isFinite(status.currentTime) ? status.currentTime : 0;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  return <View style={styles.audioCard}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${isPlaying ? 'Pause' : 'Play'} ${label}`} onPress={() => void toggle()} style={styles.audioPlay}><Text style={styles.audioPlayText}>{isPlaying ? 'Ⅱ' : '▶'}</Text></Pressable>
    <View style={styles.mediaCopy}><Text style={styles.mediaTitle}>{label}</Text><View style={styles.track}><View style={[styles.trackFill, { width: `${isCurrent ? progress * 100 : 0}%` }]} /></View><Text style={styles.mediaHint}>{isCurrent && status.isBuffering ? 'Loading audio…' : isPlaying ? 'Playing' : 'Tap to play'}</Text></View>
  </View>;
}

function VideoMediaBlock({ src, label, styles }: { src: string; label: string; styles: ReturnType<typeof makeStyles> }) {
  const player = useVideoPlayer(src, (videoPlayer) => { videoPlayer.loop = false; });
  return <View style={styles.videoContainer}>
    <Text style={styles.mediaTitle}>{label}</Text>
    <VideoView player={player} nativeControls contentFit="contain" style={styles.videoPlayer} />
  </View>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>['colors']) { return StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.background }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 44, gap: 17 },
  paragraph: { color: c.text, fontSize: 16, lineHeight: 27 }, heading: { color: c.text, fontSize: 23, lineHeight: 30, fontFamily: 'serif', marginTop: 12 }, subcase: { color: c.accent, fontSize: 18, lineHeight: 25, fontWeight: '700', marginTop: 8 }, quote: { color: c.text, fontSize: 17, lineHeight: 27, fontFamily: 'serif', fontStyle: 'italic', borderLeftWidth: 3, borderColor: c.accent, paddingLeft: 16, paddingVertical: 3 }, small: { color: c.muted, fontSize: 12, lineHeight: 19 },
  bridge: { color: c.muted, fontFamily: 'serif', fontSize: 16, lineHeight: 27, fontStyle: 'italic' },
  discussionCard: { backgroundColor: c.paywall, borderWidth: 1, borderColor: c.paywallBorder, padding: 18, gap: 16 }, discussionTitle: { color: c.text, fontFamily: 'serif', fontSize: 22, lineHeight: 29, fontWeight: '700', marginBottom: 2 }, questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, questionNumber: { color: c.accent, fontSize: 15, lineHeight: 24, fontWeight: '700', minWidth: 18 }, questionText: { color: c.text, flex: 1, fontSize: 15, lineHeight: 24 },
  divider: { height: 1, backgroundColor: c.border, width: '100%', marginVertical: 7 }, imageBlock: { width: '100%', alignItems: 'center', gap: 8, marginVertical: 3 }, imageFloating: { maxWidth: 390, alignSelf: 'center' }, imageSmall: { maxWidth: 240 }, image: { width: '100%', height: 230, borderRadius: 12, backgroundColor: c.surface }, caption: { color: c.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, dialogue: { gap: 10, padding: 16, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border }, dialogueLine: { color: c.text, fontSize: 15, lineHeight: 24 }, speaker: { color: c.accent, fontWeight: '700' },
  audioCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border }, videoContainer: { width: '100%', gap: 9, padding: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border }, videoPlayer: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: '#111' }, audioPlay: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent }, audioPlayText: { color: '#fff', fontSize: 17, fontWeight: '700' }, mediaCopy: { flex: 1, gap: 5 }, mediaTitle: { color: c.text, fontSize: 14, fontWeight: '700' }, mediaHint: { color: c.muted, fontSize: 11 }, track: { height: 4, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' }, trackFill: { height: '100%', borderRadius: 2, backgroundColor: c.accent },
}); }
