import { z } from 'zod';

export const SelfImageSchema = z.object({
  months: z.union([z.literal(2), z.literal(7), z.literal(15)]),
  title: z.string().trim().min(1, 'Give your vision a title.').max(100),
  vision: z.string().trim().min(1, 'Describe who you are becoming.').max(600),
  ml: z.string().trim().min(1).max(400),
  physique: z.string().trim().min(1).max(400),
  work: z.string().trim().min(1).max(400),
  salah: z.string().trim().min(1).max(400),
  discipline: z.string().trim().min(1).max(400),
});

export type SelfImageInput = z.infer<typeof SelfImageSchema>;
export type SelfImage = SelfImageInput & { id: string };

export const SELF_IMAGE_PILLARS = [
  { key: 'ml', label: 'Machine learning' },
  { key: 'physique', label: 'Physique' },
  { key: 'work', label: 'Work' },
  { key: 'salah', label: 'Salah' },
  { key: 'discipline', label: 'Discipline' },
] as const;

export const STARTER_SELF_IMAGES: SelfImageInput[] = [
  {
    months: 2,
    title: 'I keep promises to myself.',
    vision: 'I show up even when motivation is low. My days have structure, my prayers have priority, and small actions are becoming my identity.',
    ml: 'Study ML for 45 focused minutes, 5 days a week. Build Python and maths foundations; finish one small project.',
    physique: 'Train 3 times a week, record my lifts, and keep a consistent sleep routine.',
    work: 'Choose one important outcome each morning. Finish a distraction-free work block before checking feeds.',
    salah: 'Plan my day around the five daily prayers. Prepare early and track each prayer honestly.',
    discipline: 'Plan tomorrow before bed. Review my habits every week and return to the routine after a missed day.',
  },
  {
    months: 7,
    title: 'Consistency is my standard.',
    vision: 'I am a capable builder with a stronger body and a steady routine. I protect my attention and make room for both ambition and faith.',
    ml: 'Complete 3 end-to-end ML projects. Explain my data choices, baselines, evaluation, and results in clear write-ups.',
    physique: 'Sustain 3–4 training sessions a week. Review strength and body measurements monthly and adjust deliberately.',
    work: 'Deliver something useful every week. Protect deep-work time and review my priorities each Friday.',
    salah: 'Keep all five prayers central to my schedule, including busy days. Build more presence and less rushing.',
    discipline: 'Keep a weekly review, limit distractions, and make my routine work on difficult days too.',
  },
  {
    months: 15,
    title: 'I live what I once imagined.',
    vision: 'I am a disciplined ML practitioner, a stronger version of myself, and a dependable person. Learning, meaningful work, and salah are part of how I live.',
    ml: 'Deploy a useful ML product and maintain it. Read papers regularly, reproduce ideas, and share what I learn.',
    physique: 'Maintain a sustainable physique and measurable strength progress through consistent training and recovery.',
    work: 'Own meaningful projects from idea to delivery. Produce reliable work without sacrificing my core routines.',
    salah: 'Protect the five daily prayers through changing schedules. Continue learning and deepen my attention in prayer.',
    discipline: 'Let my calendar reflect my values. Review the long-term direction monthly and keep showing up daily.',
  },
];
