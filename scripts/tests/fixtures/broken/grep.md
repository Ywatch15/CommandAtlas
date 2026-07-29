---
slug: grep
name: grep
category: notavalidcategory
difficulty: superhard
supportedOS: [linux, macos]
status: published
---

## What is it?

`grep` searches for patterns in text.

## Why does it exist?

To filter lines matching a pattern from files or streams.

## Syntax

```bash
grep [options] pattern [file...]
```

## Flags

| Flag | Description      | Example            |
| ---- | ---------------- | ------------------ |
| `-r` | Recursive search | `grep -r "term" .` |

## Examples

```bash
grep -r "TODO" ./src
```

> Searches recursively for the string "TODO" in the src directory.

## Real-World Scenarios

Use `grep` to find all files containing a specific function name across a codebase.

## When should it NOT be used?

Do not use `grep` for binary files or structured data formats (JSON, CSV) — use purpose-built tools like `jq` instead.

## Alternatives

`rg` (ripgrep) is significantly faster for large codebases and respects `.gitignore` by default.

## How it works internally

`grep` reads each line, applies the pattern as a regular expression (or fixed string with `-F`), and outputs matching lines.

## Performance Notes

For large codebases, prefer `rg` (ripgrep). `grep -r` does not respect `.gitignore`.

## Security Notes

No specific security considerations beyond standard file-permission awareness.

## Common Mistakes

Forgetting to quote the pattern when it contains spaces or shell-special characters.

## Best Practices

Use `grep -n` to show line numbers. Use `grep -l` to list only matching filenames.

## Interview Questions

**Q:** What flag makes grep search recursively?
**A:** `-r` or `-R`.

## Practice Problems

**Problem:** Find all lines containing "error" in all `.log` files in the current directory.
**Hint:** Use `-r` and specify the file pattern.
**Solution:** `grep -r "error" *.log`

## References

- [grep man page](https://www.man7.org/linux/man-pages/man1/grep.1.html)

NOTE: this file is intentionally missing the "References" section wait no it's there
but it has TWO problems:

1. category "notavalidcategory" is not a canonical topic slug (R07)
2. difficulty "superhard" is not a valid enum value (R06)
