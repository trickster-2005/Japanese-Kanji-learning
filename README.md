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

## 部署（GitHub Pages）

推到 `main` 後，`.github/workflows/deploy.yml` 會自動建置並部署到 GitHub Pages。
第一次需要到 repo 的 **Settings → Pages → Build and deployment → Source** 選「**GitHub Actions**」。

網址：https://trickster-2005.github.io/Japanese-Kanji-learning/

## 目前進度

- [x] 階段 1：專案骨架、路由、版面、`dictionaries.ts`、`<DictLinks>`、10 字示範資料
- [x] 階段 2：規律詳細頁對照表（可排序、例外標色）、40 字有出處的種子資料
- [x] 階段 3：詞彙頁（依類型篩選）、聲符字族頁、點擊互動（漢字點了直接到單字頁；詞彙沒有獨立頁面，點了開彈窗）
- [x] 階段 4：反查推測器、閱讀模式
- [x] 階段 5：資料擴充到常用漢字 2,136 字、JMdict 常用詞 3,000 個

## 產生資料

原始資料放在 `/data`（不進 git）：`kanjidic2.xml.gz`、`JMdict_e.gz`、`Unihan.zip`、`kautian.ods`、`tshet-uinh-data-main.zip`、`cjkvi-ids-master.zip`。然後執行：

```bash
python -X utf8 scripts/build_data.py                  # 先產生字表（約 20 秒）
python -X utf8 scripts/fetch_wiktionary_readings.py   # 抓讀音層次，存到 data/wiktionary_readings.json（已抓過的字不會重抓，中斷可續抓）
python -X utf8 scripts/build_data.py                  # 再跑一次，把讀音層次填進去
```

`--seed-only` 只處理規律例字與字族（開發時較快）。每次執行會把完整明細與警告寫到 `data/build_report.txt`。

會產生 `src/data/kanji.json`、`words.json`、`series.json`、`meta.json`（資料來源說明），並重新計算 `rules.json` 的例外字。
資料裡的出處用短代碼（例如 `jmdict:1206730`、`guangyun:1,55`），網頁由 `src/lib/sources.ts` 依 `meta.json` 展開成完整說明。

### 收錄範圍

- **漢字**：KANJIDIC2 的常用漢字（grade 1–8）共 2,136 字，加上規律例字與聲符字族。
- **新字體 → 繁體**：新字體本身在台語辭典查得到就沿用（例如「台」）；否則依序用 Unihan 的 `kJapaneseOldVariant`、`kTraditionalVariant`、`kZVariant`、`kSemanticVariant`，再用 KANJIDIC2 的 variant 欄位，取台語辭典或廣韻查得到的字形。有多個候選時（例如「弁」）記在 `notes`。
- **聲符字族**（`scripts/phonetic_series.py`）：讀 IDS 取每個字最上層的部件，去掉 KANJIDIC2 標的部首（形旁），剩下的部件若是收錄的字就當聲旁候選；至少 2 個成員和聲旁同音（不分清濁）才收錄。目前 114 組。
- **詞彙**：`scripts/words_source.json` 的人工詞彙，加上 JMdict 中「2–4 個字、全部是常用漢字、有常用標記（news1／ichi1／spec1／spec2）」的詞，依頻率（nf 排名）取前 3,000 個，類型標為「常用詞（未分類）」。這些詞的意思是否和中文相同沒有人工確認，網頁上顯示英文釋義。

人工編輯的內容放在兩個檔案，**裡面只有字形、分類與中文說明，不寫任何讀音**：
- `scripts/words_source.json`：詞彙清單、類型（免學／假朋友／和製漢語／台日共有／古義保留）、中文意思與說明
- `scripts/series_source.json`：人工指定的聲符字族（會取代同一聲符的自動結果）；共同音讀由腳本依 KANJIDIC2 計算
腳本直接讀壓縮檔，不需要先解壓縮。查不到的欄位一律留空，畫面上顯示「待確認」。

### 規律與例外怎麼判斷

