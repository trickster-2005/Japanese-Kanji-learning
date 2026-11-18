#!/usr/bin/env python3
"""從開放資料產生網站資料：常用漢字 2,136 字＋規律例字＋聲符字族＋詞彙。

讀取 /data 下的原始檔（直接讀壓縮檔，不需要先解壓縮）：
  kanjidic2.xml.gz            日語音讀、訓讀、常用漢字、舊制 JLPT、英文釋義、新舊字體對應
  Unihan.zip                  粵語 kCantonese、華語 kMandarin（Unicode 正式版）
  kautian.ods                 台語：單字文讀／白讀（工作表「名」）、詞目讀音（工作表「詞目」）
  tshet-uinh-data-main.zip    中古音（韻書/廣韻.csv）
  JMdict_e.gz                 詞彙讀音、英文釋義
  wiktionary_readings.json    吳音／漢音／唐音／慣用音標記（先執行 fetch_wiktionary_readings.py；沒有也能跑）
  ids.txt 或 cjkvi-ids*.zip   漢字結構（IDS），用來自動找聲符字族（沒有也能跑，只用人工字族）

人工編輯的清單（只有字形、分類、中文說明，沒有讀音）：
  scripts/words_source.json   詞彙
  scripts/series_source.json  聲符字族

輸出：src/data/kanji.json、words.json、series.json，並更新 rules.json 的 exceptions。
所有讀音都來自上述檔案；查不到的欄位一律留空，畫面上顯示「待確認」。

用法：
  python -X utf8 scripts/build_data.py              # 全部常用漢字＋JMdict 常用詞
  python -X utf8 scripts/build_data.py --seed-only  # 只做規律例字與字族（開發時較快）
"""
from __future__ import annotations

import csv
import gzip
import io
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from phonetic_series import build_series, find_ids_file, load_ids  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data"
OUT = ROOT / "src" / "data"

# 使用者列出的規律例字（含促音例詞裡的字）
SEED = list(dict.fromkeys(
    "漢海學" "方福分" "牛銀眼" "萬文武馬" "日人二" "中竹茶"
    "六石學" "一八日" "十入急" "三心山" "東光生京"
    "校雜誌個本" "明行人"
))

# 「讀音層次」規律：使用者列的例字一定列入；其他字若同時有「只屬吳音」和「只屬漢音」的音讀也列入
LAYER_CHARS = set("明行人")

# JMdict 自動選詞：詞形 2–4 個字、全部是常用漢字、有常用標記，依頻率取前 N 個
AUTO_WORD_LIMIT = 3000
COMMON_TAGS = {"news1", "ichi1", "spec1", "spec2"}
# 每個字的「常用詞彙」最多列幾個
WORDS_PER_KANJI = 8

warnings: list[str] = []


def warn(msg: str) -> None:
    warnings.append(msg)


# ---------------------------------------------------------------- 假名工具

