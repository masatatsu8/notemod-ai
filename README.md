# NoteMod AI

PDFスライドをAIで編集できるWebアプリケーション。

## 機能

- **PDFのインポート/エクスポート**: PDFファイルをアップロードし、編集後にPDFとして出力
- **AIによる画像編集**: 選択した領域に対して、テキストプロンプトで修正指示を出せる
- **ウォーターマーク削除**: 全ページから指定領域を一括で削除
- **タイトルページ生成**: AIでタイトルスライドを自動生成
- **バージョン履歴**: 各ページの編集履歴を保持し、いつでも戻せる
- **ワークスペース保存/読み込み**: 編集状態を`.nmw`ファイルとして保存・復元
- **認証機能**: 環境変数で簡易認証を有効化可能

## 必要条件

- Node.js 22+
- Gemini API Key

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env.local`を作成:

```bash
cp .env.example .env.local
```

`.env.local`を編集:

```env
GEMINI_API_KEY=your_api_key_here
VITE_AUTHENTICATION=false
VITE_APP_USERNAME=admin
VITE_APP_PASSWORD=password123
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## Dockerで実行

### ビルド&起動

```bash
docker compose --env-file .env.local up -d --build
```

### ポート指定

デフォルトは`3000`番ポート。変更する場合:

```bash
PORT=8080 docker compose --env-file .env.local up -d --build
```

### 停止

```bash
docker compose down
```

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド後のプレビュー |

## 技術スタック

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Google Gemini API
- PDF.js / jsPDF

## ライセンス

&copy; 2025 mastatsu8. All rights reserved.
