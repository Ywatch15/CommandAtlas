---
slug: grep
name: grep
aliases: []
category: linux
tags:
  - grep
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - search text in files
  - find pattern in file
  - filter lines matching pattern
  - search for string in directory
  - find all occurrences of word in codebase
relatedCommands: [jq]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`grep` searches one or more files (or standard input) for lines that match a pattern,
and prints each matching line to standard output.

## Why does it exist?

Text files are the universal interface of Unix — logs, configs, source code, and data
all live as lines of text. `grep` provides a single, composable primitive for filtering
those lines by pattern, making it a foundational building block for shell pipelines.
Without `grep`, every shell script that needs to inspect text would have to implement
its own search loop.

## Syntax

```bash
grep [options] pattern [file...]
grep [options] -e pattern -e pattern [file...]
grep [options] -f pattern-file [file...]
```

The `pattern` is a basic regular expression (BRE) by default. Use `-E` for extended
regular expressions (ERE) or `-P` for Perl-compatible regular expressions (PCRE).

## Flags

| Flag            | Description                                                          | Example                                   |
| --------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `-i`            | Case-insensitive match                                               | `grep -i "error" app.log`                 |
| `-r` / `-R`     | Recursive search through directories (`-R` follows symlinks)         | `grep -r "TODO" ./src`                    |
| `-n`            | Print line number before each matching line                          | `grep -n "main" main.c`                   |
| `-l`            | Print only the names of files with matches, not the lines themselves | `grep -l "error" *.log`                   |
| `-c`            | Print a count of matching lines per file                             | `grep -c "error" app.log`                 |
| `-v`            | Invert match — print lines that do NOT match                         | `grep -v "DEBUG" app.log`                 |
| `-w`            | Match whole words only                                               | `grep -w "cat" animals.txt`               |
| `-E`            | Use extended regular expressions (same as `egrep`)                   | `grep -E "error                           | warn" app.log` |
| `-F`            | Treat pattern as a fixed string, not a regex                         | `grep -F "1.2.3.4" access.log`            |
| `-P`            | Use Perl-compatible regular expressions (PCRE)                       | `grep -P "\d{3}-\d{4}" contacts.txt`      |
| `-A n`          | Print `n` lines of context after each match                          | `grep -A 3 "ERROR" app.log`               |
| `-B n`          | Print `n` lines of context before each match                         | `grep -B 2 "FATAL" app.log`               |
| `-C n`          | Print `n` lines of context before and after each match               | `grep -C 2 "exception" app.log`           |
| `-o`            | Print only the matched portion of each line                          | `grep -o "http[s]*://[^ ]*" page.html`    |
| `-q`            | Quiet — exit 0 if match found, 1 otherwise; no output                | `grep -q "ready" status.txt && echo "ok"` |
| `--include`     | Limit recursive search to files matching a glob                      | `grep -r --include="*.py" "import os" .`  |
| `--exclude-dir` | Exclude directories matching a glob from recursive search            | `grep -r --exclude-dir=".git" "TODO" .`   |

## Examples

```bash
grep "error" /var/log/syslog
```

> Prints every line in `/var/log/syslog` that contains the string "error" (case-sensitive).

```bash
grep -rn "TODO" ./src --include="*.js"
```

> Searches all `.js` files under `./src` recursively, printing the filename and line
> number before each matching line. Useful for pre-commit audits.

```bash
grep -E "^(ERROR|WARN)" app.log
```

> Matches lines beginning with either "ERROR" or "WARN" using an extended regular
> expression. The `^` anchors the match to the start of the line.

```bash
grep -v "DEBUG" app.log | grep -c "ERROR"
```

> Demonstrates `grep` in a pipeline: first removes DEBUG lines, then counts ERROR
> lines in the remaining output. `-v` inverts the match; `-c` counts.

```bash
grep -q "database ready" /var/log/app.log && echo "DB is up" || echo "DB not ready"
```

> Uses `-q` (quiet mode) for scripted existence checks: exits 0 if the pattern is
> found and 1 otherwise, with no output of its own. This is the correct way to use
> `grep` in conditionals.

## Real-World Scenarios

**Log triage**: `grep -rn "Exception" /var/log/myapp/ --include="*.log"` finds every
Java or Python exception across all log files, with file names and line numbers, so
you can jump directly to the relevant entry without opening each file.

