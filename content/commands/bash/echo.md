---
slug: echo
name: echo
aliases: []
category: bash
tags: [bash, print, output]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'print text to terminal'
  - 'output message in script'
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-07-29
author: commandatlas
---

## What is it?

`echo` prints strings or variable contents to standard output.

## Why does it exist?

`echo` provides a simple way to display text messages, inspect shell variables, and output formatted lines in scripts and interactive terminal sessions.

## Syntax

```bash
echo [options] [string...]
```

## Flags

| Flag | Description                                 | Example                  |
| ---- | ------------------------------------------- | ------------------------ |
| `-n` | Do not output trailing newline              | `echo -n "Hello"`        |
| `-e` | Enable interpretation of backslash escapes  | `echo -e "Line1\nLine2"` |
| `-E` | Disable interpretation of backslash escapes | `echo -E "No\nEscape"`   |

## Examples

```bash
echo "Hello World"
```

> Prints "Hello World" followed by a newline.

```bash
echo -e "Status:\tOK"
```

> Interprets `\t` as a tab character.

## Real-World Scenarios

**Logging script progress**: Printing status messages like `echo "Starting build..."` inside automated build scripts.

## When should it NOT be used?

- **Complex formatted output**: `printf` is preferred over `echo` when strict formatting or portable handling of escape characters across shell implementations is required.

## Alternatives

- **`printf`**: Formatted printing with predictable cross-shell behavior.

## How it works internally

`echo` is usually a shell builtin in Bash, executing directly within the shell process without spawning a subshell or external binary.

## Performance Notes

As a shell builtin, `echo` has negligible overhead because it avoids process creation.

## Security Notes

Avoid echoing unquoted user inputs directly into evaluation contexts or sensitive variable values in logs.

## Common Mistakes

- **Assuming `-e` behavior is identical everywhere**: Builtin `echo` behavior can differ between shells (Bash vs zsh vs dash).

## Best Practices

- Use `printf` when portability and precise control over formatting/newlines are necessary.

## Interview Questions

**Q:** What is the difference between `echo` and `printf` in Bash?
**A:** `echo` is simple but shell-dependent for flags like `-e`, whereas `printf` strictly follows POSIX formatting rules.

## Practice Problems

**Problem:** Output "Loading..." without a newline character.
**Solution:** `echo -n "Loading..."`

## References

- [GNU Coreutils echo documentation](https://www.gnu.org/software/coreutils/manual/html_node/echo-invocation.html)
