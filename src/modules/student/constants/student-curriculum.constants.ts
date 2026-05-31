/** Four skills per level (e.g. English level 1). */
export const STUDENT_SKILLS = [
  'listening',
  'speaking',
  'reading',
  'writing',
] as const;

export type StudentSkill = (typeof STUDENT_SKILLS)[number];

export type LevelStatus = 'completed' | 'unlocked' | 'locked';

export const DEFAULT_STUDENT_SUBJECTS = [
  'English',
  'Urdu',
  'Math',
  'Science',
  'Computer',
] as const;

/** One game per skill per level (level-map node). */
export const GAMES_PER_SKILL = 1;

/** All subjects expose 5 levels in dashboard progress. */
export const LEVELS_PER_SUBJECT = 5;

/** Level 5 stays locked until backend explicitly unlocks it later. */
export const MAX_AUTO_UNLOCK_LEVEL = 4;

export type CurriculumSubjectConfig = {
  subject: string;
  level_count: number;
  skills: readonly StudentSkill[];
  games_per_skill: number;
};

export const SUBJECT_CURRICULUM: CurriculumSubjectConfig[] = [
  {
    subject: 'English',
    level_count: LEVELS_PER_SUBJECT,
    skills: STUDENT_SKILLS,
    games_per_skill: GAMES_PER_SKILL,
  },
  {
    subject: 'Urdu',
    level_count: LEVELS_PER_SUBJECT,
    skills: STUDENT_SKILLS,
    games_per_skill: GAMES_PER_SKILL,
  },
  {
    subject: 'Math',
    level_count: LEVELS_PER_SUBJECT,
    skills: STUDENT_SKILLS,
    games_per_skill: GAMES_PER_SKILL,
  },
  {
    subject: 'Science',
    level_count: LEVELS_PER_SUBJECT,
    skills: STUDENT_SKILLS,
    games_per_skill: GAMES_PER_SKILL,
  },
  {
    subject: 'Computer',
    level_count: LEVELS_PER_SUBJECT,
    skills: STUDENT_SKILLS,
    games_per_skill: GAMES_PER_SKILL,
  },
];

const SUBJECT_ALIASES: Record<string, string> = {
  maths: 'Math',
  math: 'Math',
};

export function normalizeSubject(raw: string): string {
  const trimmed = raw.trim();
  const key = trimmed.toLowerCase();
  const alias = SUBJECT_ALIASES[key];
  if (alias) return alias;

  const found = SUBJECT_CURRICULUM.find(
    (c) => c.subject.toLowerCase() === key,
  );
  if (found) return found.subject;

  return trimmed;
}

export function getSubjectConfig(subject: string): CurriculumSubjectConfig {
  const canonical = normalizeSubject(subject);
  const found = SUBJECT_CURRICULUM.find((c) => c.subject === canonical);
  if (!found) {
    throw new Error(`Unknown subject: ${subject}`);
  }
  return found;
}

export function gameKey(
  subject: string,
  level: number,
  skill: string,
  gameIndex: number,
) {
  const sub = normalizeSubject(subject).toLowerCase().replace(/\s+/g, '_');
  return `${sub}_l${level}_${skill}_g${gameIndex}`;
}

export function resolveSkillStatus(
  skillRow: {
    games_completed: number;
    games_total: number;
    games_won: number;
  },
  prevSkillRow: { games_won: number } | null,
  levelNumber: number,
): LevelStatus {
  if (levelNumber > MAX_AUTO_UNLOCK_LEVEL) {
    return 'locked';
  }

  const completed =
    skillRow.games_total > 0 &&
    skillRow.games_completed >= skillRow.games_total;

  if (completed) return 'completed';
  if (levelNumber === 1) return 'unlocked';
  if (prevSkillRow && prevSkillRow.games_won >= 1) return 'unlocked';
  return 'locked';
}

export function resolveLevelStatus(skillStatuses: LevelStatus[]): LevelStatus {
  if (skillStatuses.length === 0) return 'locked';
  if (skillStatuses.every((s) => s === 'completed')) return 'completed';
  if (skillStatuses.some((s) => s === 'unlocked' || s === 'completed')) {
    return 'unlocked';
  }
  return 'locked';
}