**Pre-commit audit**: `grep -r "console.log\|debugger" --include="*.js" ./src` catches
debug artifacts before they reach code review. Pair with `--quiet` and a non-zero exit
to block the commit in a Git hook.

**Config extraction**: `grep -P "^ServerName\s+" /etc/apache2/*.conf` extracts
Apache virtual host names across all config files using a PCRE pattern, giving a quick
inventory without reading full files.

**Counting occurrences by file**: `grep -rc "TODO" ./src` prints a per-file count of
TODO comments, useful for prioritizing debt cleanup.

## When should it NOT be used?

- **Structured data (JSON, CSV, XML)**: `grep` matches text, not structure. Use `jq`
  for JSON, `awk`/`csvkit` for CSV, and `xmllint`/`xmlstarlet` for XML. A `grep` on
  JSON can match inside a value when you intended to match a key, silently returning
  wrong results.
- **Very large log streams in real time**: `grep` reads files sequentially. For tailing
  a live log and filtering, `tail -f | grep` works but `multitail` or purpose-built
  log tools handle rotation and multiple streams better.
- **Binary files**: `grep` on a binary file produces unpredictable output. Use `strings`
  to extract printable characters first, or `file` to confirm the file type before
  searching.
- **When you already know the line number**: if you know exactly where to look, use
  `sed -n 'Np'` or open the file in an editor — using `grep` to re-discover a location
  you already know is unnecessary noise.

## Alternatives

- **`rg` (ripgrep)**: significantly faster on large codebases; respects `.gitignore`
  by default; supports Unicode correctly; written in Rust. Prefer `rg` for
  interactive developer use on projects with a `.gitignore`.
- **`ag` (The Silver Searcher)**: similar to `rg` in spirit, slightly older; still
  widely available and faster than `grep -r` on large trees.
- **`awk`**: when you need pattern matching combined with field extraction,
  arithmetic, or formatted output, `awk` handles all three in one pass where
  `grep | cut | awk` would otherwise chain three tools.
- **`sed`**: when the goal is to match and then transform lines (not just filter),
  `sed` is the appropriate tool.

## How it works internally

`grep` reads input line-by-line and tests each line against the compiled pattern.
The core matching engine is finite automaton (FA)-based: the regular expression is
compiled into a non-deterministic FA (NFA) and then simulated or converted to a
deterministic FA (DFA), depending on the implementation.

GNU `grep` uses a hybrid approach: a Boyer-Moore-style fast-path for fixed strings
and a DFA for general patterns, falling back to an NFA backtracking engine only for
features that DFAs cannot represent (like backreferences). This is why `grep -F` is
notably faster than `grep` with a regex for literal string searches — it bypasses
the automaton entirely and uses a direct string-search algorithm.

`grep`'s exit codes are meaningful and should be used in scripts:

- `0` — one or more matches found.
- `1` — no matches found (not an error; the search succeeded, there just was nothing).
- `2` — a genuine error (file not found, permission denied, syntax error in pattern).

## Performance Notes

- Use `grep -F` when searching for a literal string — it skips regex compilation and
  uses a fast substring search algorithm.
- Use `rg` instead of `grep -r` for recursive searches on large codebases; `rg` is
  routinely 5–10× faster because it uses parallel threads and skips `.gitignore`d files.
- `grep -l` (filenames only) is faster than `grep` (full lines) when you only need
  to know which files match — it stops reading a file after the first match.
- Avoid `grep -P` (PCRE) when `-E` (ERE) is sufficient. PCRE has more expressive
  power but relies on a backtracking engine that can exhibit catastrophic backtracking
  on pathological inputs.

## Security Notes

- Patterns from untrusted input must be treated as untrusted regex. A crafted pattern
  with excessive quantifiers can cause catastrophic backtracking (ReDoS) in PCRE mode
  (`-P`). Use `-F` for literal string matching from untrusted sources.
- `grep -r` on world-readable files may expose more than intended in a script's output.
  Be explicit about which directories you recurse into.
- Exit code `1` (no matches) is not an error, but shell scripts using `set -e` will
  treat it as one. Use `grep ... || true` in `set -e` scripts where a no-match result
  is acceptable.

