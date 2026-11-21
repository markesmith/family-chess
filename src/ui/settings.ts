import type { Level } from '../game/coach';
import { storageGet, storageSet } from './dom';

export interface Settings {
  /** The player's own level: controls how the coach explains things. */
  level: Level;
  /** Default computer strength key (see LEVELS). */
  opponent: string;
}

const KEY = 'fc.settings.v1';

export function getSettings(): Settings {
  return { level: 'beginner', opponent: 'beginner', ...storageGet<Partial<Settings>>(KEY, {}) };
}

export function saveSettings(s: Partial<Settings>) {
  storageSet(KEY, { ...getSettings(), ...s });
}

const PROGRESS = 'fc.progress.v1';

export function completedLessons(): Set<string> {
  return new Set(storageGet<string[]>(PROGRESS, []));
}

export function markLessonDone(id: string) {
  const s = completedLessons();
  s.add(id);
  storageSet(PROGRESS, [...s]);
}
