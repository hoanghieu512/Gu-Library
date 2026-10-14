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

--auto (for notes of unknown style, e.g. a whole vault): touch a file only when it looks
hard-wrapped (at least 3 broken lines, the median broken line 65+ characters long, i.e. cut at a
fixed width), and join only where a line was really cut (see wrap_joiner). Files whose
single line breaks are deliberate (post copy, "key: value" lines, a paragraph per line) are left
alone.

Usage: md-unwrap.py [--auto] IN [OUT]    (no OUT: rewrite IN in place)
"""
import re
import sys

LIST = re.compile(r'^\s*([-*+]|\d+[.)])\s')
BLOCK = re.compile(r'^\s*(#{1,6}\s|```|~~~|\||<!--|<|(-{3,}|\*{3,}|_{3,})\s*$)')


def unwrap(text: str, can_join=None) -> str:
    """Join continuation lines. `can_join(last_len, body)`, when given, decides each join from the
    length of the line before and the text of the line after."""
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
    last_len = 0        # length of the last physical line appended or joined
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
                and not prev.endswith('  ') and not prev.endswith('\\')
                and (can_join is None or can_join(last_len, body))):
            out[-1] = prev.rstrip() + ' ' + body.lstrip()  # keeps a trailing hard break
            last_len = len(line.rstrip())
            continue
        out.append(line)
        open_line, open_quote = True, quote
        last_len = len(line.rstrip())
    return '\n'.join(out)


def broken_line_lengths(text: str) -> list[int]:
    """Lengths of prose lines followed by a continuation line (what unwrap would join)."""
    lines = text.split('\n')
    start = 0
    if lines and lines[0].strip() == '---':
        start = 1
        while start < len(lines) and lines[start].strip() != '---':
            start += 1
        start += 1
    fence = False
    out = []
    for k in range(start, len(lines)):
        line, s = lines[k], lines[k].strip()
        if s.startswith(('```', '~~~')):
            fence = not fence
            continue
        if fence or not s or BLOCK.match(line):
            continue
        nxt = lines[k + 1] if k + 1 < len(lines) else ''
        if (nxt.strip() and not BLOCK.match(nxt) and not nxt.strip().startswith(('```', '~~~'))
                and not LIST.match(re.sub(r'^\s*>\s?', '', nxt))):
            out.append(len(line.rstrip()))
    return out


def looks_wrapped(text: str) -> bool:
    lens = sorted(broken_line_lengths(text))
    return len(lens) >= 3 and lens[len(lens) // 2] >= 65


def wrap_joiner(text: str, slack: int = 8):
    """For a hard-wrapped file: join only where the line was really cut, i.e. the next line's first
    word would not have fitted on it within the file's wrap width (95th percentile of its broken
    lines). A break before a word that fits was meant (a new sentence, a "Tradeoff:" line)."""
    lens = sorted(broken_line_lengths(text))
    width = lens[int(0.95 * (len(lens) - 1))]

    def can_join(last_len: int, body: str) -> bool:
        b = body.strip()
        # A leading `code span` is never cut by the writer, so it counts as one word.
        m = re.match(r'^\W{0,3}`[^`]*`\S*', b)
        first = m.group(0) if m else b.split(' ')[0]
        return 50 <= last_len <= 125 and last_len + 1 + len(first) > width - slack
    return can_join


def same_text(a: str, b: str) -> bool:
    squash = lambda t: re.sub(r'[\s>]+', '', t)  # noqa: E731
    return squash(a) == squash(b)


def main() -> int:
    args = sys.argv[1:]
    auto = bool(args) and args[0] == '--auto'
    if auto:
        args = args[1:]
    if len(args) not in (1, 2):
        print(__doc__.strip().splitlines()[-1], file=sys.stderr)
        return 2
    src_path = args[0]
    dst_path = args[1] if len(args) == 2 else src_path
    with open(src_path, encoding='utf-8') as f:
        src = f.read()
    if auto and not looks_wrapped(src):
        print(f'md-unwrap: {src_path}: not hard-wrapped, left alone')
        return 0
    dst = unwrap(src, wrap_joiner(src)) if auto else unwrap(src)
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
