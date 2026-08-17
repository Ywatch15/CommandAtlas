---
slug: awk
name: awk
aliases: []
category: text-processing
tags:
  - awk
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
  - extract column from text
  - process structured text file
relatedCommands: [jq]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`awk` is a domain-specific programming language designed for text processing, pattern scanning, and data extraction from structured records.

## Why does it exist?

`awk` provides record- and field-based text manipulation, enabling inline arithmetic, line counting, column extraction, and conditional formatting.

## Syntax

```bash
awk [options] 'pattern { action }' [file...]
```

## Flags

| Flag | Description                           | Example                                   |
| ---- | ------------------------------------- | ----------------------------------------- |
| `-F` | Define field separator regex          | `awk -F':' '{print $1}' /etc/passwd`      |
| `-v` | Assign shell variable to awk variable | `awk -v var="val" '{print var, $0}' file` |

## Examples

```bash
awk -F':' '{print $1, $6}' /etc/passwd
```

> Extracts username (field 1) and home directory (field 6) from `/etc/passwd`.

## Real-World Scenarios

**Log aggregation summaries**: Summing response sizes or counting HTTP status codes from access log files.

## When should it NOT be used?

- **JSON parsing**: `jq` is designed for JSON data where field ordering and nested objects break delimiter splitting.

## Alternatives

- **`cut`**: Simple delimiter-based column extraction utility.

## How it works internally

`awk` reads records (lines by default), splits them into field variables (`$1`, `$2`...), and evaluates pattern-action rules in sequence.

## Performance Notes

Highly efficient for large text files and stream filtering.

## Security Notes

Ensure dynamic inputs passed into `awk` scripts via `-v` do not contain unescaped quotes or malicious instructions.

## Common Mistakes

- **Forgetting `-F` for non-whitespace delimiters**: Default field separator is whitespace (spaces/tabs).

## Best Practices

- Use `BEGIN` and `END` blocks for initializing counters and printing final aggregated results.

## Interview Questions

**Q:** How do you print the 3rd column of a space-delimited file using `awk`?
**A:** `awk '{print $3}' file.txt`

## Practice Problems

**Problem:** Calculate total sum of numbers in column 2 of `data.txt`.
**Solution:** `awk '{sum+=$2} END {print sum}' data.txt`

## References

- [GNU awk manual](https://www.gnu.org/software/gawk/manual/gawk.html)
