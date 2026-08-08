---
slug: cat
name: cat
aliases: []
category: unix
tags:
  - cat
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - read file content
  - concatenate files
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`cat` (concatenate) reads files sequentially and writes them to standard output.

## Why does it exist?

`cat` provides a primitive shell utility for printing file contents and combining multiple file streams together.

## Syntax

```bash
cat [options] [file...]
```

## Flags

| Flag | Description                     | Example           |
| ---- | ------------------------------- | ----------------- |
| `-n` | Number all output lines         | `cat -n file.txt` |
| `-b` | Number non-blank lines          | `cat -b file.txt` |
| `-s` | Squeeze consecutive blank lines | `cat -s file.txt` |

## Examples

```bash
cat file1.txt file2.txt > combined.txt
```

> Concatenates `file1.txt` and `file2.txt` into `combined.txt`.

## Real-World Scenarios

**Inspecting configuration files**: Quick viewing of short configuration files directly in the terminal.

## When should it NOT be used?

- **Paging large files**: Use `less` or `more` to navigate multi-page logs or documents without flooding the terminal buffer.

## Alternatives

- **`bat`**: Modern `cat` clone with syntax highlighting and Git integration.

## How it works internally

`cat` opens the input files using `open(2)`, reads input buffers, and writes output buffers directly to stdout (`1`).

## Performance Notes

Sequential file reading optimized via buffered I/O system calls.

## Security Notes

Avoid running `cat` on binary files as terminal escape sequences can corrupt terminal rendering settings or execute control codes.

## Common Mistakes

- **Useless use of cat (UUOC)**: Running `cat file.txt | grep pattern` instead of `grep pattern file.txt`.

## Best Practices

- Use `less` for large files to avoid unreadable terminal scrolling.

## Interview Questions

**Q:** What is "Useless Use of Cat"?
**A:** Using `cat` to pipe a single file into a command that already accepts a filename argument (e.g. `cat file | grep x`).

## Practice Problems

**Problem:** View `server.log` with line numbers printed next to each line.
**Solution:** `cat -n server.log`

## References

- [cat man page](https://www.man7.org/linux/man-pages/man1/cat.1.html)
