import raw from './raw.json';

export interface CasePalette {
  bg: string;
  ink: string;
  acc: string;
  chip: string;
  card: string;
  cardInk: string;
  barMute: string;
}

export interface CaseMeta {
  client: string;
  tier: number;
  real?: boolean;
  stack?: string;
  /** Image key in src/assets/images (file name without extension). */
  img?: string;
  gallery?: { src: string; fit: 'cover' | 'contain'; bg: string }[];
  metrics: string[];
  pal: CasePalette;
  bars?: number[];
}

const imageKey = (path: string) => path.replace(/^assets\//, '').replace(/\.\w+$/, '');

export const CASE_META: CaseMeta[] = (raw.CASE_META as CaseMeta[]).map((c) => ({
  ...c,
  img: c.img && imageKey(c.img),
  gallery: c.gallery?.map((g) => ({ ...g, src: imageKey(g.src) })),
}));
