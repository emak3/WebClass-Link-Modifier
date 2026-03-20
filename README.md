## WebClass Link Modifier

[![version](https://img.shields.io/badge/version-3.4.4-blue.svg)](#)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web_Store-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/webclass-link-modifier/hfplabckhfelpkdknbjhaoddmnojgici)

WebClassサイトのリンクの開き方を、用途に合わせてカスタマイズできるブラウザ拡張機能です。

---

## 機能（できること）
- リンクタイプごとに開き方を設定（同じタブ / 別タブ / サブウィンドウ）
- メールボックス用の挙動（ウィンドウサイズ指定）
- PDF/Office/ZIP等のファイルを別タブで開く
- 添付資料リンクを専用ウィンドウで開く
- 複数ドメイン対応（登録ドメインに対して動作）

---

## 対応ブラウザ
- Google Chrome（推奨）
- Microsoft Edge（Chromium）

---

## インストール

### Chrome Web Store（推奨）
1. Chrome Web Storeリンクを開く
2. 「Chromeに追加」をクリック
3. 確認ダイアログで「拡張機能を追加」

### 手動インストール（開発版など）
ブラウザの拡張機能ページから「パッケージ化されていない拡張機能を読み込む／展開して読み込む」を行い、`WebClass Link Modifier` フォルダを選択してください。

---

## 初期設定（最初に必ずやる）

1. 拡張機能のオプション画面を開く  
   - Edge/Chromeの拡張機能メニューからでも、WebClass画面の設定ボタンからでも可能です。
2. 「対象ドメイン」を追加  
   - `http://` や `https://` は不要です（例: `lms.example.ac.jp`）。
   - **最低1つのドメイン**が必要です。
3. 「リンクの開き方（個別設定）」を選ぶ  
   - リンクタイプ（メール/ファイル/添付/外部/授業/WebClassログイン/お知らせ）ごとに、挙動を選択できます。
4. 「設定を保存」→ 対象ページを再読み込み  
   - 設定反映にはページの再読み込みが必要です。

---

## ウィンドウサイズ設定

「サブウィンドウ」など、ウィンドウを開く挙動にしたときにサイズを指定できます。

- プリセット比率：`16:9` / `4:3` / `1:1`
- カスタム：幅・高さをpxで指定
- 比率を維持：片方を変更したときにもう片方を自動計算

---

## 注意事項
- 権限（host permissions）は、登録したドメインでのみ拡張が動作するために必要です。
- ドメイン入力時は `http://` / `https://` 不要です。
- 設定変更後は必ず対象ページを再読み込みしてください。

---

## よくある質問（FAQ）

### Q. 設定したのに動かない
対象ページを再読み込みしてください。それでもダメな場合は、登録ドメインが入力済みであるか確認してください。

### Q. どのリンクが対象？
ページ内のリンク/フォーム/クリック/要素属性/URLパターンから、拡張側のルールで分類して処理します。

---

## フィードバック・お問い合わせ
問題や要望がありましたら、GitHubの `Issues` を作成するか、`wc-contact@ouma3.org` までメールしてください。

Made with for better WebClass experience