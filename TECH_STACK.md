# 『ころんでも。』技術スタック

アプリの動作は [SPEC.md](SPEC.md)、実装時の作業方針は [AGENTS.md](AGENTS.md) を参照する。この文書には、採用する技術と公開前の技術確認を記録する。

## 既存仕様からの要件

- ログインなしで記録をブラウザに保存する。Geminiが応答できない場合も、保存と開花が完了する。
- GeminiのAPIキーはサーバー側で管理する。出来事の本文や気持ちタグは運用ログに残さない。
- Geminiの利用回数は全利用者で共有する。公開前に対象モデルの無料枠を確認し、SPEC.mdの初期値を必要に応じて調整する。
- MVPは無料枠で運用し、デプロイナウへの公開を前提に構成を検討する。

## 第1ラウンドの確定事項

- **画面とGemini連携**　Next.jsとTypeScriptを採用する。画面とGeminiを呼び出すサーバー側の処理を同じアプリに置き、デプロイナウでstandalone構成として公開する。
- **ブラウザ内の保存**　localStorageを採用する。記録、花、視点、小さな挑戦を利用中のブラウザに保存する。
- **Geminiの利用回数**　全利用者で共有する上限を管理するため、無料枠のある外部サービスを利用してよい。外部サービスに保存するのは利用回数や集計時刻など、上限管理に必要なデータに限る。

## 第2ラウンドの確定事項

- **共有ストア**　Geminiの全体利用回数の管理に Upstash Redis の無料プランを採用する。Next.jsのサーバー側からHTTPSで接続する。
- **保存するデータ**　全体の呼び出し回数と集計時刻など、上限管理に必要なデータに限る。

## 公開前に確認すること

- デプロイナウでサーバー側の環境変数を読み取り、Geminiと利用回数の共有ストアに接続できること。
- サーバーの再起動や複数の同時リクエストがあっても、アプリ全体の呼び出し上限を守れること。

## 参照資料

- [デプロイナウ公式のNext.js公開手順](https://deploy.lolipop.jp/docs/frameworks/nextjs)
- [デプロイナウ公式のプラン・環境変数案内](https://lolipop.jp/deploy-now/)
- [Gemini API公式の利用上限](https://ai.google.dev/gemini-api/docs/rate-limits?hl=ja)
- [Upstash Redisの無料プラン](https://upstash.com/pricing/redis)
- [Upstash RedisのREST API](https://upstash.com/docs/redis/features/restapi)
