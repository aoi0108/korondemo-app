export const entryCharacterLimit = 140;
export const tagLimit = 3;

export const palette = ['#F9DF85', '#AADDC7', '#AFD6EC', '#CABBE8', '#F3B5C7', '#F6C39B'];
export const ivory = '#FFF4DF';
export const feelings = [
  ['うれしい', 0], ['たのしい', 0], ['ほっとした', 1], ['かなしい', 2],
  ['不安', 3], ['もやもや', 3], ['くやしい', 5], ['おどろいた', 4],
  ['はずかしい', 4], ['つかれた', 5],
] as const;

export type Tag = { label: string; color: string };
export type Perspective = { title: string; description: string; question?: string };
export type Challenge = { text: string; createdAt: number; done: boolean; reflection?: string };
export type Entry = {
  id: string;
  createdAt: number;
  body: string;
  tags: Tag[];
  perspectives?: Perspective[];
  selected?: number;
  challenge?: Challenge;
  retryAt?: number;
};

export function validPerspectives(value: unknown): value is Perspective[] {
  return Array.isArray(value) && value.length === 3 && value.every((p) =>
    p && typeof p.title === 'string' && p.title.trim() && p.title.length <= 60 &&
    typeof p.description === 'string' && p.description.trim() && p.description.length <= 300 &&
    typeof p.question === 'string' && p.question.trim() && p.question.length <= 120
  );
}
