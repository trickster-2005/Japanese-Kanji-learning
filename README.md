# 漢字規律館 —— 用台語、粵語推日語音讀

以中古漢語為樞紐，透過「發音對應規律」，讓會台語或粵語的人推出日語漢字的音讀。
本站只做瀏覽、探索、查詢，**不含任何測驗、練習、計分或打卡功能**。

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # 產生 dist/，可直接部署到 GitHub Pages 或 Vercel
```

- Vite + React + TypeScript + Tailwind CSS v4
- 使用 `HashRouter`，`vite.config.ts` 的 `base: "./"`，部署到 GitHub Pages 子路徑不需另外設定
- 資料在 `src/data/*.json`，型別定義在 `src/types.ts`
- 外部字典連結模板集中在 `src/config/dictionaries.ts`

## 目前進度

- [x] 階段 1：專案骨架、路由、版面、`dictionaries.ts`、`<DictLinks>`、10 字示範資料
- [x] 階段 2：規律詳細頁對照表（可排序、例外標色）、40 字有出處的種子資料
- [ ] 階段 3：詞彙頁、聲符字族頁、全站點擊彈窗
- [ ] 階段 4：反查推測器、閱讀模式
- [ ] 階段 5：`/scripts` 資料擴充腳本

## 產生資料

原始資料放在 `/data`（不進 git），然後執行：

```bash
python -X utf8 scripts/fetch_wiktionary_readings.py   # 抓讀音層次，存到 data/wiktionary_readings.json（已抓過的字不會重抓）
python -X utf8 scripts/build_seed.py
```

會產生 `src/data/kanji.json`，並重新計算 `src/data/rules.json` 的例外字。
腳本直接讀壓縮檔，不需要先解壓縮。查不到的欄位一律留空，畫面上顯示「待確認」。

### 規律與例外怎麼判斷

- 聲母規律依**中古聲母**（廣韻音韻地位）判斷是否屬於該規律；「f 變 h」依粵語是否以 f 開頭。
- 韻尾規律依**中古韻**（舉平以賅上去入）與聲調判斷 -k／-t／-p／-m／-n／-ng。
- 「讀音層次」無法自動判斷，直接採用指定的例字。
- 只用 KANJIDIC2 收錄的音讀判斷；只見於 Wiktionary 的讀音（例如「学」的漢音かく）會以灰色顯示，但不列入判斷。
- 逐一檢查每個日語音讀：全部不符合 → **例外**（紅）；部分不符合 → **部分例外**（黃），並標出是哪個音讀。
- 例外原因只寫資料推得出的事實：不符合的讀音若屬於唐音、宋音或慣用音，就註明這一點；其餘寫「原因待確認」。

## 外部字典連結檢查（2026-11-18）

以「学」「学校」（日語字典）及「學」（粵語、台語字典）實際測試：

| 字典 | 單字連結 | 詞彙連結 | 備註 |
|---|---|---|---|
| Jisho | ✅ | ✅ | |
| Weblio | ✅ | ✅ | |
| コトバンク | ✅ | ✅ | 進入搜尋結果頁，不是直接進詞條 |
| Wiktionary（日） | ✅ | ✅ | 沒有詞條的詞會顯示「建立頁面」 |
| 粵典 words.hk | ✅（HTTP 200） | — | |
| 萌典（台語） | ✅ | — | `'` 前綴會進到台語辭典，已確認顯示文讀、白讀 |

## 資料來源與授權

| 資料 | 用途 | 檔案 | 授權 |
|---|---|---|---|
| KANJIDIC2（EDRDG） | 日語音讀、訓讀、常用漢字、舊制 JLPT、英文釋義、新舊字體對應 | `kanjidic2.xml.gz`（檔頭版本 2020-250） | CC BY-SA 4.0 |
| Unicode unihan-database | 粵語 kCantonese | `unihan-database-main.zip` | Unicode License V3 |
| 教育部《臺灣台語常用詞辭典》開放資料 | 台語文讀、白讀（工作表「名」） | `kautian.ods` | **待確認**（請以辭典網站公告為準） |
| nk2028 tshet-uinh-data | 中古音（`韻書/廣韻.csv`） | `tshet-uinh-data-main.zip` | CC0 1.0 |
| English Wiktionary | 吳音／漢音／唐音／宋音／慣用音標記（`{{ja-readings}}` 模板） | 由 `fetch_wiktionary_readings.py` 透過 API 取得 | CC BY-SA 4.0 |

注意事項：
- `unihan-database` 是 Unicode 給專家審閱草案用的 GitHub 倉庫，不是正式發布版。階段 5 建議改用正式的 `Unihan.zip`。
- KANJIDIC2 的 `jlpt` 是 2010 年以前的舊制 1–4 級，不是新制 N1–N5。
- KANJIDIC2 沒有吳音／漢音標記，所以改用 Wiktionary。Wiktionary 是社群編輯，各字頁面的出處附有固定版本（oldid）連結。
- 台語辭典工作表「名」中，標記為其他字書來源（甘、晉、彙等）的讀音目前略過。
- 衍生的 `src/data/*.json` 含 KANJIDIC2 與 Wiktionary 資料，依 CC BY-SA 4.0 須標示出處並以相同授權釋出。
