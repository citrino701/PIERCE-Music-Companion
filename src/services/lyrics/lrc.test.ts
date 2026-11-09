import test from 'node:test';import assert from 'node:assert/strict';import {parseLrc,pickBestLyricsRecord,pickMainLine} from './lrc';
const SAMPLE=['[ar:Artista de Teste]','[ti:Faixa de Teste]','[00:01.50] primeira linha de exemplo','[00:05.00]','[00:07.25]segunda linha','[01:02.5] terceira <01:03.00>linha'].join('\n');
test('parse timestamps, metadata and blank lines',()=>{const lines=parseLrc(SAMPLE,90000);assert.deepEqual(lines.map(l=>[l.startMs,l.endMs,l.text]),[[1500,4999,'primeira linha de exemplo'],[7250,62499,'segunda linha'],[62500,90000,'terceira linha']]);});
test('blank timestamp closes previous line',()=>{const lines=parseLrc('[00:01.00] a\n[00:03.00]\n[00:09.00] b');assert.equal(lines[0].endMs,2999);});
test('multiple timestamps create sorted lines',()=>{assert.deepEqual(parseLrc('[00:20.00][00:10.00] refrão\n[00:15.00] meio').map(l=>[l.startMs,l.text]),[[10000,'refrão'],[15000,'meio'],[20000,'refrão']]);});
test('empty input and default last-line duration',()=>{assert.deepEqual(parseLrc(null),[]);assert.equal(parseLrc('[00:02.00] fim')[0].endMs,7000);});
test('choose closest synced record within tolerance',()=>{const base={plainLyrics:'x',instrumental:false};const a={...base,duration:240,syncedLyrics:null},b={...base,duration:243,syncedLyrics:'[00:01.00] x'},c={...base,duration:241,syncedLyrics:'[00:01.00] x'},far={...base,duration:300,syncedLyrics:'[00:01.00] x'};assert.equal(pickBestLyricsRecord([a,b,c,far],240000),c);assert.equal(pickBestLyricsRecord([far],240000),null);});
const BILINGUAL=['[00:10.00]But a thing of beauty - I know','[00:10.00]Nhưng một điều đẹp đẽ - anh biết','[00:14.00]Will never fade away','[00:14.00]Sẽ không bao giờ phai mờ'].join('\n');
test('translations on the same timestamp collapse into one line with subtext',()=>{
  const en=parseLrc(BILINGUAL,20000,'Beauty Song');
  assert.deepEqual(en.map(l=>[l.startMs,l.endMs,l.text]),[[10000,13999,'But a thing of beauty - I know'],[14000,20000,'Will never fade away']]);
  assert.equal(en[0].subtext,'Nhưng một điều đẹp đẽ - anh biết');
  const vi=parseLrc(BILINGUAL,20000,'Điều đẹp đẽ');
  assert.equal(vi[0].text,'Nhưng một điều đẹp đẽ - anh biết');
  assert.equal(parseLrc(BILINGUAL,20000)[0].text,'But a thing of beauty - I know');
});
test('decomposed accents are normalised and repeated lines are not translations',()=>{
  assert.equal(parseLrc('[00:01.00] die\u0302\u0300u')[0].text,'die\u0302\u0300u'.normalize('NFC'));
  assert.equal(parseLrc('[00:01.00] oi\n[00:01.10] oi').length,1);
  assert.equal(pickMainLine(['a']),0);
});
