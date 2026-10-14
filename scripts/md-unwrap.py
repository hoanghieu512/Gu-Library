#!/usr/bin/env python3
"""Join hard-wrapped Markdown so each paragraph, list item and blockquote is one line.

Obsidian (with "Strict line breaks" off, its default, and always in Live Preview) shows every
newline in a file as a line break, so text wrapped at ~100 columns reads as broken lines there.
The repo keeps the ops doc wrapped (cleaner 3-way merges); sync-ops-doc.sh runs this when it
copies the doc into the Obsidian vault.

Left untouched: frontmatter, fenced code, tables, headings, HTML comments, horizontal rules,
blank lines, and explicit hard breaks (two trailing spaces or a backslash). A list marker always
starts a new line, so nested lists keep their shape.

Safety check: apart from whitespace and the ">" of joined quote lines, the output must equal the
input character for character; otherwise nothing is written and the exit code is 1.

Usage: md-unwrap.py IN [OUT]    (no OUT: rewrite IN in place)
"""
import re
import sys

LIST = re.compile(r'^\s*([-*+]|\d+[.)])\s')
BLOCK = re.compile(r'^\s*(#{1,6}\s|```|~~~|\||<!--|<|(-{3,}|\*{3,}|_{3,})\s*$)')


def unwrap(text: str) -> str:
    lines = text.split('\n')
    out: list[str] = []
    i = 0
    if lines and lines[0].strip() == '---':  # frontmatter
        j = 1
        while j < len(lines) and lines[j].strip() != '---':
            j += 1
        out.extend(lines[:j + 1])
        i = j + 1
    fence = comment = False
    open_line = False   # can the last output line take a continuation?
    open_quote = False  # is that line a quote line?
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        i += 1
        if fence:
            out.append(line)
            fence = not s.startswith(('```', '~~~'))
            open_line = False
            continue
        if comment:
            out.append(line)
            comment = '-->' not in line
            open_line = False
            continue
        if s.startswith(('```', '~~~')):
            out.append(line)
            fence = True
            open_line = False
            continue
        if s.startswith('<!--'):
            out.append(line)
            comment = '-->' not in line
            open_line = False
            continue
        if not s or BLOCK.match(line):
            out.append(line)
            open_line = False
            continue
        quote = s.startswith('>')
        body = re.sub(r'^\s*>\s?', '', line) if quote else line
        prev = out[-1] if out else ''
        if (open_line and quote == open_quote and not LIST.match(body)
                and not prev.endswith('  ') and not prev.endswith('\\')):
            out[-1] = prev.rstrip() + ' ' + body.lstrip()  # keeps a trailing hard break
            continue
        out.append(line)
        open_line, open_quote = True, quote
    return '\n'.join(out)


def same_text(a: str, b: str) -> bool:
    squash = lambda t: re.sub(r'[\s>]+', '', t)  # noqa: E731
    return squash(a) == squash(b)


def main() -> int:
    if len(sys.argv) not in (2, 3):
        print(__doc__.strip().splitlines()[-1], file=sys.stderr)
        return 2
    src_path = sys.argv[1]
    dst_path = sys.argv[2] if len(sys.argv) == 3 else src_path
    with open(src_path, encoding='utf-8') as f:
        src = f.read()
    dst = unwrap(src)
    if not same_text(src, dst):
        print(f'md-unwrap: {src_path}: text would change, nothing written', file=sys.stderr)
        return 1
    if dst != src or dst_path != src_path:
        with open(dst_path, 'w', encoding='utf-8') as f:
            f.write(dst)
    print(f'md-unwrap: {src_path}: {src.count(chr(10)) + 1} -> {dst.count(chr(10)) + 1} lines')
    return 0


if __name__ == '__main__':
    sys.exit(main())
