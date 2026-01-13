起動はここから→https://o93-3.github.io/travel-map/

※保存は各PCに保存されます。verUP後などはキャッシュ等消さないと反映されない場合があります。
UIが戻らない等があれば、右クリック「最新の状態に更新」や、下記のキャッシュ削除手順を試してください。

---

# Travel Map（旅行ルート可視化マップ）
旅行で訪れた都市を 地図上のルート（線）＋マーカーで記録し、現在地（最後に追加した都市）を強調表示するWebアプリです。
都市データ（cities.json / cities-ATS.json）を読み込み、検索→追加の流れでルートを作れます。

## 重要：ルート追加の「地域」について（2026-01-13 更新）
ルート追加の階層は **地域 → 国 →（州）→ 都市** です。
- **地域 = 都市データの `region`**（Europe / Asia / North America / …）で分類します。
- ETS2/ATSの切替ではありません（データ上は cities.json と cities-ATS.json を両方読み込みます）。
- 州（state）が存在する国では、州セレクトが自動で表示されます。

## 主な機能
1) 地図表示・地図スタイル切替（Leaflet）
2) 国境色分け（GeoJSON）ON/OFF
3) ルート作成（追加・ひとつ戻す）
4) 都市検索（検索欄＋候補リスト）
5) 現在地表示（テロップ＋脈動マーカー）
6) 見た目のカスタマイズ（色・サイズ）
7) UI（折り畳み＋スクロール）
8) 配信モード（UI非表示など）
9) 現在地テロップのドラッグ移動
10) 別タブ同期（storageイベント）

## 操作手順（基本）
1. 検索欄に都市名/国名を入力 → 候補が出ます
2. 候補をクリック（または ↑/↓ + Enter）→ 自動で追加され、ルート線が伸びます
3. 間違えたら「ひとつ戻す」で直近を取り消します

## データと保存先
### ローカル保存（localStorage）
- ルート履歴：travelHistory
- 地図スタイル：mapStyle
- 国境表示ON/OFF：bordersOn
- ルート線の色：lineColor
- 現在地/過去マーカー色：currentColor, pastColor
- 現在地マーカーサイズ：curSize
- 現在地テロップ設定：locFontSize, locFlagSize, locPadding
- テロップ位置：locUI
- ルート追加「地域」：cityRegion

### 必要ファイル
index.html, style.css, app.js
cities.json, cities-ATS.json
countries.geojson（国境）

## トラブルシューティング
### 地図が真っ白／候補が出ない
app.js が途中でエラー停止すると、地図初期化やイベントが動きません。ブラウザの Console を確認してください。

### 更新が反映されない（キャッシュ / Service Worker）
Service Worker（sw.js）のキャッシュで古いファイルが返ることがあります。
- まず Ctrl+F5（強制更新）
- 直らない場合：DevTools → Application → Service Workers → Unregister
- さらに：DevTools → Application → Clear storage → Clear site data

---

## 変更履歴
- 2026-01-13: ルート追加の「地域」を citiesデータの region で分類（地域→国→（州）→都市）。Service Worker キャッシュ名更新。 
