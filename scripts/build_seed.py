#!/usr/bin/env python3
"""從開放資料產生種子資料（規律例字＋聲符字族＋詞彙）。

讀取 /data 下的原始檔（直接讀壓縮檔，不需要先解壓縮）：
  kanjidic2.xml.gz            日語音讀、訓讀、常用漢字、舊制 JLPT、英文釋義、新舊字體對應
  Unihan.zip                  粵語 kCantonese、華語 kMandarin（Unicode 正式版）
  kautian.ods                 台語：單字文讀／白讀（工作表「名」）、詞目讀音（工作表「詞目」）
  tshet-uinh-data-main.zip    中古音（韻書/廣韻.csv）
  JMdict_e.gz                 詞彙讀音、英文釋義
  wiktionary_readings.json    吳音／漢音／唐音／慣用音標記（先執行 fetch_wiktionary_readings.py；沒有也能跑）

人工編輯的清單（只有字形、分類、中文說明，沒有讀音）：
  scripts/words_source.json   詞彙
  scripts/series_source.json  聲符字族

輸出：src/data/kanji.json、words.json、series.json，並更新 rules.json 的 exceptions。
所有讀音都來自上述檔案；查不到的欄位一律留空，畫面上顯示「待確認」。

用法：python -X utf8 scripts/build_seed.py
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

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data"
OUT = ROOT / "src" / "data"

# 使用者列出的規律例字（含促音例詞裡的字）
SEED = list(dict.fromkeys(
    "漢海學" "方福分" "牛銀眼" "萬文武馬" "日人二" "中竹茶"
    "六石學" "一八日" "十入急" "三心山" "東光生京"
    "校雜誌個本" "明行人"
))

# 「讀音層次」規律無法由中古音自動判斷，直接用使用者列的例字
LAYER_CHARS = set("明行人")

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


# ---------------------------------------------------------------- 台語辭典

T = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"


def load_taigi(path: Path) -> tuple[dict[str, dict[str, list[str]]], dict[str, list[str]]]:
    """回傳 (單字讀音 {字: {literary, colloquial, unmarked}}, 詞目讀音 {漢字: [羅馬字…]})"""
    out: dict[str, dict[str, list[str]]] = defaultdict(lambda: {"literary": [], "colloquial": [], "unmarked": []})
    entries: dict[str, list[str]] = defaultdict(list)
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
                    key = {"文": "literary", "白": "colloquial", "不標": "unmarked", "": "unmarked"}.get(kind)
                    if key is None:
                        skipped += 1
                    elif roman not in out[ch][key]:
                        out[ch][key].append(roman)
            el.clear()
    if skipped:
        print(f"（台語：略過 {skipped} 筆標記為其他來源的讀音）")
    return out, entries


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

def load_jmdict(path: Path, wanted: set[str]) -> tuple[dict[str, dict], str]:
    """只讀需要的詞。回傳 ({詞: {readings, gloss, seq}}, 建檔日期)

    同一個詞形若有多個詞條，取有 ke_pri（常用標記）的那條；讀音依 re_restr 篩選、略過 re_nokanji。
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
                if keb not in wanted:
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
                    "pri": k.find("ke_pri") is not None,
                    "readings": readings,
                    "gloss": [g.text for g in sense.iterfind("gloss")][:3] if sense is not None else [],
                })
            el.clear()
    out = {}
    for keb, cands in found.items():
        cands.sort(key=lambda c: not c["pri"])  # 有常用標記的排前面
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
        check("initial-z-to-ch", starts(set("ちぢ")), f"中古{mu}母，預期 ch 開頭")

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

    if k["char"] in LAYER_CHARS:
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


