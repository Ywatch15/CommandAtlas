---
slug: sed
name: sed
aliases: []
category: regex
tags:
  - sed
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
  - replace text in file
  - stream editor text replacement
relatedCommands:
  - jq
  - yq
alternatives:
  - yq
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`sed` (stream editor) parses and transforms text streams using regular expression replacement commands.

## Why does it exist?

`sed` enables non-interactive file editing, string substitution, and line filtering in shell pipelines.

## Syntax

```bash
sed [options] 'script' [input-file...]
```

## Flags

| Flag | Description                                  | Example                           |
| ---- | -------------------------------------------- | --------------------------------- |
| `-i` | Edit files in-place                          | `sed -i 's/old/new/g' config.txt` |
| `-E` | Use extended regular expressions (ERE)       | `sed -E 's/foo                    | bar/baz/g' file.txt` |
| `-n` | Suppress automatic printing of pattern space | `sed -n '/pattern/p' file.txt`    |

## Examples

```bash
sed 's/localhost/127.0.0.1/g' config.yaml
```

> Replaces all occurrences of "localhost" with "127.0.0.1" in stdout.

## Real-World Scenarios

**Updating version strings in CI/CD**: Automatically updating release version strings in files before publishing build artifacts.

## When should it NOT be used?

- **Multi-field structured data processing**: `awk` or `jq` handle column-based or JSON data structure manipulation cleaner than `sed`.

## Alternatives

- **`sd`**: Intuitive, modern replacement for `sed`.

## How it works internally

`sed` reads input line by line into a pattern space buffer, executes matched transformation instructions, and prints output.

## Performance Notes

Fast line-by-line stream editing with low memory overhead.

## Security Notes

Be cautious with `sed -i` on mounted network volumes or symlinked configuration files.

## Common Mistakes

- **Differences between GNU sed and BSD sed (macOS)**: macOS `sed` requires an explicit empty string argument for `-i` (`sed -i '' 's/old/new/' file`).

## Best Practices

- Test replacement patterns on stdout without `-i` first before modifying target files in-place.

## Interview Questions

**Q:** How do you substitute all occurrences of string `A` with `B` in a file in-place on Linux?
**A:** `sed -i 's/A/B/g' filename`

## Practice Problems

**Problem:** Delete all lines matching `# comment` from `app.conf`.
**Solution:** `sed '/# comment/d' app.conf`

## References

- [GNU sed manual](https://www.gnu.org/software/sed/manual/sed.html)
