import type { Metadata } from 'next';
import './style.css';

export const metadata: Metadata = {
  title: 'ころんでも。',
  description: 'できごとを振り返り、次の小さな挑戦へ。',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
