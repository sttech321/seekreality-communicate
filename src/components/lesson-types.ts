export type LessonSummary = {
  slug: string;
  eyebrow?: string;
  title: string;
  position: number;
  is_free: boolean;
  is_unlocked: boolean;
};

export type LessonContent = LessonSummary & {
  body?: unknown;
  media?: { type?: string; label?: string; src?: string } | null;
  reflection?: string | null;
  bridge?: string | null;
  discussion?: string[] | null;
};

export type LessonsScreenProps = {
  token: string;
  onLogout: () => void;
};