## Common Mistakes

- **Forgetting to quote the pattern**: `grep a b c` searches files `b` and `c` for
  the pattern `a`, but `grep a * b` expands `*` via the shell before `grep` sees it.
  Always quote patterns: `grep "pattern" file`.
- **Using `grep -r` on a project with `.gitignore`**: `grep -r` ignores `.gitignore`
  and searches `node_modules/`, `.git/`, and build artifacts. Use `rg` or add
  `--exclude-dir` explicitly.
- **`grep` on binary files**: produces garbled output and may appear to return false
  positives. Check file type first, or use `grep -a` to force text mode only when you
  know the binary contains readable text sections.
- **Confusing exit codes in scripts**: `grep` returning `1` means "no matches," not
  "error." The distinction matters when `grep` is used in a conditional or with
  `set -e`.

## Best Practices

- Use `grep -q` for existence checks in scripts — it produces no output, exits
  immediately on the first match, and makes intent clear.
- Use `grep -n` during interactive debugging so you can jump to the correct line in an
  editor immediately.
- Prefer `rg` for project-wide searches and `grep` for quick one-off checks on
  specific files, where its universal availability is an advantage over `rg`.
- When building a pipeline, prefer the most specific tool at each stage: `grep` to
  filter, `awk` to extract fields, `sort | uniq -c` to count.
- Document the intent of a `grep` pattern in a comment or script variable name when
  the regex is non-obvious — a raw regex three months later is harder to audit.

## Interview Questions

**Q:** What is the difference between `grep`, `egrep`, and `fgrep`?
**A:** `egrep` is equivalent to `grep -E` (extended regular expressions, which support
`+`, `?`, `|`, and `()` without backslash-escaping). `fgrep` is equivalent to `grep -F`
(fixed string, no regex interpretation at all). Both are legacy wrappers; modern scripts
should use `grep -E` or `grep -F` explicitly.

**Q:** What do `grep`'s exit codes mean?
**A:** `0` means at least one match was found. `1` means no matches were found (not an
error). `2` means a real error occurred (bad pattern syntax, file not found). This
matters in shell scripts: `grep ... || echo "not found"` will print "not found" on
exit code 1, which is often the desired behavior, not a failure.

**Q:** How would you search for all files containing a pattern in a large repository
without searching `node_modules/` or `.git/`?
**A:** Use `rg "pattern"` — ripgrep respects `.gitignore` by default. With plain
`grep`: `grep -r --exclude-dir=node_modules --exclude-dir=.git "pattern" .`

**Q:** What is catastrophic backtracking and when does it apply to `grep`?
**A:** Catastrophic backtracking occurs when a regex engine's backtracking algorithm
explores exponentially many possible match paths for a pathological input. It applies
to `grep -P` (PCRE), which uses a backtracking NFA. GNU `grep`'s default engine uses
a DFA and is immune to backtracking. For inputs from untrusted sources, avoid `-P` or
validate/limit input length.

## Practice Problems

**Problem:** Find all lines in `/var/log/auth.log` that contain "Failed password"
and print only the IP addresses from those lines.
**Hint:** Use `-o` to print only the matched portion, and a regex that matches an IPv4
address.
**Solution:** `grep -oP "Failed password.*from \K\d{1,3}(\.\d{1,3}){3}" /var/log/auth.log`
(PCRE with `\K` to reset the match start, so only the IP is printed.)

**Problem:** Count how many `.js` files under `./src` contain at least one `console.log` call.
**Hint:** Use `-r`, `--include`, and `-l` together, then pipe to `wc -l`.
**Solution:** `grep -rl "console\.log" ./src --include="*.js" | wc -l`

**Problem:** Search for the word "error" in a file using `grep` in a shell script
with `set -e` enabled, without causing the script to abort when no matches are found.
**Hint:** A no-match exit code is `1`, which `set -e` treats as a failure.
**Solution:** `grep -q "error" app.log || true` — the `|| true` ensures the combined
exit code is always 0, regardless of whether `grep` found a match.

## References

- [grep man page — man7.org](https://www.man7.org/linux/man-pages/man1/grep.1.html)
- [GNU grep manual](https://www.gnu.org/software/grep/manual/grep.html)
