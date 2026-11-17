# ころんでも。

**気持ちが動いたできごとを振り返り、次の小さな一歩を考えるアプリです。**

できごとを記録すると、猫だるまがころんで起き上がり、庭に花が一輪咲きます。Geminiが提案する3つの視点から、しっくりくるものを選ぶと、その視点に合った問いが表示されます。問いをヒントに、次に試したいことを自分の言葉で残せます。

## できること

- **できごとを記録する**。本文は140文字まで。気持ちタグは任意で最大3つ選べます。書くだけでも庭に花が咲きます。
- **小さな挑戦を考える**。視点を選んだり、次の一歩を書いたりするかは自分で決められます。
- **試したことを振り返る**。「やってみて気づいたこと」を任意で残せます。庭の花を開くと、元のできごとから挑戦後のひとことまで読み返せます。
- **庭のねこを選ぶ**。さくら猫、黒猫、三毛猫、シャム猫の4匹から選べます。

## ローカルで動かす

Node.js 20.9以上とnpmを使います。

```sh
git clone https://github.com/aoi0108/korondemo-app.git
cd korondemo-app
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。環境変数を設定する前でも、できごとの記録と開花を試せます。視点の生成には次の設定が必要です。

### Geminiによる視点の生成を有効にする

```sh
cp .env.example .env.local
```

| 環境変数 | 設定する値 |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studioで取得したGemini APIキー |
| `GEMINI_MODEL` | 利用するGeminiモデルのID |
| `UPSTASH_REDIS_REST_URL` | Upstash RedisのREST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash RedisのRESTトークン |
| `GEMINI_REQUESTS_PER_MINUTE` | アプリ全体の毎分上限。既定値は2、設定範囲は1〜2 |
| `GEMINI_REQUESTS_PER_DAY` | アプリ全体の日次上限。既定値は10、設定範囲は1〜10 |

設定後は開発サーバーを再起動してください。公開環境では同じ値をサーバー側の環境変数に設定します。APIキーとトークンはリポジトリにコミットしないでください。公開前に、実際に利用するモデルとプロジェクトの割り当てを [Google AI Studio](https://aistudio.google.com/rate-limit) で確認し、アプリ側の上限を調整してください。

## 記録の保存と外部送信

- 記録はログインなしで、利用中のブラウザのローカルストレージに保存されます。端末やブラウザ間の同期はありません。
- 視点を生成するとき、できごとの本文と選んだ気持ちタグをGeminiに送信します。小さな挑戦と挑戦後のひとことはブラウザ内に保存されます。
- 視点を生成できない場合も、記録は保存され、庭に花が一輪咲きます。視点の生成は記録詳細から再試行できます。

## 開発

Next.js（App Router）、React、TypeScriptを使用しています。Upstash RedisはGeminiの呼び出し回数の管理に使います。

```sh
npm run typecheck
npm run build
```

- [仕様](SPEC.md)
- [デザイン](DESIGN.md)
- [技術構成](TECH_STACK.md)