def main() -> None:
    print("讀取 KANJIDIC2…")
    kd, old_to_new, kd_version = load_kanjidic(RAW / "kanjidic2.xml.gz")
    print("讀取 Unihan…")
    unihan, unihan_date = load_unihan(RAW / "Unihan.zip")
    canto, mando = unihan["kCantonese"], unihan["kMandarin"]
    print("讀取 臺灣台語常用詞辭典…")
    taigi, taigi_entries = load_taigi(RAW / "kautian.ods")
    print("讀取 廣韻…")
    gy = load_guangyun(RAW / "tshet-uinh-data-main.zip")
    wikt_path = RAW / "wiktionary_readings.json"
    wikt = json.loads(wikt_path.read_text(encoding="utf-8")) if wikt_path.exists() else {}
    if not wikt:
        warn("沒有 data/wiktionary_readings.json，讀音層次全部留空")

    words_src = json.loads((ROOT / "scripts" / "words_source.json").read_text(encoding="utf-8"))["words"]
    series_src = json.loads((ROOT / "scripts" / "series_source.json").read_text(encoding="utf-8"))["series"]
    rules_data = json.loads((OUT / "rules.json").read_text(encoding="utf-8"))
    print("讀取 JMdict…")
    jmdict, jm_created = load_jmdict(RAW / "JMdict_e.gz", {w["word"] for w in words_src})

    # 規律例字＋聲符字族的字
    series_of: dict[str, str] = {}
    for sr in series_src:
        for c in [sr["phonetic"], *sr["members"]]:
            series_of[c] = sr["phonetic"]
    all_chars = list(dict.fromkeys(SEED + list(series_of)))

    # ---- 詞彙
    words = []
    for ws in words_src:
        jm = jmdict.get(ws["word"])
        zh = ws.get("zh", "")
        w_sources = []
        readings = jm["readings"] if jm else []
        if jm:
            w_sources.append(f"讀音、英文釋義：JMdict（{jm_created}）詞條 #{jm['seq']}")
        else:
            warn(f"詞彙「{ws['word']}」：JMdict 查不到")
        hok = split_taigi_tags(taigi_entries.get(zh, [])) if zh else empty_hokkien()
        if any(hok.values()):
            w_sources.append(f"台語：教育部《臺灣台語常用詞辭典》開放資料，詞目「{zh}」")
        elif zh:
            warn(f"詞彙「{ws['word']}」：台語辭典查不到詞目「{zh}」")
        can = canto.get(zh, []) if len(zh) == 1 else []
        if can:
            w_sources.append(f"粵語：Unicode Unihan kCantonese（U+{ord(zh):04X}，{unihan_date}）")
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

    kanji_out = []
    exceptions: dict[str, list[dict]] = defaultdict(list)

    for trad in all_chars:
        jp, via_variant = resolve_jp_char(trad, kd, old_to_new)
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
            sources.append(f"日語音讀、訓讀、常用漢字、舊制 JLPT、英文釋義：KANJIDIC2（{kd_version}）")
        if w_layers:
            sources.append(
                f"讀音層次（吳音／漢音／唐音／慣用音）：English Wiktionary「{jp}」{{{{ja-readings}}}}，"
                f"CC BY-SA 4.0 https://en.wiktionary.org/w/index.php?oldid={w['revid']}"
            )
        elif e:
            warn(f"{trad}：Wiktionary 沒有讀音層次資料")
        if via_variant:
            sources.append(f"新字體對應：KANJIDIC2「{jp}」的 variant 欄位")

        can = canto.get(trad) or canto.get(jp) or []
        if can:
            cp = ord(trad if trad in canto else jp)
            sources.append(f"粵語：Unicode Unihan kCantonese（U+{cp:04X}，{unihan_date}）")
        else:
            warn(f"{trad}：查不到粵語")
        man = mando.get(trad) or mando.get(jp) or []
        if man:
            sources.append(f"華語：Unicode Unihan kMandarin（{unihan_date}）")

        tg = taigi.get(trad)
        hokkien = {"literary": [], "colloquial": [], "unmarked": []}
        if tg:
            hokkien = {k: list(v) for k, v in tg.items()}
            sources.append("台語：教育部《臺灣台語常用詞辭典》開放資料 kautian.ods，工作表「名」")
        else:
            warn(f"{trad}：查不到台語")

        mc = gy.get(trad, [])
        if mc:
            sources.append("中古音：nk2028 tshet-uinh-data 韻書/廣韻.csv 小韻 " + "、".join(f"#{m['xiaoyun']}" for m in mc))
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
            "words": [w["word"] for w in words if jp in w["word"]],
            "notes": "",
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

    # ---- 聲符字族：共同音讀 = 聲符與成員的現代音讀（KANJIDIC2）中出現最多次的
    by_char = {k["char"]: k for k in kanji_out}
    series_out = []
    for sr in series_src:
        counts: dict[str, int] = defaultdict(int)
        for c in [sr["phonetic"], *sr["members"]]:
            for o in by_char[c]["on"]:
                if not o.get("extra"):
                    counts[o["kana"]] += 1
        shared = max(counts, key=lambda r: counts[r]) if counts else ""
        series_out.append({"phonetic": sr["phonetic"], "on": shared, "members": sr["members"]})
        print(f"字族 {sr['phonetic']}：共同音讀 {shared}（{dict(counts)}）")

    (OUT / "kanji.json").write_text(json.dumps(kanji_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "rules.json").write_text(json.dumps(rules_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "series.json").write_text(json.dumps(series_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n寫出 {len(words)} 個詞")
    for w in words:
        print(f"  {w['word']} {w['reading']} {'/'.join(w['alt_readings'])} 台{w['hokkien']} 粵{'/'.join(w['cantonese'])} {w['rules']}")

    print(f"\n寫出 {len(kanji_out)} 字")
    for k in kanji_out:
        h = k["hokkien"]
        print(f"{k['char']}{k['jp_char']} 日{'/'.join(o['kana'] + ('(' + '・'.join(o['layers']) + ')' if o['layers'] else '') + ('*' if o.get('extra') else '') for o in k['on'])} 粵{'/'.join(k['cantonese'])} "
              f"台文{'/'.join(h['literary'])} 白{'/'.join(h['colloquial'])} 未標{'/'.join(h['unmarked'])} "
              f"中古{'/'.join(m['status'] + '(' + m['rhyme'] + ')' for m in k['middle_chinese'])} → {','.join(k['rules'])}")
    print("\n例外：")
    for rid, xs in exceptions.items():
        for x in xs:
            print(f"  {rid} {x['char']}{'（部分）' if x['partial'] else ''}：{x['reason']}")
    if warnings:
        print("\n警告：")
        for w in warnings:
            print("  " + w)


if __name__ == "__main__":
    main()