def to_hiragana(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


# ---------------------------------------------------------------- KANJIDIC2

CP_TYPES = {"ucs", "jis208", "jis212", "jis213"}


def load_kanjidic(path: Path):
    chars: dict[str, dict] = {}
    cp_index: dict[tuple[str, str], str] = {}
    version = ""
    with gzip.open(path, "rb") as f:
        for _, el in ET.iterparse(f, events=("end",)):
            if el.tag == "database_version":
                version = el.text or ""
            if el.tag != "character":
                continue
            lit = el.findtext("literal")
            grade = el.findtext("misc/grade")
            jlpt = el.findtext("misc/jlpt")
            entry = {
                "grade": int(grade) if grade else None,
                "jlpt_old": int(jlpt) if jlpt else None,
                "freq": int(el.findtext("misc/freq")) if el.findtext("misc/freq") else None,
                "radical": int(el.findtext("radical/rad_value[@rad_type='classical']") or 0) or None,
                "on": [to_hiragana(r.text) for r in el.iterfind("reading_meaning/rmgroup/reading[@r_type='ja_on']")],
                "kun": [r.text for r in el.iterfind("reading_meaning/rmgroup/reading[@r_type='ja_kun']")],
                "meaning_en": [m.text for m in el.iterfind("reading_meaning/rmgroup/meaning") if not m.attrib],
                "variants": [(v.get("var_type"), (v.text or "").lower()) for v in el.iterfind("misc/variant")],
            }
            chars[lit] = entry
            for cp in el.iterfind("codepoint/cp_value"):
                cp_index[(cp.get("cp_type"), (cp.text or "").lower())] = lit
            el.clear()

    # 常用漢字 → 其 variant 欄位指到的字（多為舊字體），反查成「舊字體 → 新字體」
    old_to_new: dict[str, list[str]] = defaultdict(list)
    for lit, e in chars.items():
        if e["grade"] is None or e["grade"] > 8:
            continue
        for vt, val in e["variants"]:
            if vt in CP_TYPES and (vt, val) in cp_index:
                old_to_new[cp_index[(vt, val)]].append(lit)
    return chars, old_to_new, version


def is_joyo(e: dict | None) -> bool:
    return bool(e and e["grade"] is not None and 1 <= e["grade"] <= 8)


def resolve_jp_char(trad: str, kd: dict, old_to_new: dict) -> tuple[str, bool]:
    """回傳 (新字體, 是否經由 variant 對應)"""
    if is_joyo(kd.get(trad)):
        return trad, False
    cands = list(dict.fromkeys(old_to_new.get(trad, [])))
    if len(cands) == 1:
        return cands[0], True
    if len(cands) > 1:
        warn(f"{trad}：新字體有多個候選 {cands}，暫取第一個")
        return cands[0], True
    warn(f"{trad}：KANJIDIC2 查不到對應的常用漢字，jp_char 暫用原字")
    return trad, False


# ---------------------------------------------------------------- Unihan

def load_unihan(path: Path) -> tuple[dict[str, dict[str, list[str]]], str]:
    """回傳 ({欄位: {字: [讀音…]}}, 檔案日期)，只取 kCantonese、kMandarin"""
    out: dict[str, dict[str, list[str]]] = {"kCantonese": {}, "kMandarin": {}}
    date_line = ""
    with zipfile.ZipFile(path) as zf:
        for line in io.TextIOWrapper(zf.open("Unihan_Readings.txt"), encoding="utf-8"):
            if line.startswith("# Date:"):
                date_line = line[len("# Date:"):].strip().split(" ")[0]
            if not line.startswith("U+"):
                continue
            cp, field, vals = line.rstrip("\n").split("\t")
            if field in out:
                out[field][chr(int(cp[2:], 16))] = vals.split()
    return out, date_line


# Unihan_Variants.txt 中用來找「新字體 → 舊字體／繁體」的欄位，依可信度排列
VARIANT_FIELDS = ["kJapaneseOldVariant", "kTraditionalVariant", "kZVariant", "kSemanticVariant"]


def load_unihan_variants(path: Path) -> dict[str, list[str]]:
    """回傳 {字: [異體字…]}，依 VARIANT_FIELDS 的順序排列"""
    found: dict[str, list[tuple[int, str]]] = defaultdict(list)
    with zipfile.ZipFile(path) as zf:
        for line in io.TextIOWrapper(zf.open("Unihan_Variants.txt"), encoding="utf-8"):
            if not line.startswith("U+"):
                continue
            cp, field, vals = line.rstrip("\n").split("\t")
            if field not in VARIANT_FIELDS:
                continue
            ch = chr(int(cp[2:], 16))
            for v in vals.split():
                found[ch].append((VARIANT_FIELDS.index(field), chr(int(v.split("<")[0][2:], 16))))
    return {ch: list(dict.fromkeys(v for _, v in sorted(vs))) for ch, vs in found.items()}


# ---------------------------------------------------------------- 台語辭典

T = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"


def load_taigi(path: Path):
    """回傳 (單字讀音 {字: {literary, colloquial, unmarked}}, 詞目讀音 {漢字: [羅馬字…]}, {字: {出處標記…}})

    工作表「名」的「類型」欄：文→文讀、白→白讀、不標或空白→未標文白。
    其他值（甘、晉、彙…）是辭典註明的讀音出處（例如甘為霖《廈門音新字典》），讀音一樣收錄為「未標文白」，
    並記下出處標記。大寫開頭的羅馬字是專有名詞用法，略過。
    """
    out: dict[str, dict[str, list[str]]] = defaultdict(lambda: {"literary": [], "colloquial": [], "unmarked": []})
    entries: dict[str, list[str]] = defaultdict(list)
    tags: dict[str, set[str]] = defaultdict(set)
    skipped = 0
    sheet = None
    with zipfile.ZipFile(path) as zf, zf.open("content.xml") as f:
        for ev, el in ET.iterparse(f, events=("start", "end")):
            if ev == "start" and el.tag == T + "table":
                sheet = el.get(T + "name")
                continue
            if ev != "end" or el.tag != T + "table-row":
                continue
            if sheet == "詞目":
                vals = ["".join(c.itertext()) for c in el][:4] + ["", "", "", ""]
                hanji = vals[2].split("【")[0].strip()  # 去掉「【替】」之類的標記
                roman = vals[3].strip()
                if hanji and hanji != "漢字" and roman and roman not in entries[hanji]:
                    entries[hanji].append(roman)
            if sheet == "名":
                vals: list[str] = []
                for c in el:
                    rep = min(int(c.get(T + "number-columns-repeated", "1")), 4)
                    vals += ["".join(c.itertext())] * rep
                vals += [""] * 4
                ch, roman, _, kind = vals[:4]
                if ch and ch != "漢字" and roman:
                    if roman[0].isupper():
                        skipped += 1
                        continue
                    key = {"文": "literary", "白": "colloquial"}.get(kind, "unmarked")
                    if kind not in ("文", "白", "不標", ""):
                        tags[ch].add(kind)
                    if roman not in out[ch][key]:
                        out[ch][key].append(roman)
            el.clear()
    if skipped:
        print(f"（台語：略過 {skipped} 筆專有名詞讀音）")
    return out, entries, tags


# ---------------------------------------------------------------- 切韻音系

def load_guangyun(path: Path) -> dict[str, list[dict]]:
    """回傳 字 → [{initial, rhyme, tone, status, fanqie, xiaoyun}]"""
    out: dict[str, list[dict]] = defaultdict(list)
    with zipfile.ZipFile(path) as zf:
        member = None
        for n in zf.namelist():
            if n.endswith(".csv"):
                with zf.open(n) as f:
                    if f.readline().decode("utf-8-sig").startswith("小韻號,小韻字號,韻目原貌,音韻地位"):
                        member = n
                        break
        if member is None:
            sys.exit("找不到 韻書/廣韻.csv")
        rows = csv.DictReader(io.TextIOWrapper(zf.open(member), encoding="utf-8-sig"))
        for r in rows:
            ch = r["字頭"]
            status = r["音韻地位"]
            if len(ch) != 1 or not status:
                continue
            if any(m["status"] == status for m in out[ch]):
                continue
            out[ch].append({
                "initial": status[0],
                "rhyme": r["韻目原貌"],
                "tone": status[-1],
                "status": status,
                "fanqie": r["反切"],
                "xiaoyun": r["小韻號"],
            })
    return out


# ---------------------------------------------------------------- JMdict

def jm_rank(tags: list[str]) -> int:
    """頻率排名：nf01（最常見）→ 1 … nf48 → 48；只有其他常用標記 → 49；沒有 → 99"""
    nf = [int(t[2:]) for t in tags if t.startswith("nf")]
    if nf:
        return min(nf)
    return 49 if set(tags) & COMMON_TAGS else 99


def load_jmdict(path: Path, wanted: set[str], accept=lambda keb, tags: False) -> tuple[dict[str, dict], str]:
    """讀 wanted 裡的詞，以及 accept(詞形, 常用標記) 為真的詞。回傳 ({詞: {readings, gloss, seq, rank}}, 建檔日期)

    同一個詞形若有多個詞條，取頻率最高的那條；讀音依 re_restr 篩選、略過 re_nokanji。
    """
    found: dict[str, list[dict]] = defaultdict(list)
    created = ""
    with gzip.open(path, "rb") as f:
        head = f.read(8192).decode("utf-8", "ignore")
        if "JMdict created:" in head:
            created = head.split("JMdict created:")[1].split("-->")[0].strip()
    with gzip.open(path, "rb") as f:
        for _, el in ET.iterparse(f, events=("end",)):
            if el.tag != "entry":
                continue
            for k in el.iterfind("k_ele"):
                keb = k.findtext("keb")
                tags = [t.text for t in k.iterfind("ke_pri")]
                if keb not in wanted and not accept(keb, tags):
                    continue
                readings = []
                for r in el.iterfind("r_ele"):
                    if r.find("re_nokanji") is not None:
                        continue
                    restr = [x.text for x in r.iterfind("re_restr")]
                    if restr and keb not in restr:
                        continue
                    readings.append(r.findtext("reb"))
                sense = el.find("sense")
                found[keb].append({
                    "seq": el.findtext("ent_seq"),
                    "rank": jm_rank(tags),
                    "readings": readings,
                    "gloss": [g.text for g in sense.iterfind("gloss")][:3] if sense is not None else [],
                })
            el.clear()
    out = {}
    for keb, cands in found.items():
        cands.sort(key=lambda c: c["rank"])  # 頻率高的排前面
        out[keb] = cands[0]
    return out, created


# ---------------------------------------------------------------- 規律判斷

ROW_K = set("かきくけこがぎぐげご")
ROW_G = set("がぎぐげご")
ROW_HB = set("はひふへほばびぶべぼぱぴぷぺぽ")
ROW_MB = set("まみむめもばびぶべぼ")
ROW_NZ = set("なにぬねのざじずぜぞ")

RHYME_NG = set("東冬鍾江陽唐庚耕清青蒸登")          # -ng／-k
RHYME_N = set("眞真諄臻文殷欣元魂痕寒桓刪山先仙")  # -n／-t
RHYME_M = set("侵覃談鹽添咸銜嚴凡")                # -m／-p


def mc_rhyme_class(m: dict) -> str | None:
    """依音韻地位的韻（平聲賅上去入）判斷韻尾類別"""
    yun = m["status"][-2]
    if yun in RHYME_NG:
        return "ng"
    if yun in RHYME_N:
        return "n"
    if yun in RHYME_M:
        return "m"
    return None


LATE_LAYERS = {"唐音", "宋音", "慣用音"}


def fmt(xs: list[str]) -> str:
    return "、".join(xs) if xs else "（無）"


def judge(k: dict) -> tuple[list[str], dict[str, dict]]:
    """回傳 (所屬規律, {規律: 例外資訊})

    逐一檢查每個音讀：
      - 全部音讀都不符合 → 例外（partial = False）
      - 部分音讀不符合   → 部分例外（partial = True），readings 列出不符合的音讀
    原因只寫資料能推出的事實；需要人工解釋的部分寫「原因待確認」。
    """
    # 只檢查 KANJIDIC2 收錄的現代音讀；僅見於 Wiktionary 的讀音不列入判斷
    on = [o["kana"] for o in k["on"] if not o.get("extra")]
    layer_of = {o["kana"]: o["layers"] for o in k["on"]}
    can = k["cantonese"]
    mcs = k["_mc"]
    inits = {m["initial"] for m in mcs}
    rules: list[str] = []
    exc: dict[str, dict] = {}

    def check(rule_id: str, ok, condition: str, reason_all: str | None = None) -> None:
        rules.append(rule_id)
        bad = [r for r in on if not ok(r)]
        if not on or not bad:
            return
        if len(bad) == len(on):
            reason = reason_all or f"{condition}，但日語音讀（{fmt(on)}）都不符合；原因待確認"
            exc[rule_id] = {"reason": reason, "partial": False, "readings": bad}
        else:
            labelled = [f"{r}（{'・'.join(layer_of[r])}）" if layer_of[r] else r for r in bad]
            reason = f"日語另有讀音「{fmt(labelled)}」不符合此規律"
            # 不符合的讀音若全是較晚或非正規的層次，就是原因本身；否則需人工確認
            if all(layer_of[r] and set(layer_of[r]) <= LATE_LAYERS for r in bad):
                found = sorted({layer for r in bad for layer in layer_of[r]})
                reason = f"日語另有{'、'.join(found)}「{fmt(bad)}」不符合此規律；{'、'.join(found)}不在吳音／漢音的對應範圍內"
            else:
                reason += "；原因待確認"
            exc[rule_id] = {"reason": reason, "partial": True, "readings": bad}

    def starts(row: set):
        return lambda r: r[0] in row

    def ends(*tails: str):
        return lambda r: r.endswith(tails)

    if inits & {"曉", "匣"}:
        mu = "／".join(sorted(inits & {"曉", "匣"}))
        check("initial-h-to-k", starts(ROW_K), f"中古{mu}母，預期 k／g 開頭")

    if any(c.startswith("f") for c in can):
        reason_all = None
        if inits & {"曉", "匣"} and all(r[0] in ROW_K for r in on):
            reason_all = "中古曉／匣母字：粵語變成 f，日語仍是か行（屬「h 變 k」）"
        check("initial-f-to-h", starts(ROW_HB), "粵語 f，預期は／ば行", reason_all)

    if "疑" in inits:
        check("initial-ng-to-g", starts(ROW_G), "中古疑母，預期 g 開頭")

    if "明" in inits:
        check("initial-m-to-b", starts(ROW_MB), "中古明母，預期ま／ば行")

    if "日" in inits:
        check("initial-j-to-j-n", starts(ROW_NZ), "中古日母，預期な／ざ行")

    if inits & {"知", "徹", "澄"}:
        mu = "／".join(sorted(inits & {"知", "徹", "澄"}))
        reason_all = None
        if on and all(r[0] in "たてとだでど" for r in on):
            hok = [h for hs in k["hokkien"].values() for h in hs]
            same_as_taigi = any(h.startswith("t") and not h.startswith("ts") for h in hok)
            reason_all = f"日語讀 t／d 開頭（{fmt(on)}）" + ("，和台語一樣保留舌尖塞音" if same_as_taigi else "") + "，沒有變成 ch"
        check("initial-z-to-ch", starts(set("ちぢ")), f"中古{mu}母，預期 ch 開頭", reason_all)

    ent_cls = {mc_rhyme_class(m) for m in mcs if m["tone"] == "入"}
    nas_cls = {mc_rhyme_class(m) for m in mcs if m["tone"] != "入"}

    if "ng" in ent_cls:
        check("coda-k", ends("く", "き"), "入聲 -k，預期く／き結尾")
    if "n" in ent_cls:
        check("coda-t", ends("ち", "つ"), "入聲 -t，預期ち／つ結尾")
    if "m" in ent_cls:
        check("coda-p", ends("う", "っ"), "入聲 -p，預期う結尾（清音前為っ）")
    if nas_cls & {"m", "n"}:
        check("coda-m-n", ends("ん"), "-m／-n 收尾，預期ん結尾")
    if "ng" in nas_cls:
        check("coda-ng", ends("う", "い"), "-ng 收尾，預期う／い結尾")

    def only(layer: str, other: str) -> bool:
        return any(layer in o["layers"] and other not in o["layers"] for o in k["on"] if not o.get("extra"))

    if k["char"] in LAYER_CHARS or (only("吳音", "漢音") and only("漢音", "吳音")):
        rules.append("layers")

    return rules, exc


# ---------------------------------------------------------------- 主程式

def empty_hokkien() -> dict[str, list[str]]:
    return {"literary": [], "colloquial": [], "unmarked": []}


def split_taigi_tags(romans: list[str]) -> dict[str, list[str]]:
    """詞目羅馬字可能帶「【白】tsáu/【文】tsóo」標記：標記一直套用到下一個標記為止。"""
    out = empty_hokkien()
    for roman in romans:
        key = "unmarked"
        for part in roman.split("/"):
            part = part.strip()
            if part.startswith("【白】"):
                key, part = "colloquial", part[3:]
            elif part.startswith("【文】"):
                key, part = "literary", part[3:]
            if part and part not in out[key]:
                out[key].append(part)
    return out


def pick_trad(jp: str, unihan_var: dict, new_to_old: dict, taigi: dict, gy: dict) -> tuple[str, list[str]]:
    """常用漢字（新字體）→ 台灣、香港使用的字形。回傳 (字形, 其他候選)

    新字體本身在台語辭典查得到 → 台灣也用這個字形，直接用。
    否則依序看 Unihan 的 kJapaneseOldVariant／kTraditionalVariant／kZVariant／kSemanticVariant，
    再看 KANJIDIC2 variant 反查的字，挑台語辭典或廣韻查得到的。
    """
    if jp in taigi:
        return jp, []
    cands = list(dict.fromkeys(unihan_var.get(jp, []) + new_to_old.get(jp, [])))
    # cands 已依欄位可信度排好，取第一個台語辭典或廣韻查得到的
    good = [c for c in cands if c != jp and (c in taigi or c in gy)]
    if good:
        return good[0], good[1:]
    return jp, []


def main() -> None:
    seed_only = "--seed-only" in sys.argv
    print("讀取 KANJIDIC2…")
    kd, old_to_new, kd_version = load_kanjidic(RAW / "kanjidic2.xml.gz")
    print("讀取 Unihan…")
    unihan, unihan_date = load_unihan(RAW / "Unihan.zip")
    canto, mando = unihan["kCantonese"], unihan["kMandarin"]
    unihan_var = load_unihan_variants(RAW / "Unihan.zip")
    print("讀取 臺灣台語常用詞辭典…")
    taigi, taigi_entries, taigi_tags = load_taigi(RAW / "kautian.ods")
    print("讀取 廣韻…")
    gy = load_guangyun(RAW / "tshet-uinh-data-main.zip")
    wikt_path = RAW / "wiktionary_readings.json"
    wikt = json.loads(wikt_path.read_text(encoding="utf-8")) if wikt_path.exists() else {}
    if not wikt:
        warn("沒有 data/wiktionary_readings.json，讀音層次全部留空")

    words_src = json.loads((ROOT / "scripts" / "words_source.json").read_text(encoding="utf-8"))["words"]
    series_src = json.loads((ROOT / "scripts" / "series_source.json").read_text(encoding="utf-8"))["series"]
    rules_data = json.loads((OUT / "rules.json").read_text(encoding="utf-8"))
    # ---- 要收錄的字：(繁體, 新字體, 是否經 variant 對應, 其他候選)
    series_of: dict[str, str] = {}
    for sr in series_src:
        for c in [sr["phonetic"], *sr["members"]]:
            series_of[c] = sr["phonetic"]
    pairs: list[tuple[str, str, bool, list[str]]] = []
    variant_src: dict[str, str] = {}
    used_trad: set[str] = set()
    used_jp: set[str] = set()
    for trad in dict.fromkeys(SEED + list(series_of)):
        jp, via = resolve_jp_char(trad, kd, old_to_new)
        pairs.append((trad, jp, via, []))
        used_trad.add(trad)
        used_jp.add(jp)
    if not seed_only:
        new_to_old: dict[str, list[str]] = defaultdict(list)
        for old, news in old_to_new.items():
            for n in dict.fromkeys(news):
                new_to_old[n].append(old)
        joyo = sorted((c for c, e in kd.items() if is_joyo(e)), key=lambda c: (kd[c]["grade"], kd[c]["freq"] or 9999))
        print(f"常用漢字 {len(joyo)} 字")
        for jp in joyo:
            if jp in used_jp:
                continue
            trad, others = pick_trad(jp, unihan_var, new_to_old, taigi, gy)
            if trad in used_trad:
                trad, others = jp, []
            pairs.append((trad, jp, trad != jp, others))
            if trad != jp:
                variant_src[jp] = "Unihan 異體字欄位" if trad in unihan_var.get(jp, []) else "KANJIDIC2 variant 欄位"
            used_trad.add(trad)
            used_jp.add(jp)
    jp_to_trad = {jp: trad for trad, jp, _, _ in pairs}
    joyo_set = {jp for _, jp, _, _ in pairs}

    print("讀取 JMdict…")

    def accept(keb: str, tags: list[str]) -> bool:
        return (
            not seed_only
            and 2 <= len(keb) <= 4
            and all(c in joyo_set for c in keb)
            and bool(set(tags) & COMMON_TAGS)
        )

    jmdict, jm_created = load_jmdict(RAW / "JMdict_e.gz", {w["word"] for w in words_src}, accept)

    # ---- 詞彙
    words = []
    for ws in words_src:
        jm = jmdict.get(ws["word"])
        zh = ws.get("zh", "")
        w_sources = []
        readings = jm["readings"] if jm else []
        if jm:
            w_sources.append(f"jmdict:{jm['seq']}")
        else:
            warn(f"詞彙「{ws['word']}」：JMdict 查不到")
        hok = split_taigi_tags(taigi_entries.get(zh, [])) if zh else empty_hokkien()
        if any(hok.values()):
            w_sources.append(f"kautian-word:{zh}")
        elif zh:
            warn(f"詞彙「{ws['word']}」：台語辭典查不到詞目「{zh}」")
        can = canto.get(zh, []) if len(zh) == 1 else []
        if can:
            w_sources.append(f"yue:U+{ord(zh):04X}")
        words.append({
            "word": ws["word"],
            "reading": readings[0] if readings else "",
            "alt_readings": readings[1:],
            "meaning_zh": ws["meaning_zh"],
            "gloss_en": jm["gloss"] if jm else [],
            "type": ws["type"],
            "kanji": [c for c in ws["word"] if "\u4e00" <= c <= "\u9fff"],
            "rules": ["sokuon"] if any("っ" in r for r in readings) else [],
            "zh": zh,
            "hokkien": hok,
            "cantonese": can,
            "note": ws["note"],
            "sources": w_sources,
        })

    manual = {w["word"] for w in words}
    auto = sorted((jm for keb, jm in jmdict.items() if keb not in manual), key=lambda jm: (jm["rank"], jm["seq"]))
    auto_kebs = [keb for keb, jm in sorted(jmdict.items(), key=lambda kv: (kv[1]["rank"], kv[1]["seq"])) if keb not in manual]
    for keb in auto_kebs[:AUTO_WORD_LIMIT]:
        jm = jmdict[keb]
        zh = "".join(jp_to_trad.get(c, c) for c in keb)
        hok = split_taigi_tags(taigi_entries.get(zh, []))
        w_sources = [f"jmdict:{jm['seq']}"]
        if any(hok.values()):
            w_sources.append(f"kautian-word:{zh}")
        words.append({
            "word": keb,
            "reading": jm["readings"][0] if jm["readings"] else "",
            "alt_readings": jm["readings"][1:],
            "meaning_zh": "",
            "gloss_en": jm["gloss"],
            "type": "unclassified",
            "kanji": list(keb),
            "rules": ["sokuon"] if any("っ" in r for r in jm["readings"]) else [],
            "zh": zh,
            "hokkien": hok,
            "cantonese": [],
            "note": "",
            "sources": w_sources,
        })
    del auto
    print(f"JMdict 自動選詞：符合條件 {len(auto_kebs)} 個，收錄前 {min(len(auto_kebs), AUTO_WORD_LIMIT)} 個")

    kanji_out = []
    exceptions: dict[str, list[dict]] = defaultdict(list)

    for trad, jp, via_variant, other_trad in pairs:
        e = kd.get(jp)
        if e is None:
            warn(f"{trad}：KANJIDIC2 沒有資料")
        sources = []

        w = wikt.get(jp, {})
        w_layers: dict[str, list[str]] = w.get("layers", {})

        def layers_of(kana: str) -> list[str]:
            return [layer for layer, vals in w_layers.items() if kana in vals]

        kd_on = e["on"] if e else []
        on = [{"kana": r, "layers": layers_of(r)} for r in kd_on]
        # Wiktionary 有、KANJIDIC2 沒有的音讀（多為現代少用的漢音、吳音），標為 extra
        for vals in w_layers.values():
            for r in vals:
                if r not in kd_on and all(o["kana"] != r for o in on):
                    on.append({"kana": r, "layers": layers_of(r), "extra": True})
        if e:
            sources.append("kanjidic2")
        if w_layers:
            sources.append(f"wiktionary:{w['revid']}")
        elif e:
            warn(f"{trad}：Wiktionary 沒有讀音層次資料")
        if via_variant:
            sources.append("variant:" + ("unihan" if variant_src.get(jp, "").startswith("Unihan") else "kanjidic2"))

        can = canto.get(trad) or canto.get(jp) or []
        if can:
            cp = ord(trad if trad in canto else jp)
            sources.append(f"yue:U+{cp:04X}")
        else:
            warn(f"{trad}：查不到粵語")
        man = mando.get(trad) or mando.get(jp) or []
        if man:
            sources.append("man")

        tg = taigi.get(trad)
        hokkien = {"literary": [], "colloquial": [], "unmarked": []}
        if tg:
            hokkien = {k: list(v) for k, v in tg.items()}
            sources.append("kautian:" + "、".join(sorted(taigi_tags.get(trad, []))))
        else:
            warn(f"{trad}：查不到台語")

        mc = gy.get(trad, [])
        if mc:
            sources.append("guangyun:" + ",".join(m["xiaoyun"] for m in mc))
        else:
            warn(f"{trad}：廣韻查不到")

        k = {
            "char": trad,
            "jp_char": jp,
            "on": on,
            "kun": e["kun"] if e else [],
            "cantonese": can,
            "hokkien": hokkien,
            "mandarin": man[0] if man else "",
            "middle_chinese": [{kk: m[kk] for kk in ("initial", "rhyme", "tone", "status", "fanqie")} for m in mc],
            "phonetic_series": series_of.get(trad, ""),
            "rules": [],
            "meaning_zh": "",
            "meaning_en": e["meaning_en"] if e else [],
            "jlpt": "",
            "jlpt_old": e["jlpt_old"] if e else None,
            "joyo": is_joyo(e),
            "words": [w["word"] for w in words if jp in w["word"]][:WORDS_PER_KANJI],
            "notes": f"新字體「{jp}」也對應：{'、'.join(other_trad)}" if other_trad else "",
            "sources": sources,
            "_mc": mc,
        }
        k["rules"], exc = judge(k)
        for rid, info in exc.items():
            exceptions[rid].append({"char": trad, **info})
        del k["_mc"]
        kanji_out.append(k)

    for r in rules_data:
        r["exceptions"] = exceptions.get(r["id"], [])

    # ---- 聲符字族
    by_char = {k["char"]: k for k in kanji_out}
    series_out = []
    ids_path = find_ids_file(RAW)
    if ids_path:
        print(f"讀取 IDS：{ids_path.name}")
        ids = load_ids(ids_path)
        series_out = build_series(kanji_out, ids, {c: e["radical"] for c, e in kd.items()})
        for sr in series_out:
            sr["source"] = "ids"
        print(f"IDS 自動字族：{len(series_out)} 組")
    else:
        warn("沒有 IDS 檔（data/ids.txt 或 cjkvi-ids*.zip），只用人工字族")
    # 人工字族：同一個聲符時取代自動結果。共同音讀 = 聲符與成員的音讀中出現最多次的
    auto_phonetics = {sr["phonetic"] for sr in series_out}
    for sr in series_src:
        counts: dict[str, int] = defaultdict(int)
        for c in [sr["phonetic"], *sr["members"]]:
            for o in by_char[c]["on"]:
                if not o.get("extra"):
                    counts[o["kana"]] += 1
        shared = max(counts, key=lambda r: counts[r]) if counts else ""
        manual = {
            "phonetic": sr["phonetic"],
            "on": shared,
            "members": sr["members"],
            "shared": sum(1 for c in sr["members"] if any(o["kana"] == shared for o in by_char[c]["on"])),
            "source": "manual",
        }
        if sr["phonetic"] in auto_phonetics:
            series_out = [manual if x["phonetic"] == sr["phonetic"] else x for x in series_out]
        else:
            series_out.insert(0, manual)
    # 每個字記下所屬字族（聲符本身屬於自己的字族；成員若屬於多組，取第一組）
    for k in kanji_out:
        k["phonetic_series"] = ""
    for sr in series_out:
        for c in [sr["phonetic"], *sr["members"]]:
            if not by_char[c]["phonetic_series"]:
                by_char[c]["phonetic_series"] = sr["phonetic"]

    (OUT / "kanji.json").write_text(json.dumps(kanji_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "rules.json").write_text(json.dumps(rules_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    meta = {
        "kanjidic2": {"name": "KANJIDIC2（EDRDG）", "version": kd_version, "license": "CC BY-SA 4.0",
                      "covers": "日語音讀、訓讀、常用漢字、舊制 JLPT、英文釋義", "url": "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project"},
        "jmdict": {"name": "JMdict（EDRDG）", "version": jm_created, "license": "CC BY-SA 4.0",
                   "covers": "詞彙讀音、英文釋義", "url": "https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project"},
        "unihan": {"name": "Unicode Unihan", "version": unihan_date, "license": "Unicode License V3",
                   "covers": "粵語 kCantonese、華語 kMandarin、異體字", "url": "https://www.unicode.org/charts/unihan.html"},
        "kautian": {"name": "教育部《臺灣台語常用詞辭典》開放資料", "version": "kautian.ods", "license": "待確認",
                    "covers": "台語文讀、白讀、詞目讀音", "url": "https://sutian.moe.edu.tw/"},
        "guangyun": {"name": "nk2028 tshet-uinh-data（廣韻）", "version": "", "license": "CC0 1.0",
                     "covers": "中古音音韻地位、反切", "url": "https://github.com/nk2028/tshet-uinh-data"},
        "wiktionary": {"name": "English Wiktionary", "version": "", "license": "CC BY-SA 4.0",
                       "covers": "吳音／漢音／唐音／宋音／慣用音標記", "url": "https://en.wiktionary.org/"},
        "ids": {"name": "CJKVI IDS（ids.txt，源自 CHISE IDS）", "version": "", "license": "GPLv2（依 CHISE 條款）",
                "covers": "漢字結構，用來自動找聲符字族", "url": "https://github.com/cjkvi/cjkvi-ids"},
    }
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "series.json").write_text(json.dumps(series_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # 詳細內容寫到 data/build_report.txt（不進 git），終端機只印摘要
    lines = [f"詞彙 {len(words)} 個"]
    for w in words:
        lines.append(f"  {w['word']} {w['reading']} {'/'.join(w['alt_readings'])} {w['type']} 台{w['hokkien']} {w['rules']}")
    lines.append(f"\n漢字 {len(kanji_out)} 字")
    for k in kanji_out:
        h = k["hokkien"]
        on = "/".join(o["kana"] + ("(" + "・".join(o["layers"]) + ")" if o["layers"] else "") + ("*" if o.get("extra") else "") for o in k["on"])
        mc = "/".join(m["status"] + "(" + m["rhyme"] + ")" for m in k["middle_chinese"])
        lines.append(
            f"{k['char']}{k['jp_char']} 日{on} 粵{'/'.join(k['cantonese'])} 華{k['mandarin']} "
            f"台文{'/'.join(h['literary'])} 白{'/'.join(h['colloquial'])} 未標{'/'.join(h['unmarked'])} 中古{mc} → {','.join(k['rules'])}"
        )
    lines.append("\n例外：")
    for rid, xs in exceptions.items():
        for x in xs:
            lines.append(f"  {rid} {x['char']}{'（部分）' if x['partial'] else ''}：{x['reason']}")
    lines.append("\n警告：")
    lines += ["  " + w for w in warnings]
    (RAW / "build_report.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    def count(pred) -> int:
        return sum(1 for k in kanji_out if pred(k))

    print(f"\n寫出 {len(kanji_out)} 字、{len(words)} 個詞")
    print(f"  有日語音讀 {count(lambda k: k['on'])}、粵語 {count(lambda k: k['cantonese'])}、華語 {count(lambda k: k['mandarin'])}、"
          f"台語 {count(lambda k: any(k['hokkien'].values()))}、中古音 {count(lambda k: k['middle_chinese'])}、"
          f"讀音層次 {count(lambda k: any(o['layers'] for o in k['on']))}")
    for r in rules_data:
        members = count(lambda k: r["id"] in k["rules"])
        full = sum(1 for x in r["exceptions"] if not x["partial"])
        part = sum(1 for x in r["exceptions"] if x["partial"])
        print(f"  {r['id']}: {members} 字，例外 {full}、部分例外 {part}")
    print(f"  警告 {len(warnings)} 則；詳細內容見 data/build_report.txt")

if __name__ == "__main__":
    main()
