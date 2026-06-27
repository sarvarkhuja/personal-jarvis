/**
 * Curated habit color palette.
 *
 * `token` is what we persist (habits.color — `z.string().max(20)`); `swatch` is
 * a *literal* Tailwind class so the v4 scanner emits it. Never build the class
 * dynamically (`bg-${token}-500`) — the scanner can't see those and they'd be
 * purged.
 */
export type HabitColor = {
  token: string;
  label: string;
  swatch: string;
};

export const HABIT_COLORS: readonly HabitColor[] = [
  { token: 'gray', label: 'Gray', swatch: 'bg-gray-500' },
  { token: 'red', label: 'Red', swatch: 'bg-red-500' },
  { token: 'orange', label: 'Orange', swatch: 'bg-orange-500' },
  { token: 'amber', label: 'Amber', swatch: 'bg-amber-500' },
  { token: 'yellow', label: 'Yellow', swatch: 'bg-yellow-500' },
  { token: 'lime', label: 'Lime', swatch: 'bg-lime-500' },
  { token: 'green', label: 'Green', swatch: 'bg-green-500' },
  { token: 'emerald', label: 'Emerald', swatch: 'bg-emerald-500' },
  { token: 'teal', label: 'Teal', swatch: 'bg-teal-500' },
  { token: 'cyan', label: 'Cyan', swatch: 'bg-cyan-500' },
  { token: 'sky', label: 'Sky', swatch: 'bg-sky-500' },
  { token: 'blue', label: 'Blue', swatch: 'bg-blue-500' },
  { token: 'indigo', label: 'Indigo', swatch: 'bg-indigo-500' },
  { token: 'violet', label: 'Violet', swatch: 'bg-violet-500' },
  { token: 'purple', label: 'Purple', swatch: 'bg-purple-500' },
  { token: 'fuchsia', label: 'Fuchsia', swatch: 'bg-fuchsia-500' },
  { token: 'pink', label: 'Pink', swatch: 'bg-pink-500' },
  { token: 'rose', label: 'Rose', swatch: 'bg-rose-500' },
];

export const DEFAULT_HABIT_COLOR = 'gray';

/** Resolve a stored token to its palette entry, falling back to the default. */
export function habitColor(token: string): HabitColor {
  return HABIT_COLORS.find((c) => c.token === token) ?? HABIT_COLORS[0];
}
