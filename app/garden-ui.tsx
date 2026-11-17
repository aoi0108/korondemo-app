import Image from 'next/image';
import catDaruma from './cat-daruma.png';
import blackDaruma from './cat-black.webp';
import calicoDaruma from './cat-calico.webp';
import siameseDaruma from './cat-siamese.webp';
import { ivory, type Tag } from './model';

export const cats = [
  { id: 'sakura', name: 'さくら猫', art: catDaruma, note: '書けるところからでいいにゃ。' },
  { id: 'black', name: '黒猫', art: blackDaruma, note: 'ここで待ってたにゃ。' },
  { id: 'calico', name: '三毛猫', art: calicoDaruma, note: 'また会えたにゃ。' },
  { id: 'siamese', name: 'シャム猫', art: siameseDaruma, note: 'ゆっくり聞かせてにゃ。' },
] as const;
export type GardenCat = (typeof cats)[number];

export const monthKey = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0')].join('-');

export function MonthSwitcher({ month, onChange, label }: { month: string; onChange: (month: string) => void; label: string }) {
  function moveMonth(offset: number) {
    if (!month) return;
    const [year, selectedMonth] = month.split('-').map(Number);
    onChange(monthKey(new Date(year, selectedMonth - 1 + offset, 1)));
  }

  return <div className="switcher" role="group" aria-label={label + 'の月切り替え'}>
    <button className="round" aria-label="前月" onClick={() => moveMonth(-1)}>‹</button>
    <input type="month" aria-label={label + 'の年月'} value={month} onChange={(event) => event.target.value && onChange(event.target.value)}/>
    <button className="round" aria-label="翌月" onClick={() => moveMonth(1)}>›</button>
  </div>;
}

export function Daruma({ cat, sizes = '110px' }: { cat: GardenCat; sizes?: string }) {
  return <div className="mascot" aria-hidden="true">
    <Image className="daruma-art" src={cat.art} alt="" sizes={sizes}/>
  </div>;
}

export function Paw() {
  return <span className="paw" aria-hidden="true"><i/><i/><i/><i/></span>;
}

export function Fish() {
  return <span className="fish" aria-hidden="true"/>;
}

export function Flower({ tags }: { tags: Tag[] }) {
  const colors = tags.length ? tags.map((tag) => tag.color) : [ivory];
  return <span className="flower" aria-hidden="true">
    {Array.from({ length: 5 }, (_, index) => (
      <i key={index} style={{ background: colors[index % colors.length], transform: 'rotate(' + index * 72 + 'deg) translateY(-36%)' }}/>
    ))}
    <b/>
  </span>;
}
