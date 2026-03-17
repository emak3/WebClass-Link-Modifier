/* ================================================================
   config.js — WebClass Link Modifier 中央設定ファイル v2
   ================================================================
   [編集ガイド]
   ・デフォルト動作 → defaults.behaviors / defaults.windowSizes
   ・URLパターン追加 → linkRules に { type, test(url, el, ctx) } を追加
   ・動作制限追加   → restrictions に { forbidden[], fallback } を追加

   [test 関数のシグネチャ]
     test(url: string, element: Element|null, ctx: Context): boolean

   [Context オブジェクト]
     ctx.currentUrl    : window.location.href
     ctx.currentHost   : window.location.hostname
     ctx.targetDomains : string[]  — ユーザーが登録したドメイン一覧
     ctx.isExternal    : (url: string) => boolean  — 外部リンク判定ヘルパー
   ================================================================ */
'use strict';

var WC_CONFIG = {

  /* ── バージョン ─────────────────────────────────────────── */

  //  version: '3.4.1',

  /* ── デフォルト値 ───────────────────────────────────────── */
  defaults: {
    domains: ['lms.salesio-sp.ac.jp'],

    behaviors: {
      linkBehavior: 'sameTab',
      mailBehavior: 'newWindow',
      fileBehavior: 'newTab',
      webclassBehavior: 'sameTab',
      attachmentBehavior: 'newWindow',
      externalLinkBehavior: 'newTab',
      informationsBehavior: 'newTab',
    },

    // プレフィックス名は <prefix>WindowSize という storage キーに対応
    windowSizes: {
      mail: { width: 800, height: 600, ratio: '4:3' },
      file: { width: 1200, height: 900, ratio: '4:3' },
      attachment: { width: 500, height: 500, ratio: '1:1' },
      link: { width: 800, height: 600, ratio: '4:3' },
      webclass: { width: 1600, height: 898, ratio: '16:9' },
      externalLink: { width: 1200, height: 900, ratio: '4:3' },
      informations: { width: 1200, height: 900, ratio: '4:3' },
    },
  },

  /* ── 動作制限 ───────────────────────────────────────────── */
  // forbidden に含まれる behavior が選択された場合 fallback に差し替える
  restrictions: {
    fileBehavior: { forbidden: ['sameTab'], fallback: 'newTab' },
    attachmentBehavior: { forbidden: ['sameTab'], fallback: 'newWindow' },
  },

  /* ── リンク種別判定ルール ───────────────────────────────── */
  // ルールは上から順に評価し、最初に test() が true を返したタイプを採用する。
  //
  // 各ルールのプロパティ：
  //   type : string            — リンク種別 ID（behavior/windowSize のキーと対応）
  //   test : (url, el, ctx) => boolean
  //          url  : string        リンク先 URL（空文字の場合あり）
  //          el   : Element|null  <a> や <form> などの DOM 要素（ない場合は null）
  //          ctx  : {
  //            currentUrl    : string    — window.location.href
  //            currentHost   : string    — window.location.hostname
  //            targetDomains : string[]  — 登録済みドメイン一覧
  //            isExternal    : (url: string) => boolean
  //          }
  //
  // ※ test() が例外を投げた場合はそのルールをスキップして次に進む。
  linkRules: [

    /* ── 1. 授業リンク（course.php/.../login）── 最優先 ── */
    {
      type: 'course',
      test: function (url) {
        return /course\.php\/.+\/login/.test(url);
      },
    },

    /* ── 2. お知らせ（informations.php）
            現在表示中の informations.php からのリンクは除外（ループ回避）
            page パラメータ付きや action=show のリンクも除外              ── */
    {
      type: 'information',
      test: function (url, _el, ctx) {
        if (!url) return false;
        if (ctx.currentUrl.includes('informations.php')) return false;
        if (!url.includes('informations.php')) return false;
        try {
          var p = new URL(url);
          return (
            p.pathname.includes('informations.php') &&
            !p.searchParams.has('page') &&
            p.searchParams.get('action') !== 'show' &&
            (p.search !== '' || p.pathname.includes('/show'))
          );
        } catch (e) {
          return false;
        }
      },
    },

    /* ── 3. 添付ファイル（URL ベース）── */
    {
      type: 'attachment',
      test: function (url) {
        return /file_down\.php|download|attach/i.test(url);
      },
    },

    /* ── 4. WebClass ログイン画面
            ・URL が /webclass/login.php を含む、かつ
            ・要素がある場合 → .buttonLabel が "»" で始まる場合のみ一致
            ・要素がない場合（window.open 経由など）→ 無条件一致              ── */
    {
      type: 'webclass',
      test: function (url, el) {
        if (!url || !url.includes('/webclass/login.php')) return false;
        if (!el) return true;
        var labelEl = el.querySelector('.buttonLabel');
        return !!(labelEl && labelEl.textContent.trim().startsWith('»'));
      },
    },

    /* ── 5. メールエディタ（msg_editor.php）
            現在表示中の msg_editor.php からのリンクは除外（ループ回避） ── */
    {
      type: 'mail',
      test: function (url, _el, ctx) {
        if (!url) return false;
        if (ctx.currentUrl.includes('msg_editor.php')) return false;
        return url.includes('msg_editor.php');
      },
    },

    /* ── 6. ファイル拡張子（PDF / Office / アーカイブ）── */
    {
      type: 'file',
      test: function (url) {
        return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(url);
      },
    },

    /* ── 7. 外部リンク（登録ドメイン外の http(s):// URL）── */
    {
      type: 'external',
      test: function (url, _el, ctx) {
        return ctx.isExternal(url);
      },
    },

    /* ── 8. 要素ベース：target="msgeditor" ── */
    {
      type: 'mail',
      test: function (_url, el) {
        return !!(el && el.getAttribute('target') === 'msgeditor');
      },
    },

    /* ── 9. 要素ベース：onclick に filedownload が含まれる ── */
    {
      type: 'attachment',
      test: function (_url, el) {
        if (!el) return false;
        return (el.getAttribute('onclick') || '').includes('filedownload');
      },
    },

    /* ── 10. 要素ベース：添付ファイルアイコン画像 ── */
    {
      type: 'attachment',
      test: function (_url, el) {
        if (!el) return false;
        return !!(el.querySelector('img.attach_file') ||
          el.querySelector('img[alt*="添付"]') ||
          el.querySelector('img[src*="attach"]'));
      },
    },

    /* ── 11. 要素ベース：テキストに「添付」を含む ── */
    {
      type: 'attachment',
      test: function (_url, el) {
        if (!el) return false;
        return (el.textContent || '').includes('添付');
      },
    },

    /* ── ここに新しいルールを追加 ────────────────────────────
    {
      type: 'example',
      test: function (url, el, ctx) {
        return url.includes('example.ac.jp/something');
      },
    },
    ────────────────────────────────────────────────────────── */
  ],

  /* ── リンク種別 → behavior キー / windowSize キーのマッピング ─
     新しい種別を linkRules に追加した場合はここにも追加してください。  */
  typeMap: {
    mail: { behaviorKey: 'mailBehavior', sizeKey: 'mail' },
    file: { behaviorKey: 'fileBehavior', sizeKey: 'file' },
    attachment: { behaviorKey: 'attachmentBehavior', sizeKey: 'attachment' },
    webclass: { behaviorKey: 'webclassBehavior', sizeKey: 'webclass' },
    external: { behaviorKey: 'externalLinkBehavior', sizeKey: 'externalLink' },
    course: { behaviorKey: 'linkBehavior', sizeKey: 'link' },
    information: { behaviorKey: 'informationsBehavior', sizeKey: 'informations' },
  },
};