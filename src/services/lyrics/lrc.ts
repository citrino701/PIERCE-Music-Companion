import type { LyricLine } from '../../types';
const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const WORD_TAG = /<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g;
export function parseLrc(lrc: string | null | undefined, durationMs?: number): LyricLine[] {
  if (!lrc) return [];
  const entries: Array<{startMs:number;text:string}> = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const tags=[...raw.matchAll(TIME_TAG)]; if (!tags.length) continue;
    const text=raw.replace(TIME_TAG,'').replace(WORD_TAG,'').replace(/\s+/g,' ').trim();
    for (const tag of tags) entries.push({startMs:(Number(tag[1])*60+Number(tag[2]))*1000+(tag[3]?Number(tag[3].padEnd(3,'0').slice(0,3)):0),text});
  }
  entries.sort((a,b)=>a.startMs-b.startMs);
  const lines:LyricLine[]=[];
  entries.forEach((entry,index)=>{if(!entry.text)return;const next=entries[index+1];lines.push({id:`lrc-${lines.length}`,startMs:entry.startMs,endMs:next?Math.max(entry.startMs,next.startMs-1):durationMs&&durationMs>entry.startMs?durationMs:entry.startMs+5000,text:entry.text});});
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