import wordsData from '../data/words.json';
import { pickRandom, shuffle } from './random';

type WordsFile = { categories: Record<string, [string, string][]> };

const data = wordsData as unknown as WordsFile;

export const ALL_CATEGORIES = Object.keys(data.categories);

export interface CategoryOption {
  id: string;
  label: string;
  count: number;
}

const PRETTY_LABELS: Record<string, string> = {
  food: 'Food & Drinks',
  animals: 'Animals',
  places: 'Places & Travel',
  sports: 'Sports & Games',
  jobs: 'Jobs & People',
  household: 'Household',
  entertainment: 'Entertainment',
  nature: 'Nature & Weather',
  transport: 'Transport',
  body: 'Body & Health',
  clothing: 'Clothing',
  technology: 'Technology',
};

export function getCategoryOptions(): CategoryOption[] {
  const options: CategoryOption[] = ALL_CATEGORIES.map((id) => ({
    id,
    label: PRETTY_LABELS[id] ?? id,
    count: data.categories[id].length,
  }));
  options.sort((a, b) => a.label.localeCompare(b.label));
  const total = options.reduce((s, o) => s + o.count, 0);
  return [{ id: 'random', label: 'Random (all categories)', count: total }, ...options];
}

/**
 * Pick a fresh word pair from the given category. Avoids repeating any pair
 * whose key is in `usedKeys`. Returns the pair and a stable key to track it.
 * The pair is randomly oriented (which word is "civilian" vs "undercover").
 */
export function pickWordPair(
  categoryId: string,
  usedKeys: Set<string>,
): { civilian: string; undercover: string; key: string; category: string } {
  let category = categoryId;
  let pool: [string, string][];
  if (categoryId === 'random') {
    pool = ALL_CATEGORIES.flatMap((c) => data.categories[c]);
  } else if (data.categories[categoryId]) {
    pool = data.categories[categoryId];
  } else {
    category = 'random';
    pool = ALL_CATEGORIES.flatMap((c) => data.categories[c]);
  }

  const candidates = shuffle(pool);
  let chosen: [string, string] | undefined;
  let chosenKey = '';
  for (const pair of candidates) {
    const key = pair.join('|');
    if (!usedKeys.has(key)) {
      chosen = pair;
      chosenKey = key;
      break;
    }
  }
  if (!chosen) {
    chosen = pickRandom(pool);
    chosenKey = chosen.join('|');
  }

  // Randomize orientation so the "first" word in the file isn't always the civilian word.
  const [a, b] = chosen;
  const flip = Math.random() < 0.5;
  return {
    civilian: flip ? b : a,
    undercover: flip ? a : b,
    key: chosenKey,
    category,
  };
}
