import type { LyricLine } from '../../types';
const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const WORD_TAG = /<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g;
const DIACRITICS = /[\u0300-\u036f]|[^\u0000-\u024f]/g;
/** Share of letters that carry accents / non-Latin marks (Vietnamese is very high, English zero). */
const accentRatio = (text: string): number => {
  const letters = text.normalize('NFD').match(/\p{L}/gu)?.length ?? 0;
  return letters ? (text.normalize('NFD').match(DIACRITICS)?.length ?? 0) / letters : 0;
};
/**
 * Some LRC files carry a translation: two lines with the same timestamp. Showing both makes the lyric flicker
 * between languages with zero duration, so one becomes the main line and the others go to `subtext`.
 * The main one is the line that "looks like" the track title/artist (accents or not); without a hint, the first in the file.
 */
export function pickMainLine(texts: string[], hint = ''): number {
  if (texts.length < 2 || !hint) return 0;
  const target = accentRatio(hint) > 0.04 ? 1 : 0;
  let best = 0, bestDiff = Infinity;
  texts.forEach((t, i) => {
    const diff = Math.abs((accentRatio(t) > 0.04 ? 1 : 0) - target);
    if (diff < bestDiff) { best = i; bestDiff = diff; }
  });
  return best;
}
const SAME_TIME_MS = 400;
export function parseLrc(lrc: string | null | undefined, durationMs?: number, hint = ''): LyricLine[] {
  if (!lrc) return [];
  const entries: Array<{startMs:number;text:string;alts?:string[]}> = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const tags=[...raw.matchAll(TIME_TAG)]; if (!tags.length) continue;
    // NFC: decomposed accents (e + combining mark) render detached from the letter in some fonts.
    const text=raw.replace(TIME_TAG,'').replace(WORD_TAG,'').replace(/\s+/g,' ').trim().normalize('NFC');
    for (const tag of tags) entries.push({startMs:(Number(tag[1])*60+Number(tag[2]))*1000+(tag[3]?Number(tag[3].padEnd(3,'0').slice(0,3)):0),text});
  }
  entries.sort((a,b)=>a.startMs-b.startMs);
  // merge translations that share a timestamp
  const merged: Array<{startMs:number;text:string;alts:string[]}> = [];
  let group: string[] = [], groupStart = 0;
  const flush = () => {
    if (!group.length) return;
    const main = pickMainLine(group, hint);
    merged.push({ startMs: groupStart, text: group[main], alts: group.filter((_, i) => i !== main) });
    group = [];
  };
  for (const entry of entries) {
    if (!entry.text) { flush(); merged.push({ startMs: entry.startMs, text: '', alts: [] }); continue; }
    if (group.length && Math.abs(entry.startMs - groupStart) <= SAME_TIME_MS && !group.includes(entry.text)) group.push(entry.text);
    else if (group.length && group.includes(entry.text)) continue;
    else { flush(); group = [entry.text]; groupStart = entry.startMs; }
  }
  flush();
  merged.sort((a,b)=>a.startMs-b.startMs);
  const lines:LyricLine[]=[];
  merged.forEach((entry,index)=>{if(!entry.text)return;const next=merged[index+1];lines.push({id:`lrc-${lines.length}`,startMs:entry.startMs,endMs:next?Math.max(entry.startMs,next.startMs-1):durationMs&&durationMs>entry.startMs?durationMs:entry.startMs+5000,text:entry.text,...(entry.alts.length?{subtext:entry.alts.join(' / ')}:{})});});
  return lines;
}
export interface LyricsCandidate {duration?:number|null;syncedLyrics:string|null;plainLyrics:string|null;instrumental:boolean;}
export function pickBestLyricsRecord<T extends LyricsCandidate>(candidates:T[],durationMs:number,toleranceSec=3):T|null{
 const target=durationMs/1000;
 return candidates.filter(c=>c.syncedLyrics||c.plainLyrics||c.instrumental)
 .map(c=>({c,diff:typeof c.duration==='number'?Math.abs(c.duration-target):Infinity}))
 .filter(x=>x.diff<=toleranceSec)
 .sort((a,b)=>Number(Boolean(b.c.syncedLyrics))-Number(Boolean(a.c.syncedLyrics))||a.diff-b.diff)[0]?.c??null;
}