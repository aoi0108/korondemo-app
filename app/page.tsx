'use client';

import { useEffect, useRef, useState } from 'react';
import { Entry, Tag, feelings, ivory, palette, validPerspectives } from './model';

type Tab = 'home' | 'garden' | 'records' | 'challenges';
type Screen = Tab | 'new' | 'edit' | 'bloom' | 'detail';
const storageKey = 'korondemo.entries.v1';
const tabs = [
  ['home', 'ホーム', '⌂'], ['garden', '庭', '✿'], ['records', '記録', '▤'], ['challenges', '小さな挑戦', '☆'],
] as const;
const dateLabel = (time: number) => new Date(time).toLocaleDateString('ja-JP', { dateStyle: 'long' });
const monthKey = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0')].join('-');

function Daruma({ seed = false }: { seed?: boolean }) {
  return <div className="mascot" aria-hidden="true">
    <div className="daruma"><div className="face"><i/><i/><b/></div><span>✿</span></div>
    {seed && <span className="seed"/>}
  </div>;
}

function Flower({ tags }: { tags: Tag[] }) {
  const colors = tags.length ? tags.map((tag) => tag.color) : [ivory];
  return <span className="flower" aria-hidden="true">
    {Array.from({ length: 5 }, (_, index) => (
      <i key={index} style={{ background: colors[index % colors.length], transform: 'rotate(' + index * 72 + 'deg) translateY(-36%)' }}/>
    ))}
    <b/>
  </span>;
}

