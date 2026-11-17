# 『ころんでも。』の作業ガイド

## 仕様と判断

- 実装や変更の前に [SPEC.md](SPEC.md) を読む。ユーザーと合意した仕様変更は同ファイルにも反映する。
- 画面や見た目を実装・変更する前に [DESIGN.md](DESIGN.md) を読み、確定したデザインに沿って作業する。ユーザーと合意したデザイン変更は同ファイルにも反映する。
- 仕様に書かれていない文言や余白などの細部は、既存の仕様とUIに沿って判断する。
- 保存、外部送信、削除、画面遷移の仕様を変える必要がある場合は、その変更を実装する前にユーザーに確認する。

## 記録とAPIキー

- GeminiのAPIキーはサーバー側で管理する。ブラウザに配信するコードや設定に含めない。
- 出来事の本文と気持ちタグは運用ログに記録しない。

## 変更後の確認

- 保存やGemini連携を変更したら、通常時とGeminiの応答失敗時の両方で、記録が保存され、1件につき花が一輪咲くことを確認する。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
