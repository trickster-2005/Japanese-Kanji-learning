"""用 IDS（漢字結構描述）自動找出聲符字族。

形聲字 = 形旁（多半就是部首）＋聲旁。做法：
  1. 讀 IDS，取每個字最上層的組成部件（例如 清 = ⿰氵青 → 氵、青）。
  2. 去掉 KANJIDIC2 標的部首（形旁），剩下的部件若也是本站收錄的字，就是聲旁候選。
  3. 依聲旁分組。至少有 2 個成員和聲旁共用同一個日語音讀的組才收錄，
     避免只是字形相同、讀音無關的組。
  4. 共同音讀 = 聲旁的音讀中，最多成員共用的那一個。
     比對時不分清濁（ほう 與 ぼう 視為同音），網頁上再區分顯示。

讀音一律來自已產生的 kanji 資料（KANJIDIC2），這裡不產生任何讀音。
"""
from __future__ import annotations

import io
import re
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path

IDC = {c: 3 if c in "⿲⿳" else 2 for c in "⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻"}
TOKEN_RE = re.compile(r"&[^;]+;|.", re.S)  # 「&CDP-8C4E;」這類實體算一個部件

MIN_SHARED = 2  # 至少幾個成員要和聲旁同音


def _open_ids(path: Path) -> io.TextIOBase:
    """支援直接的 ids.txt，或包含 ids.txt 的 zip（例如 GitHub 下載的 cjkvi-ids-master.zip）"""
    if path.suffix == ".zip":
        zf = zipfile.ZipFile(path)
        name = next(n for n in zf.namelist() if n.endswith("/ids.txt") or n == "ids.txt")
        return io.TextIOWrapper(zf.open(name), encoding="utf-8")
    return open(path, encoding="utf-8")


def find_ids_file(raw: Path) -> Path | None:
    for cand in [raw / "ids.txt", *sorted(raw.glob("cjkvi-ids*.zip"))]:
        if cand.exists():
            return cand
    return None


def load_ids(path: Path) -> dict[str, str]:
    """回傳 {字: IDS}。同一字有多種寫法時，優先取標了 J（日本字形）或 T（台灣字形）的。"""
    out: dict[str, str] = {}
    with _open_ids(path) as f:
        for line in f:
            if line.startswith(";;") or "\t" not in line:
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            ch, variants = parts[1], parts[2:]
            best = None
            for v in variants:
                m = re.match(r"(.*?)\[([A-Z]+)\]$", v)
                ids, tags = (m.group(1), m.group(2)) if m else (v, "")
                if best is None or ("J" in tags or "T" in tags):
                    best = ids
                    if "J" in tags or "T" in tags:
                        break
            if best:
                out[ch] = best
    return out


def top_components(ids: str) -> list[str]:
    """IDS 最上層的部件（只回傳單一字元的部件；巢狀結構整段略過）"""
    tokens = TOKEN_RE.findall(ids)
    if not tokens or tokens[0] not in IDC:
        return []
    pos = 1

    def skip() -> None:
        """跳過一個完整的部件（可能是巢狀結構）"""
        nonlocal pos
        if pos >= len(tokens):
            return
        t = tokens[pos]
        pos += 1
        if t in IDC:
            for _ in range(IDC[t]):
                skip()

    def operand() -> str | None:
        nonlocal pos
        if pos >= len(tokens):
            return None
        t = tokens[pos]
        if t in IDC:  # 巢狀結構：整段跳過
            skip()
            return None
        pos += 1
        return t if len(t) == 1 else None

    return [c for c in (operand() for _ in range(IDC[tokens[0]])) if c]


def plain_kana(kana: str) -> str:
    """去掉濁點、半濁點：ぼう → ほう"""
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", kana) if c not in "゙゚"))


def radical_char(number: int | None) -> str:
    """康熙部首編號 → 部首字（用 Unicode 康熙部首區的相容分解）"""
    if not number or not 1 <= number <= 214:
        return ""
    return unicodedata.normalize("NFKC", chr(0x2F00 + number - 1))


def build_series(kanji: list[dict], ids: dict[str, str], radical_of: dict[str, int | None]) -> list[dict]:
    by_form: dict[str, dict] = {}
    for k in kanji:
        by_form[k["char"]] = k
        by_form[k["jp_char"]] = k

    def on_of(k: dict) -> set[str]:
        return {plain_kana(o["kana"]) for o in k["on"] if not o.get("extra")}

    groups: dict[str, list[dict]] = defaultdict(list)
    for k in kanji:
        rad = radical_char(radical_of.get(k["jp_char"]))
        comps: list[str] = []
        for form in (k["char"], k["jp_char"]):
            comps += [c for c in top_components(ids.get(form, "")) if c not in comps]
        for c in comps:
            p = by_form.get(c)
            if p is None or p is k or c == rad or p["char"] == rad or p["jp_char"] == rad:
                continue
            if k not in groups[p["char"]]:
                groups[p["char"]].append(k)

    series = []
    for pchar, members in groups.items():
        p = by_form[pchar]
        counts = {r: sum(1 for m in members if r in on_of(m)) for r in on_of(p)}
        if not counts or max(counts.values()) < MIN_SHARED:
            continue
        shared_plain = max(counts, key=lambda r: (counts[r], -len(r)))
        # 顯示用的共同音讀取聲旁本身的寫法（例如聲旁是「ほう」就顯示ほう）
        shared = next(o["kana"] for o in p["on"] if not o.get("extra") and plain_kana(o["kana"]) == shared_plain)
        # 同音的成員排前面
        members.sort(key=lambda m: shared_plain not in on_of(m))
        series.append({
            "phonetic": p["char"],
            "on": shared,
            "members": [m["char"] for m in members],
            "shared": counts[shared_plain],
        })
    series.sort(key=lambda s: (-s["shared"], -len(s["members"]), s["phonetic"]))
    return series
