#!/usr/bin/env python3
"""從英文 Wiktionary 抓漢字的吳音／漢音／唐音／慣用音標記，存成本機快取。

資料來自每個漢字頁面的 {{ja-readings}} 模板（goon／kanon／toon／soon／kanyoon 欄位）。
授權：CC BY-SA 4.0（English Wiktionary）。快取中記下每頁的 revision id，可用來產生固定版本的出處連結。

用法：
  python -X utf8 scripts/fetch_wiktionary_readings.py            # 抓 src/data/kanji.json 裡所有 jp_char
  python -X utf8 scripts/fetch_wiktionary_readings.py 学 行 明    # 只抓指定的字
  加上 --refresh 會忽略快取重新抓。

輸出：data/wiktionary_readings.json
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "wiktionary_readings.json"
API = "https://en.wiktionary.org/w/api.php"
USER_AGENT = "kanji-rules-site-data-script/0.1 (static educational site)"
BATCH = 50  # MediaWiki API 一次最多 50 個標題

# Wiktionary 欄位 → 本站的讀音層次名稱
FIELDS = {"goon": "吳音", "kanon": "漢音", "toon": "唐音", "soon": "宋音", "kanyoon": "慣用音"}

TEMPLATE_RE = re.compile(r"\{\{ja-readings(.*?)\}\}", re.S)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)


def parse_readings(wikitext: str) -> dict[str, list[str]]:
    """把頁面中所有 {{ja-readings}} 合併成 {層次: [現代假名…]}（去除歷史假名與重複）"""
    out: dict[str, list[str]] = {}
    for body in TEMPLATE_RE.findall(COMMENT_RE.sub("", wikitext)):
        for part in body.split("|"):
            key, sep, val = part.partition("=")
            key = key.strip()
            if not sep or key not in FIELDS:
                continue
            for item in val.split(","):
                modern = item.split("<")[0].strip()  # 「みょう<みやう」只取現代假名
                modern = re.sub(r"[^ぁ-ゖー]", "", modern)
                if modern and modern not in out.setdefault(FIELDS[key], []):
                    out[FIELDS[key]].append(modern)
    return out


def fetch_batch(titles: list[str]) -> dict[str, dict]:
    params = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "content|ids",
        "rvslots": "main",
        "format": "json",
        "formatversion": "2",
        "maxlag": "5",
        "titles": "|".join(titles),
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    if "error" in data:
        raise RuntimeError(data["error"])

    # API 會把標題正規化，對回原本的字
    norm = {n["to"]: n["from"] for n in data["query"].get("normalized", [])}
    out: dict[str, dict] = {}
    today = date.today().isoformat()
    for page in data["query"]["pages"]:
        title = norm.get(page["title"], page["title"])
        if page.get("missing"):
            out[title] = {"layers": {}, "revid": None, "fetched": today}
            continue
        rev = page["revisions"][0]
        out[title] = {
            "layers": parse_readings(rev["slots"]["main"]["content"]),
            "revid": rev["revid"],
            "fetched": today,
        }
    return out


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    refresh = "--refresh" in sys.argv

    if args:
        chars = args
    else:
        kanji = json.loads((ROOT / "src" / "data" / "kanji.json").read_text(encoding="utf-8"))
        chars = [k["jp_char"] for k in kanji]
    chars = list(dict.fromkeys(chars))

    cache: dict[str, dict] = {}
    if CACHE.exists() and not refresh:
        cache = json.loads(CACHE.read_text(encoding="utf-8"))
    todo = [c for c in chars if c not in cache]
    print(f"共 {len(chars)} 字，需要抓取 {len(todo)} 字")

    for i in range(0, len(todo), BATCH):
        batch = todo[i : i + BATCH]
        cache.update(fetch_batch(batch))
        print(f"  已抓取 {min(i + BATCH, len(todo))}/{len(todo)}")
        time.sleep(1)  # 對 Wiktionary 客氣一點

    CACHE.parent.mkdir(exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    empty = [c for c in chars if not cache[c]["layers"]]
    if empty:
        print("沒有讀音層次資料：" + "".join(empty))
    for c in chars:
        layers = cache[c]["layers"]
        print(c, "　".join(f"{k}:{'、'.join(v)}" for k, v in layers.items()))


if __name__ == "__main__":
    main()
