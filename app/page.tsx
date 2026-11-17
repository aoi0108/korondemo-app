'use client';

import { useEffect, useRef, useState } from 'react';
import { cats, Daruma, Fish, Flower, monthKey, MonthSwitcher, Paw, type GardenCat } from './garden-ui';
import { entryCharacterLimit, feelings, palette, tagLimit, validPerspectives, type Challenge, type Entry, type Tag } from './model';

type Tab = 'home' | 'records' | 'challenges';
type Screen = Tab | 'new' | 'edit' | 'bloom' | 'detail';
const storageKey = 'korondemo.entries.v1';
const catStorageKey = 'korondemo.garden-cat.v1';
const challengeBatchSize = 10;
const reflectionLimit = 140;
const tabs = [
  ['home', 'ホーム', '⌂'], ['records', '記録', '▤'], ['challenges', '小さな挑戦'],
] as const;
const dateLabel = (time: number) => new Date(time).toLocaleDateString('ja-JP', { dateStyle: 'long' });

export default function Page() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [cat, setCat] = useState<GardenCat>(cats[0]);
  const [catError, setCatError] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [origin, setOrigin] = useState<Tab>('home');
  const [id, setId] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [custom, setCustom] = useState('');
  const [color, setColor] = useState(palette[0]);
  const [month, setMonth] = useState('');
  const [done, setDone] = useState(false);
  const [challengeMonth, setChallengeMonth] = useState('');
  const [challengeLimit, setChallengeLimit] = useState(challengeBatchSize);
  const [index, setIndex] = useState(0);
  const [challenge, setChallenge] = useState('');
  const [opening, setOpening] = useState(false);
  const [pending, setPending] = useState('');
  const requestInProgress = useRef(false);
  const savedNewEntry = useRef(false);
  const [failure, setFailure] = useState('');
  const [now, setNow] = useState(0);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | 'delete-reflection'>();
  const [reflectionTarget, setReflectionTarget] = useState('');
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [reflectionError, setReflectionError] = useState(false);
  const reflectionDialog = useRef<HTMLDialogElement>(null);
  const upcomingTab = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const sendingDialog = useRef<HTMLDialogElement>(null);
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
    const currentMonth = monthKey();
    setMonth(currentMonth);
    setChallengeMonth(currentMonth);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    try {
      const savedCat = localStorage.getItem(catStorageKey);
      setCat(cats.find((option) => option.id === savedCat) ?? cats[0]);
    } catch {
      setCatError('ねこの設定を読み込めませんでした。');
    }
  }, []);

  function chooseCat(option: GardenCat) {
    try {
      localStorage.setItem(catStorageKey, option.id);
      setCat(option);
      setCatError('');
    } catch {
      setCatError('ねこの設定を保存できませんでした。');
    }
  }

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
    else if (tags.length < tagLimit) setTags([...tags, tag]);
  }

  async function generate(record: Entry) {
    if (requestInProgress.current || (record.retryAt ?? 0) > Date.now()) return;
    requestInProgress.current = true;
    setPending(record.id);
    setFailure('');
    try {
      const response = await fetch('/api/perspectives', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: record.body, ...(record.tags.length ? { tags: record.tags.map((tag) => tag.label) } : {}) }),
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
    if (!text || Array.from(text).length > entryCharacterLimit) return;
    if (screen === 'edit' && entry) {
      if (update(entry.id, { body: text, tags })) go('detail');
      return;
    }
    if (savedNewEntry.current || requestInProgress.current) return;
    const record: Entry = { id: crypto.randomUUID(), createdAt: Date.now(), body: text, tags };
    if (!commit((records) => [record, ...records])) return;
    setMonth(monthKey(new Date(record.createdAt)));
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

  function updateChallenge(recordId: string, changes: Partial<Challenge>) {
    return commit((records) => {
      if (!records.some((record) => record.id === recordId && record.challenge)) {
        throw new Error('Challenge unavailable');
      }
      return records.map((record) => record.id === recordId && record.challenge
        ? { ...record, challenge: { ...record.challenge, ...changes } }
        : record);
    });
  }

  function openReflection(record: Entry) {
    setReflectionTarget(record.id);
    setReflectionDraft(record.challenge?.reflection ?? '');
    setReflectionError(false);
    reflectionDialog.current?.showModal();
  }

  function toggleChallenge(record: Entry) {
    if (!updateChallenge(record.id, { done: !done })) return;
    if (!done) openReflection(record);
  }

  function saveReflection() {
    const text = reflectionDraft.trim();
    if (!text || Array.from(text).length > reflectionLimit) return;
    if (updateChallenge(reflectionTarget, { reflection: text })) {
      reflectionDialog.current?.close();
    } else {
      setReflectionError(true);
    }
  }

  function perspectiveCards(record: Entry) {
    const cards = record.perspectives;
    if (!cards?.length) return null;
    const selected = record.selected;
    const shown = selected ?? index;
    const card = cards[shown];
    return <div className="perspectives">
      <article className="card" aria-live="polite">
        <h2 className="perspective-title">
          {selected !== undefined && <Paw/>}
          {card.title}
        </h2>
        <p>{card.description}</p>
      </article>
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
        <p id="challenge-question">{card.question ?? 'この見方から、次に少しだけ試せそうなことは何ですか？'}</p>
        <textarea id="challenge" aria-describedby="challenge-question" rows={2} value={challenge} onChange={(event) => setChallenge(event.target.value)}/>
        <button className="primary" disabled={!challenge.trim()} onClick={() => saveChallenge(record)}>挑戦を保存する</button>
        {screen === 'bloom' && <button className="subtle" onClick={() => go('home')}>書かずに終える</button>}
      </div>}
    </div>;
  }

  const visibleFlowers = entries.filter((record) => monthKey(new Date(record.createdAt)) === month);
  const challenges = entries.filter((record): record is Entry & { challenge: Challenge } =>
    record.challenge?.done === done
  ).sort((a, b) => b.challenge.createdAt - a.challenge.createdAt);
  const visibleChallenges = done
    ? challenges.filter((record) => monthKey(new Date(record.challenge.createdAt)) === challengeMonth)
    : challenges.slice(0, challengeLimit);
  const dateOrder = screen === 'records' ? [...entries].sort((a, b) => b.createdAt - a.createdAt) : [];
  const form = screen === 'new' || screen === 'edit';

  return <div className="shell">
    <header className="top">
      {form && <button className="back" onClick={backFromForm}>‹ 戻る</button>}
      {screen === 'detail' && <button className="back" onClick={() => go(origin)}>‹ 戻る</button>}
      {screen === 'home' ? <h1 className="wordmark">ころんでも。</h1> : <div className="wordmark">ころんでも。</div>}
      {screen === 'home' && <button type="button" className="round settings-button" aria-label="設定"
        aria-haspopup="dialog" onClick={() => settingsDialog.current?.showModal()}><span aria-hidden="true">⚙</span></button>}
      {screen === 'home' && <button type="button" className="round help-button" aria-label="使い方"
        aria-haspopup="dialog" onClick={() => helpDialog.current?.showModal()}>？</button>}
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
      {screen === 'home' && <div className="home">
        <div className="hero">
          <Daruma cat={cat} seed={ready && !entries.length} sizes="(max-width: 530px) 34vw, 180px"/>
          <div className="paw-trail" aria-hidden="true"><Paw/><Paw/></div>
        </div>
        <button className="primary" disabled={!ready} onClick={() => start('home')}><Fish/>できごとを記録する</button>
        <MonthSwitcher month={month} onChange={setMonth} label="庭"/>
        <section className="garden" aria-label="庭" aria-busy={!ready}>
          {visibleFlowers.map((record) => <button key={record.id} onClick={() => open(record, 'home')}
            aria-label={dateLabel(record.createdAt) + 'の記録を開く'}><Flower tags={record.tags}/></button>)}
          {ready && !visibleFlowers.length && <div className="garden-empty">
            <p>{entries.length ? 'この月は、まだ花が咲いていないにゃ。' : 'できごとを記録すると、ここに花が咲くにゃ。'}</p>
            {entries.length > 0 && month < monthKey() &&
              <button className="secondary" onClick={() => setMonth(monthKey())}>今月の庭に戻る</button>}
          </div>}
        </section>
        {visibleFlowers.length > 0 && <p className="garden-hint">花をタップすると記録を見返せます。</p>}
      </div>}
      {form && <form className="editor" onSubmit={(event) => { event.preventDefault(); saveEntry(); }}>
        <div className="mini"><Daruma cat={cat} sizes="74px"/></div>
        <h1 className="editor-title">
          <span className="cat-ears" aria-hidden="true"><i/><i/></span>
          {screen === 'edit' ? '記録を編集' : 'できごとの記録'}
        </h1>
        {screen === 'new' && <p className="mascot-note"><Fish/>{cat.note}</p>}
        <label htmlFor="body">できごと</label>
        <textarea id="body" rows={4} required value={body} onChange={(event) => {
          setBody(Array.from(event.target.value).slice(0, entryCharacterLimit).join(''));
        }}/>
        <div className="count">{Array.from(body).length} / {entryCharacterLimit}</div>
        <fieldset>
          <legend>気持ちタグ（任意・{tagLimit}つまで）</legend>
          <div className="tags">
            {feelings.map(([label, slot]) => {
              const active = tags.some((tag) => tag.label === label);
              return <button key={label} type="button" className="tag" aria-pressed={active}
                disabled={!active && tags.length >= tagLimit} onClick={() => toggleTag({ label, color: palette[slot] })}>
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
            <button type="button" className="secondary" disabled={!custom.trim() || tags.length >= tagLimit || tags.some((tag) => tag.label === custom.trim())}
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
        {screen === 'new' && <button type="button" className="subtle sending-info" aria-haspopup="dialog"
          onClick={() => sendingDialog.current?.showModal()}><span aria-hidden="true">ⓘ</span> Geminiへの送信について</button>}
        <button className="primary" disabled={!body.trim() || !ready || !!pending}>{screen === 'edit' ? '変更を保存' : '保存する'}</button>
      </form>}
      {screen === 'bloom' && entry && <section className="bloom">
        {opening ? <button className="animation" onClick={() => setOpening(false)} aria-label="開花演出を先へ進める">
          <div className="bloom-daruma"><Daruma cat={cat} sizes="(max-width: 620px) 36vw, 221px"/></div><div className="bloom-flower"><Flower tags={entry.tags}/></div>
        </button> : pending === id ? <p role="status">どんな見方ができるか、考えているにゃ。</p> : entry.perspectives ? perspectiveCards(entry) :
          <><p role="status">視点を表示できませんでした。記録と花は保存されています。</p>
            <button className="primary" onClick={() => go('home')}>ホームに戻る</button></>}
      </section>}
      {screen === 'records' && <section><h1>記録</h1>
        {dateOrder.length ? <ul className="list">{dateOrder.map((record) => <li key={record.id}>
          <button className="record-row" onClick={() => open(record, 'records')}>
            <Flower tags={record.tags}/><span><strong>{dateLabel(record.createdAt)}</strong>
            <span className="tag-text">{record.tags.map((tag) => tag.label).join(' ・ ')}</span></span><span aria-hidden="true">›</span>
          </button>
        </li>)}</ul> : <div className="empty"><Fish/><p>まだ記録がないにゃ。</p><button className="primary" disabled={!ready} onClick={() => start('records')}>できごとを記録する</button></div>}
      </section>}
      {screen === 'challenges' && <section><h1>小さな挑戦</h1>
        <div className="segments" aria-label="挑戦の状態">
          <button ref={upcomingTab} aria-pressed={!done} onClick={() => setDone(false)}>これから</button>
          <button aria-pressed={done} onClick={() => setDone(true)}>できた</button>
        </div>
        {done && <div className="challenge-month">
          <p>挑戦を書いた月で振り返る</p>
          <MonthSwitcher month={challengeMonth} onChange={setChallengeMonth} label="できた挑戦"/>
        </div>}
        {visibleChallenges.length ? <ul className="list">{visibleChallenges.map((record) => <li className="challenge-row" key={record.id}>
          <button className="flower-link" onClick={() => open(record, 'challenges')} aria-label="元の記録を開く"><Flower tags={record.tags}/></button>
          <div>
            <p>{record.challenge.text}</p>
            {done && record.challenge.reflection && <p className="reflection-note"><strong>やってみて気づいたこと</strong>{record.challenge.reflection}</p>}
          </div>
          <button className="secondary" onClick={() => toggleChallenge(record)}>{done ? '取り消す' : 'できた'}</button>
        </li>)}</ul> : <div className="empty"><div className="small"><Daruma cat={cat}/></div><p>
          {done && challenges.length > 0 ? 'この月に書いた挑戦で、できたことはまだないにゃ。'
            : done ? 'できたことが、ここに並ぶにゃ。' : '次に試してみたいことができたら、ここに並ぶにゃ。'}
        </p></div>}
        {!done && challenges.length > challengeLimit && <div className="challenge-more">
          <button className="secondary" onClick={() => setChallengeLimit((limit) => limit + challengeBatchSize)}>もっと見る</button>
        </div>}
      </section>}
      {screen === 'detail' && entry && <section className="detail">
        <h1>記録の詳細</h1>
        <article className="card"><div className="record-date"><Flower tags={entry.tags}/><time>{dateLabel(entry.createdAt)}</time></div>
          <p>{entry.body}</p><div className="tags">{entry.tags.map((tag) => <span className="tag" key={tag.label}><i style={{ background: tag.color }}/>{tag.label}</span>)}</div>
        </article>
        <h2>視点</h2>
        {perspectiveCards(entry)}
        {pending === id && <p role="status">どんな見方ができるか、考えているにゃ。</p>}
        {failure === id && <p role="status">視点を表示できませんでした。</p>}
        <button className="secondary" disabled={!!pending || (entry.retryAt ?? 0) > now} onClick={() => void generate(entry)}>
          {entry.perspectives ? '視点を作り直す' : '視点の生成を再試行する'}
        </button>
        {(entry.retryAt ?? 0) > now && <p className="notice">上限に達しました。1分たってから再試行できます。</p>}
        {entry.challenge && <><h2>小さな挑戦</h2><div className="card">
          <p>{entry.challenge.text}</p>
          {entry.challenge.reflection && <p className="reflection-note"><strong>やってみて気づいたこと</strong>{entry.challenge.reflection}</p>}
          <div className="dialog-actions">
            <button className="secondary" aria-haspopup="dialog" onClick={() => openReflection(entry)}>
              {entry.challenge.reflection ? 'ひとことを編集' : 'ひとことを残す'}
            </button>
            {entry.challenge.reflection && <button className="subtle" aria-haspopup="dialog" onClick={() => setConfirm('delete-reflection')}>ひとことを削除</button>}
          </div>
        </div></>}
      </section>}
    </main>
    {tabs.some(([tab]) => tab === screen) && <nav aria-label="メインメニュー">
      {tabs.map(([tab, label, icon]) => <button key={tab} aria-current={tab === screen ? 'page' : undefined}
        onClick={() => go(tab)}><span aria-hidden="true">{tab === 'challenges' ? <Paw/> : icon}</span>{label}</button>)}
    </nav>}
    <dialog ref={settingsDialog} className="settings-dialog" aria-labelledby="settings-title">
      <h2 id="settings-title">設定</h2>
      <div className="cat-options" role="group" aria-labelledby="garden-cat-label">
        <h3 id="garden-cat-label">庭のねこ</h3>
        {cats.map((option) => (
          <button key={option.id} type="button" className="cat-option" aria-pressed={cat.id === option.id}
            aria-label={option.name} onClick={() => chooseCat(option)}>
            <Daruma cat={option} sizes="100px"/>
            <span>{option.name}</span>
            <span className="cat-selected" aria-hidden="true">{cat.id === option.id ? '✓ 選択中' : ''}</span>
          </button>
        ))}
      </div>
      {catError && <p className="notice" role="alert">{catError}</p>}
      <form method="dialog" className="dialog-actions centered"><button className="primary">閉じる</button></form>
    </dialog>
    <dialog ref={helpDialog} className="help-dialog" aria-labelledby="help-title">
      <h2 id="help-title">ころんでも。の使い方</h2>
      <p>気持ちが動いたできごとを振り返って、次に試せそうな小さな一歩を見つけるアプリです。</p>
      <ol>
        <li><strong>できごとを記録する</strong><p>うれしかったことも、もやもやしたことも。保存すると庭に花が一輪咲きます。</p></li>
        <li><strong>気になる視点を選ぶ</strong><p>AIが示す3つの見方から、しっくりくるものを選べます。読み終えるだけでも大丈夫です。</p></li>
        <li><strong>小さな一歩を残す</strong><p>試してみたいことが浮かんだら書いておけます。「小さな挑戦」で見返せます。</p></li>
      </ol>
      <p>庭の花をタップすると、その日の記録が開きます。</p>
      <form method="dialog" className="dialog-actions centered"><button className="primary">閉じる</button></form>
    </dialog>
    <dialog ref={sendingDialog} aria-labelledby="sending-title">
      <h2 id="sending-title">Geminiへの送信について</h2>
      <p>保存すると、できごとの本文と選んだ気持ちタグを視点の生成に使うためGeminiへ送ります。無料枠では、送信内容がGoogleのサービス改善に使われる場合があります。個人を特定できる情報は入力しないでください。</p>
      <form method="dialog" className="dialog-actions centered"><button className="primary">閉じる</button></form>
    </dialog>
    <dialog ref={reflectionDialog} aria-labelledby="reflection-title"
      onClose={() => { if (screen === 'challenges') upcomingTab.current?.focus(); }}>
      <h2 id="reflection-title">やってみて、どうだった？</h2>
      <form className="reflection-form" onSubmit={(event) => { event.preventDefault(); saveReflection(); }}>
        <label htmlFor="reflection">ひとこと（任意）</label>
        <textarea id="reflection" rows={3} value={reflectionDraft} aria-describedby="reflection-count" onChange={(event) =>
          setReflectionDraft(Array.from(event.target.value).slice(0, reflectionLimit).join(''))}/>
        <p className="count" id="reflection-count">{Array.from(reflectionDraft).length} / {reflectionLimit}</p>
        {reflectionError && <p className="notice" role="alert">ひとことを保存できませんでした。</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={() => reflectionDialog.current?.close()}>
            {screen === 'challenges' ? '今は書かない' : 'キャンセル'}
          </button>
          <button type="submit" className="primary" disabled={!reflectionDraft.trim()}>保存する</button>
        </div>
      </form>
    </dialog>
    <dialog ref={dialog} onCancel={() => setConfirm(undefined)} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{confirm === 'delete' ? '記録を削除しますか？'
        : confirm === 'delete-reflection' ? 'ひとことを削除しますか？'
        : screen === 'edit' ? '変更を破棄しますか？' : '書きかけの内容を破棄しますか？'}</h2>
      {confirm === 'delete' && <p>この記録の花・視点・小さな挑戦{entry?.challenge?.reflection && '・挑戦後のひとこと'}も削除されます。</p>}
      <div className="dialog-actions">
        <button className="secondary" onClick={() => setConfirm(undefined)} autoFocus>キャンセル</button>
        <button className="primary" onClick={() => {
          if (confirm === 'delete') {
            if (commit((records) => records.filter((record) => record.id !== id))) go(origin);
          } else if (confirm === 'delete-reflection') {
            updateChallenge(id, { reflection: undefined });
          } else go(screen === 'edit' ? 'detail' : origin);
          setConfirm(undefined);
        }}>{confirm === 'discard' ? '破棄する' : '削除する'}</button>
      </div>
    </dialog>
  </div>;
}