export default function Page() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [origin, setOrigin] = useState<Tab>('home');
  const [id, setId] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [custom, setCustom] = useState('');
  const [color, setColor] = useState(palette[0]);
  const [month, setMonth] = useState('');
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [challenge, setChallenge] = useState('');
  const [opening, setOpening] = useState(false);
  const [pending, setPending] = useState('');
  const requestInProgress = useRef(false);
  const savedNewEntry = useRef(false);
  const [failure, setFailure] = useState('');
  const [now, setNow] = useState(0);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete'>();
  const dialog = useRef<HTMLDialogElement>(null);
  const entry = entries.find((record) => record.id === id);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (!Array.isArray(saved)) throw new Error('Invalid records');
        setEntries(saved);
      }
      setReady(true);
    } catch {
      setStorageError('保存した記録を読み込めませんでした。');
    }
    setMonth(monthKey());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!opening) return;
    const timer = window.setTimeout(() => setOpening(false), 3000);
    return () => window.clearTimeout(timer);
  }, [opening]);

  useEffect(() => {
    if (!entry?.retryAt || entry.retryAt <= now) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, entry.retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [entry?.retryAt, now]);

  useEffect(() => {
    if (confirm && !dialog.current?.open) dialog.current?.showModal();
    if (!confirm && dialog.current?.open) dialog.current.close();
  }, [confirm]);

  function commit(change: (current: Entry[]) => Entry[]) {
    try {
      const raw = localStorage.getItem(storageKey);
      const next = change(raw ? JSON.parse(raw) : []);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setEntries(next);
      setStorageError('');
      return true;
    } catch {
      setStorageError('変更を保存できませんでした。ブラウザの保存設定や空き容量を確認してください。');
      return false;
    }
  }

  function update(recordId: string, changes: Partial<Entry>) {
    return commit((records) => records.map((record) => record.id === recordId ? { ...record, ...changes } : record));
  }

  function go(next: Screen) {
    setScreen(next);
    setMenu(false);
    window.scrollTo(0, 0);
  }

  function start(from: Tab, existing?: Entry) {
    if (!existing) {
      setOrigin(from);
      savedNewEntry.current = false;
    }
    setBody(existing?.body ?? '');
    setTags(existing?.tags ?? []);
    setCustom('');
    setColor(palette[0]);
    go(existing ? 'edit' : 'new');
  }

  function open(record: Entry, from: Tab) {
    setOrigin(from);
    setId(record.id);
    setIndex(0);
    setChallenge('');
    setFailure('');
    go('detail');
  }

  function backFromForm() {
    const tagChanged = screen === 'edit' ? JSON.stringify(tags) !== JSON.stringify(entry?.tags) : tags.length > 0;
    if (body !== (screen === 'edit' ? entry?.body : '') || tagChanged || custom.trim()) setConfirm('discard');
    else go(screen === 'edit' ? 'detail' : origin);
  }

  function toggleTag(tag: Tag) {
    const existing = tags.find((item) => item.label === tag.label);
    if (existing) setTags(tags.filter((item) => item.label !== tag.label));
    else if (tags.length < 3) setTags([...tags, tag]);
  }

  async function generate(record: Entry) {
    if (requestInProgress.current || (record.retryAt ?? 0) > Date.now()) return;
    requestInProgress.current = true;
    setPending(record.id);
    setFailure('');
    try {
      const response = await fetch('/api/perspectives', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: record.body, ...(record.tags.length && { tags: record.tags.map((tag) => tag.label) }) }),
      });
      if (response.status === 429) {
        const time = Date.now();
        update(record.id, { retryAt: time + 60000 });
        setNow(time);
      }
      const data = await response.json();
      if (!response.ok || !validPerspectives(data.perspectives)) throw new Error('Unavailable');
      if (!update(record.id, { perspectives: data.perspectives, selected: undefined, retryAt: undefined })) {
        throw new Error('Storage unavailable');
      }
      setIndex(0);
    } catch {
      setFailure(record.id);
    } finally {
      requestInProgress.current = false;
      setPending('');
    }
  }

  function saveEntry() {
    const text = body.trim();
    if (!text || Array.from(text).length > 140) return;
    if (screen === 'edit' && entry) {
      if (update(entry.id, { body: text, tags })) go('detail');
      return;
    }
    if (savedNewEntry.current || requestInProgress.current) return;
    const record: Entry = { id: crypto.randomUUID(), createdAt: Date.now(), body: text, tags };
    if (!commit((records) => [record, ...records])) return;
    savedNewEntry.current = true;
    setId(record.id);
    setIndex(0);
    setChallenge('');
    setOpening(true);
    go('bloom');
    void generate(record);
  }

  function saveChallenge(record: Entry) {
    const text = challenge.trim();
    if (!text || !update(record.id, { challenge: { text, createdAt: Date.now(), done: false } })) return;
    setChallenge('');
    if (screen === 'bloom') go('home');
  }

  function moveMonth(offset: number) {
    if (!month) return;
    const [year, selectedMonth] = month.split('-').map(Number);
    setMonth(monthKey(new Date(year, selectedMonth - 1 + offset, 1)));
  }

  function perspectiveCards(record: Entry) {
    const cards = record.perspectives;
    if (!cards?.length) return null;
    const selected = record.selected;
    const shown = selected ?? index;
    const card = cards[shown];
    return <div className="perspectives">
      <article className="card" aria-live="polite"><h2>{card.title}</h2><p>{card.description}</p></article>
      {selected === undefined ? <>
        <div className="switcher">
          <button className="round" onClick={() => setIndex(index - 1)} disabled={index === 0} aria-label="前の視点">‹</button>
          <span>{index + 1} / {cards.length}</span>
          <button className="round" onClick={() => setIndex(index + 1)} disabled={index === cards.length - 1} aria-label="次の視点">›</button>
        </div>
        <button className="primary" disabled={!!pending} onClick={() => update(record.id, { selected: index })}>この視点を選ぶ</button>
        {screen === 'bloom' && <button className="subtle" onClick={() => go('home')}>選ばずに終える</button>}
      </> : !record.challenge && <div className="challenge-form">
        <label htmlFor="challenge">小さな挑戦（任意）</label>
        <textarea id="challenge" rows={2} value={challenge} onChange={(event) => setChallenge(event.target.value)}/>
        <button className="primary" disabled={!challenge.trim()} onClick={() => saveChallenge(record)}>挑戦を保存する</button>
        {screen === 'bloom' && <button className="subtle" onClick={() => go('home')}>書かずに終える</button>}
      </div>}
    </div>;
  }

  const visibleFlowers = entries.filter((record) => monthKey(new Date(record.createdAt)) === month);
  const challenges = entries.filter((record) => record.challenge?.done === done)
    .sort((a, b) => b.challenge!.createdAt - a.challenge!.createdAt);
  const dateOrder = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const form = screen === 'new' || screen === 'edit';

  return <div className="shell">
    <header className="top">
      {form && <button className="back" onClick={backFromForm}>‹ 戻る</button>}
      {screen === 'detail' && <button className="back" onClick={() => go(origin)}>‹ 戻る</button>}
      <div className="wordmark">ころんでも。</div>
      {screen === 'detail' && entry && <div className="more">
        <button className="round" aria-expanded={menu} aria-label="記録の操作" onClick={() => setMenu(!menu)}>…</button>
        {menu && <div className="popover">
          <button disabled={!!pending} onClick={() => start(origin, entry)}>編集</button>
          <button onClick={() => { setMenu(false); setConfirm('delete'); }}>削除</button>
        </div>}
      </div>}
    </header>
    <main>
      {storageError && <p role="alert" className="notice">{storageError}</p>}
      {screen === 'home' && <section className="home">
        <div className="hero"><Daruma/></div>
        <h1>ころんでも。</h1>
        <button className="primary" disabled={!ready} onClick={() => start('home')}>できごとを記録する</button>
      </section>}
      {form && <form className="editor" onSubmit={(event) => { event.preventDefault(); saveEntry(); }}>
        <div className="mini"><Daruma/></div>
        <h1>{screen === 'edit' ? '記録を編集' : 'できごとの記録'}</h1>
        <label htmlFor="body">できごと</label>
        <textarea id="body" rows={4} required value={body} onChange={(event) => {
          setBody(Array.from(event.target.value).slice(0, 140).join(''));
        }}/>
        <div className="count">{Array.from(body).length} / 140</div>
        <fieldset>
          <legend>気持ちタグ（任意・3つまで）</legend>
          <div className="tags">
            {feelings.map(([label, slot]) => {
              const active = tags.some((tag) => tag.label === label);
              return <button key={label} type="button" className="tag" aria-pressed={active}
                disabled={!active && tags.length >= 3} onClick={() => toggleTag({ label, color: palette[slot] })}>
                <i style={{ background: palette[slot] }}/>{label}
              </button>;
            })}
            {tags.filter(({ label }) => !feelings.some(([preset]) => preset === label)).map((tag) =>
              <button key={tag.label} type="button" className="tag" aria-pressed="true" onClick={() => toggleTag(tag)}>
                <i style={{ background: tag.color }}/>{tag.label} ×
              </button>)}
          </div>
          <label htmlFor="custom">自分のタグ</label>
          <div className="custom"><input id="custom" maxLength={30} value={custom} onChange={(event) => setCustom(event.target.value)}/>
            <button type="button" className="secondary" disabled={!custom.trim() || tags.length >= 3 || tags.some((tag) => tag.label === custom.trim())}
              onClick={() => {
                const label = custom.trim();
                const preset = feelings.find(([value]) => value === label);
                toggleTag({ label, color: preset ? palette[preset[1]] : color });
                setCustom('');
              }}>追加</button></div>
          <div className="colors" aria-label="タグの色">
            {palette.map((value, slot) => <button key={value} type="button" aria-label={['淡い黄色','ミント','水色','ラベンダー','桃色','淡いオレンジ'][slot]}
              aria-pressed={color === value} style={{ background: value }} onClick={() => setColor(value)}/>)}
          </div>
        </fieldset>
        {screen === 'new' && <p className="notice">保存すると、できごとの本文と選んだ気持ちタグを視点の生成に使うためGeminiへ送ります。無料枠では、送信内容がGoogleのサービス改善に使われる場合があります。個人を特定できる情報は入力しないでください。</p>}
        <button className="primary" disabled={!body.trim() || !ready || !!pending}>{screen === 'edit' ? '変更を保存' : '保存する'}</button>
      </form>}
      {screen === 'bloom' && entry && <section className="bloom">
        {opening ? <button className="animation" onClick={() => setOpening(false)} aria-label="開花演出を先へ進める">
          <div className="bloom-daruma"><Daruma/></div><div className="bloom-flower"><Flower tags={entry.tags}/></div>
        </button> : pending === id ? <p role="status">視点を考えています</p> : entry.perspectives ? perspectiveCards(entry) :
          <><p role="status">視点を表示できませんでした。記録と花は保存されています。</p>
            <button className="primary" onClick={() => go('home')}>ホームに戻る</button></>}
      </section>}
      {screen === 'garden' && <section>
        <h1>庭</h1>
        <div className="switcher">
          <button className="round" aria-label="前月" onClick={() => moveMonth(-1)}>‹</button>
          <input type="month" aria-label="庭の年月" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)}/>
          <button className="round" aria-label="翌月" onClick={() => moveMonth(1)}>›</button>
        </div>
        {visibleFlowers.length ? <div className="garden">
          {visibleFlowers.map((record) => <button key={record.id} onClick={() => open(record, 'garden')} aria-label={dateLabel(record.createdAt) + 'の記録を開く'}><Flower tags={record.tags}/></button>)}
        </div> : <div className="empty">
          {!entries.length ? <><div className="small"><Daruma seed/></div><button className="primary" disabled={!ready} onClick={() => start('garden')}>最初の花を咲かせる</button></> :
            <><p>この月には、まだ花がありません</p>{month < monthKey() && <button className="secondary" onClick={() => setMonth(monthKey())}>今月の庭に戻る</button>}</>}
        </div>}
      </section>}
      {screen === 'records' && <section><h1>記録</h1>
        {dateOrder.length ? <ul className="list">{dateOrder.map((record) => <li key={record.id}>
          <button className="record-row" onClick={() => open(record, 'records')}>
            <Flower tags={record.tags}/><span><strong>{dateLabel(record.createdAt)}</strong>
            <span className="tag-text">{record.tags.map((tag) => tag.label).join(' ・ ')}</span></span><span aria-hidden="true">›</span>
          </button>
        </li>)}</ul> : <div className="empty"><p>まだ記録がありません</p><button className="primary" disabled={!ready} onClick={() => start('records')}>できごとを記録する</button></div>}
      </section>}
      {screen === 'challenges' && <section><h1>小さな挑戦</h1>
        <div className="segments" aria-label="挑戦の状態">
          <button aria-pressed={!done} onClick={() => setDone(false)}>これから</button>
          <button aria-pressed={done} onClick={() => setDone(true)}>できた</button>
        </div>
        {challenges.length ? <ul className="list">{challenges.map((record) => <li className="challenge-row" key={record.id}>
          <button className="flower-link" onClick={() => open(record, 'challenges')} aria-label="元の記録を開く"><Flower tags={record.tags}/></button>
          <p>{record.challenge!.text}</p>
          <button className="secondary" onClick={() => update(record.id, { challenge: { ...record.challenge!, done: !done } })}>{done ? '取り消す' : 'できた'}</button>
        </li>)}</ul> : <div className="empty"><div className="small"><Daruma/></div><p>{done ? 'できたことが、ここに並びます' : '次に試してみたいことができたら、ここに並びます'}</p></div>}
      </section>}
      {screen === 'detail' && entry && <section className="detail">
        <h1>記録の詳細</h1>
        <article className="card"><div className="record-date"><Flower tags={entry.tags}/><time>{dateLabel(entry.createdAt)}</time></div>
          <p>{entry.body}</p><div className="tags">{entry.tags.map((tag) => <span className="tag" key={tag.label}><i style={{ background: tag.color }}/>{tag.label}</span>)}</div>
        </article>
        <h2>視点</h2>
        {perspectiveCards(entry)}
        {pending === id && <p role="status">視点を考えています</p>}
        {failure === id && <p role="status">視点を表示できませんでした。</p>}
        <button className="secondary" disabled={!!pending || (entry.retryAt ?? 0) > now} onClick={() => void generate(entry)}>
          {entry.perspectives ? '視点を作り直す' : '視点の生成を再試行する'}
        </button>
        {(entry.retryAt ?? 0) > now && <p className="notice">上限に達しました。1分たってから再試行できます。</p>}
        {entry.challenge && <><h2>小さな挑戦</h2><p className="card">{entry.challenge.text}</p></>}
      </section>}
    </main>
    {tabs.some(([tab]) => tab === screen) && <nav aria-label="メインメニュー">
      {tabs.map(([tab, label, icon]) => <button key={tab} aria-current={tab === screen ? 'page' : undefined}
        onClick={() => go(tab)}><span aria-hidden="true">{icon}</span>{label}</button>)}
    </nav>}
    <dialog ref={dialog} onCancel={() => setConfirm(undefined)} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{confirm === 'delete' ? '記録を削除しますか？' : screen === 'edit' ? '変更を破棄しますか？' : '書きかけの内容を破棄しますか？'}</h2>
      {confirm === 'delete' && <p>この記録の花・視点・小さな挑戦も削除されます。</p>}
      <div className="dialog-actions">
        <button className="secondary" onClick={() => setConfirm(undefined)} autoFocus>キャンセル</button>
        <button className="primary" onClick={() => {
          if (confirm === 'delete') {
            if (commit((records) => records.filter((record) => record.id !== id))) go(origin);
          } else go(screen === 'edit' ? 'detail' : origin);
          setConfirm(undefined);
        }}>{confirm === 'delete' ? '削除する' : '破棄する'}</button>
      </div>
    </dialog>
  </div>;
}
