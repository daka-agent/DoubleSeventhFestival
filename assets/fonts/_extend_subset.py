# -*- coding: utf-8 -*-
"""扩展霞鹜文楷子集：收集新增文案字符 → 找出命中的分片 → 下载缺失分片 → 重建 CSS"""
import io, os, re, sys, subprocess

ROOT = r"E:/dakaAgentProject/牛郎织女"
FONTS = os.path.join(ROOT, "assets/fonts")
FILES = os.path.join(FONTS, "files")
CSS_LOCAL = os.path.join(FONTS, "wenkai-local.css")
CSS_REMOTE = "https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/lxgwwenkai-regular.css"

# 1. 收集新增内容的全部字符（quiz 三件套 + index.html）
chars = set()
for rel in ["js/quiz-data.js", "js/quiz.js", "css/quiz.css", "index.html"]:
    p = os.path.join(ROOT, rel)
    if os.path.exists(p):
        with io.open(p, encoding="utf-8") as f:
            chars.update(f.read())
chars = {c for c in chars if ord(c) > 127}  # 只关心非 ASCII（汉字/标点）
# 只保留 CJK 统一表意 + 常用中文标点区，避免下载极端分片
def wanted(cp):
    return (0x4E00 <= cp <= 0x9FFF) or (0x3000 <= cp <= 0x303F) or (0xFF00 <= cp <= 0xFFEF)
chars = {c for c in chars if wanted(ord(c))}
print("unique CJK chars in new content:", len(chars))

# 2. 读取完整 CSS（本地缓存，避免重复下载）
css_path = os.path.join(FONTS, "_remote.css")
if not os.path.exists(css_path) or os.path.getsize(css_path) < 10000:
    css = subprocess.check_output(["curl", "-sL", "--max-time", "30", CSS_REMOTE]).decode("utf-8", "replace")
    with io.open(css_path, "w", encoding="utf-8") as f:
        f.write(css)
else:
    with io.open(css_path, encoding="utf-8") as f:
        css = f.read()
if "@font-face" not in css:
    print("FATAL: remote css fetch failed"); sys.exit(1)

# 3. 解析所有分片 block（远端 url 带 ./ 前缀）
blocks = re.findall(
    r"/\* LXGW WenKai \[(\d+)\] \*/\s*@font-face \{[^}]*?src: url\('\./files/lxgwwenkai-regular-subset-\d+\.woff2'\) format\('woff2'\);\s*unicode-range: ([^}]+?)\s*\}",
    css)
print("total slices in remote css:", len(blocks))

def parse_ranges(spec):
    out = []
    for part in spec.strip().split(","):
        part = part.strip().lower()
        m = re.match(r"u\+([0-9a-f]+)(?:-([0-9a-f]+))?$", part)
        if m:
            lo = int(m.group(1), 16)
            hi = int(m.group(2), 16) if m.group(2) else lo
            out.append((lo, hi))
    return out

slice_map = []  # (num, ranges)
for num, spec in blocks:
    slice_map.append((num, parse_ranges(spec)))

def hit(ch):
    cp = ord(ch)
    for num, ranges in slice_map:
        for lo, hi in ranges:
            if lo <= cp <= hi:
                return num
    return None

# 4. 计算需要的分片（新内容 + 已有 CSS 里的旧分片）
needed = set()
missing_chars = []
for ch in chars:
    n = hit(ch)
    if n: needed.add(n)
    else: missing_chars.append(ch)

# 旧分片号（保持兼容）
with io.open(CSS_LOCAL, encoding="utf-8") as f:
    old_css = f.read()
needed.update(int(m) for m in re.findall(r"subset-(\d+)\.woff2", old_css))
needed = sorted(needed)
print("needed slices total:", len(needed))
if missing_chars:
    print("WARNING chars not in any slice:", "".join(missing_chars))

# 5. 下载缺失的 woff2
os.makedirs(FILES, exist_ok=True)
ok, fail = 0, []
for n in needed:
    dst = os.path.join(FILES, "lxgwwenkai-regular-subset-%s.woff2" % n)
    if os.path.exists(dst) and os.path.getsize(dst) > 1000:
        ok += 1; continue
    url = "https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/files/lxgwwenkai-regular-subset-%s.woff2" % n
    r = subprocess.call(["curl", "-sL", "--max-time", "60", "-o", dst, url])
    if r == 0 and os.path.exists(dst) and os.path.getsize(dst) > 1000:
        ok += 1
    else:
        fail.append(n)
print("slices ok:", ok, "failed:", fail)

# 6. 重建本地 CSS（只含 needed 分片）
block_dict = {num: spec for num, spec in blocks}
out = ["/* LXGW WenKai - local subset, slices used by this page (P1 + quiz) */"]
for n in needed:
    spec = block_dict.get(str(n))
    if not spec: continue
    out.append("/* LXGW WenKai [%s] */" % n)
    out.append("@font-face {")
    out.append("  font-family: 'LXGW WenKai';")
    out.append("  font-style: normal;")
    out.append("  font-weight: 400;")
    out.append("  font-display: swap;")
    out.append("  src: url('files/lxgwwenkai-regular-subset-%s.woff2') format('woff2');" % n)
    out.append("  unicode-range: %s" % spec.strip())
    out.append("}")
with io.open(CSS_LOCAL, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(out) + "\n")
print("css rebuilt with", len(needed), "slices")
