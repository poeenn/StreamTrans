# StreamTrans (配信字幕くん) 🎙️✨

> **OBS対応 リアルタイムAI翻訳字幕オーバーレイツール**  
> 配信者の音声をリアルタイムで高精度に音声認識＆翻訳し、OBS Studio上に背景透過で美しく表示します。

[![URL](https://img.shields.io/badge/Web%20App-streamtrans.pages.dev-blue?style=for-the-badge&logo=cloudflare-pages)](https://streamtrans.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#)
[![OBS Ready](https://img.shields.io/badge/OBS%20Studio-Overlay%20Ready-purple?style=for-the-badge)](#obs-browser-sourceの設定手順)

---

## 🌟 主な特徴

1. **完全無料・アカウント登録不要**
   - ブラウザを開くだけですぐに使用可能。APIキーの取得や課金・サブスクリプション登録は一切不要です。
2. **Chrome内蔵AI（Built-in AI）による完全ローカル超高速翻訳**
   - 最新のChrome Translator APIに対応。PC内のオンデバイスAI（Gemini Nano / 内蔵モデル）で動作するため、**外部サーバーへの音声・テキスト送信ゼロ**＆**遅延最小**を実現。
   - ※ 内蔵AI非対応環境向けに「クラウド自動翻訳（予備）」へのワンクリック切り替えもサポート。
3. **OBS Studio 透過オーバーレイ対応**
   - オーバーレイ専用URL（`/overlay`）をOBSのブラウザソースに追加するだけで、背景が自動的に完全透過された字幕を配置可能。
4. **ブラウザ間リアルタイム同期（BroadcastChannel）**
   - コントロール画面とOBSオーバーレイ画面はローカル通信で即座に同期。文字色・フォントサイズ・縁取り（境界線）・表示秒数などのデザイン調整がリアルタイムに反映されます。
5. **多言語対応**
   - 日本語、英語、韓国語、中国語などの音声入力および相互翻訳に対応。海外リスナーとの円滑なコミュニケーションをアシストします。

---

## 🚀 公開URL

- **コントロールパネル（操作画面）**:  
  👉 [https://streamtrans.pages.dev/](https://streamtrans.pages.dev/)
- **OBSオーバーレイ（字幕表示用）**:  
  👉 [https://streamtrans.pages.dev/overlay](https://streamtrans.pages.dev/overlay)

---

## 📺 OBSブラウザソースの設定手順

OBS Studio に字幕を表示する手順はわずか数ステップです。

### 1. オーバーレイURLを取得
コントロール画面（`https://streamtrans.pages.dev/`）の「**URLをコピー**」ボタンを押すか、以下のURLをコピーします：
```
https://streamtrans.pages.dev/overlay
```

### 2. OBSに「ブラウザ」ソースを追加
1. OBS Studio を起動し、「**ソース**」パネル左下の「**＋**」ボタンをクリック。
2. 一覧から「**ブラウザ**」を選択。
3. 新規作成で分かりやすい名前（例: `AI翻訳字幕`）を入力して「OK」をクリック。

### 3. ブラウザソースのプロパティ設定
| 項目 | 設定値 | 備考 |
|---|---|---|
| **URL** | `https://streamtrans.pages.dev/overlay` | コピーしたURLを入力 |
| **幅 (Width)** | `1920` | 配信解像度に合わせて調整 |
| **高さ (Height)** | `300` | 字幕エリアの高さ |
| **カスタムCSS** | デフォルトのままでOK | 背景は自動的に透過されます |
| **表示されていないときにソースをシャットダウン** | チェックなし（推奨） | 安定同期のため |

### 4. 位置調整＆動作確認
1. コントロール画面（`https://streamtrans.pages.dev/`）で「**認識開始**」ボタンをクリックし、マイクに向かって話します。
2. OBS上のプレビュー画面にリアルタイムで原文と翻訳字幕が表示されることを確認します。
3. OBSプレビュー上で赤枠をドラッグし、画面下部など見やすい位置へ移動します。

> **💡 ヒント**: OBSの「ドック」>「カスタムブラウザドック」に `https://streamtrans.pages.dev/` を登録すると、OBSの画面内から直接マイクの開始/停止や言語切替が行えて便利です！

---

## 🤖 Chrome内蔵AI（Built-in AI）の利用条件・有効化

StreamTrans は Google Chrome が提供する試験機能 **Translator API (Gemini Nano / Built-in AI)** を優先的に使用します。

### 利用条件
- **ブラウザ**: Google Chrome 138 以降（Dev / Canary / または最新Stable）
- **空きストレージ**: 2GB以上（初回翻訳モデルダウンロード用）
- **GPU / VRAM**: 4GB以上のGPU搭載PC推奨

### 有効化手順（フラグ設定）
もしコントロール画面のステータスが「利用不可」と表示される場合は、Chromeの設定を変更することで有効化できます：

1. Chromeのアドレスバーに以下を入力してEnter：
   ```text
   chrome://flags/#translation-api
   ```
   または
   ```text
   chrome://flags/#prompt-api-for-gemini-nano
   ```
2. 設定項目を「**Enabled**」に変更。
3. Chrome右下に表示される「**Relaunch（再起動）**」をクリック。
4. StreamTrans を再読み込みすると、初回の翻訳実行時にモデルの自動ダウンロード（進行状況バー表示）が開始されます。

> **⚠️ 内蔵AIが使えない環境の場合**:  
> コントロール画面の翻訳エンジンを「**クラウド自動翻訳 (予備)**」に切り替えるだけで、設定不要で即座にご利用いただけます。

---

## 🛠️ ローカル開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/poeenn/trans.git
cd trans

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

起動後、`http://localhost:5173/` にアクセスしてください。

### ビルド
```bash
npm run build
```
`dist/` ディレクトリに本番用静的ファイルが出力されます。

---

## 🛡️ プライバシーとセキュリティ

- 音声データはブラウザの Web Speech API により処理されます。
- Chrome内蔵AI利用時は、翻訳処理もすべて端末内のローカルGPU/CPUで完結し、外部サーバーへテキストが送信されることはありません。