- 聲母規律依**中古聲母**（廣韻音韻地位）判斷是否屬於該規律；「f 變 h」依粵語是否以 f 開頭。
- 韻尾規律依**中古韻**（舉平以賅上去入）與聲調判斷 -k／-t／-p／-m／-n／-ng。
- 「讀音層次」：指定的例字（明、行、人），加上同時有「只屬吳音」和「只屬漢音」音讀的字。
- 「知母變 ch」的例外若日語讀 t／d，原因寫明這一點（並註明台語是否同樣是 t）。
- 只用 KANJIDIC2 收錄的音讀判斷；只見於 Wiktionary 的讀音（例如「学」的漢音かく）會以灰色顯示，但不列入判斷。
- 逐一檢查每個日語音讀：全部不符合 → **例外**（紅）；部分不符合 → **部分例外**（黃），並標出是哪個音讀。
- 例外原因只寫資料推得出的事實：不符合的讀音若屬於唐音、宋音或慣用音，就註明這一點；其餘寫「原因待確認」。

## 朗讀（TTS）

詞彙、單字頁的音讀旁有喇叭按鈕，用瀏覽器內建的語音合成（Web Speech API）朗讀，不連外部服務。

- 念的是資料檔裡的**假名讀音**（例如「学校」念 がっこう），不是讓語音引擎自己猜漢字讀法。
- 閱讀模式另有「朗讀全文」，那是直接念原文，漢字讀法由裝置判斷，頁面上已註明可能念錯。
- 裝置沒有日語語音時按鈕會變灰並提示安裝；瀏覽器不支援語音合成時不顯示按鈕。
- 設定頁可以關掉「顯示朗讀按鈕」，所有喇叭和「朗讀全文」都會隱藏。

## 外部字典連結檢查（2026-11-18）

以「学」「学校」（日語字典）及「學」（粵語、台語字典）實際測試：

| 字典 | 單字連結 | 詞彙連結 | 備註 |
|---|---|---|---|
| JapanDict（預設） | ✅ | ✅ | 單字進漢字頁，詞彙進搜尋結果頁 |
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
| Unicode Unihan（正式版） | 粵語 kCantonese、華語 kMandarin、異體字（新字體 → 繁體） | `Unihan.zip`（Unihan_Readings.txt 日期 2026-07-31） | Unicode License V3 |
| JMdict（EDRDG） | 詞彙讀音、英文釋義 | `JMdict_e.gz`（2026-11-18） | CC BY-SA 4.0 |
| 教育部《臺灣台語常用詞辭典》開放資料 | 台語單字文讀、白讀（工作表「名」）、詞彙讀音（工作表「詞目」） | `kautian.ods` | **待確認**（請以辭典網站公告為準） |
| nk2028 tshet-uinh-data | 中古音（`韻書/廣韻.csv`） | `tshet-uinh-data-main.zip` | CC0 1.0 |
| CJKVI IDS（`ids.txt`，源自 CHISE IDS） | 漢字結構，自動找聲符字族 | `cjkvi-ids-master.zip` | GPLv2（依 CHISE 條款） |
| English Wiktionary | 吳音／漢音／唐音／宋音／慣用音標記（`{{ja-readings}}` 模板） | 由 `fetch_wiktionary_readings.py` 透過 API 取得 | CC BY-SA 4.0 |

注意事項：
- 早期用過的 `unihan-database-main.zip`（Unicode 審閱草案倉庫）已改為正式版 `Unihan.zip`，不再使用。
- KANJIDIC2 的 `jlpt` 是 2010 年以前的舊制 1–4 級，不是新制 N1–N5。
- KANJIDIC2 沒有吳音／漢音標記，所以改用 Wiktionary。Wiktionary 是社群編輯，各字頁面的出處附有固定版本（oldid）連結。
- 台語辭典工作表「名」的「類型」欄若是其他字書代號（甘、晉、彙…），讀音一樣收錄為「未標文白」，出處會註明代號；大寫開頭的專有名詞讀音略過。
- 台語辭典「九」標為文讀 káu、白讀 kiú，和一般說法相反；本站照原資料呈現，未修改。
- 網站頁尾連到設定頁的「資料來源與授權」，列出所有來源與授權，符合 CC BY-SA 的標示要求。
- `src/data/series.json` 的分組由 CHISE IDS（GPLv2）衍生；若要以其他授權釋出整個網站，請先確認相容性。
- 衍生的 `src/data/*.json` 含 KANJIDIC2、JMdict 與 Wiktionary 資料，依 CC BY-SA 4.0 須標示出處並以相同授權釋出。
