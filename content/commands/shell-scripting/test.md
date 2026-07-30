---
slug: test
name: test
aliases: []
category: shell-scripting
tags: [shell, test, condition, evaluate]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'check file existence in script'
  - 'evaluate conditional expression'
relatedCommands: [echo]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-07-29
author: commandatlas
---

## What is it?

`test` evaluates conditional expressions and returns exit status `0` (true) or `1` (false). It is also invoked via the `[` bracket syntax.

## Why does it exist?

`test` provides conditional evaluation primitives for file types, string comparisons, and integer checks inside shell `if` and `while` statements.

## Syntax

```bash
test EXPR
[ EXPR ]
```

## Flags

| Flag | Description                               | Example               |
| ---- | ----------------------------------------- | --------------------- |
| `-f` | True if file exists and is a regular file | `test -f /etc/passwd` |
| `-d` | True if file exists and is a directory    | `test -d /var/log`    |
| `-z` | True if string length is zero             | `test -z "$VAR"`      |

## Examples

```bash
if [ -f "/etc/config.json" ]; then echo "Config exists"; fi
```

> Checks if `/etc/config.json` is a regular file before printing message.

## Real-World Scenarios

**Guarding script execution**: Verifying required parameters or directory paths exist before starting heavy automation routines.

## When should it NOT be used?

- **Bash-specific advanced regex matching**: `[[ ]]` (extended test command) supports pattern matching and regex comparison in Bash.

## Alternatives

- **`[[ ]]`**: Bash extended conditional evaluation construct.

## How it works internally

`test` evaluates expression operands sequentially and exits with return code 0 or 1. Usually built into shell binaries.

## Performance Notes

Negligible overhead when executed as a shell builtin.

## Security Notes

Always wrap string variable references in double quotes (e.g. `"$VAR"`) to prevent word splitting or syntax errors on empty strings.

## Common Mistakes

- **Forgetting spaces around brackets**: Writing `[-f file]` instead of `[ -f file ]`.

## Best Practices

- Always quote variables inside `[ ]` tests to handle spaces and empty values cleanly.

## Interview Questions

**Q:** What is the difference between `[` and `[[` in Bash?
**A:** `[` is POSIX standard command syntax requiring variable quoting, whereas `[[` is Bash keyword syntax supporting `&&`, `||`, and regex (`=~`).

## Practice Problems

**Problem:** Test if variable `MY_VAR` is non-empty.
**Solution:** `test -n "$MY_VAR"` or `[ -n "$MY_VAR" ]`

## References

- [GNU test documentation](https://www.gnu.org/software/coreutils/manual/html_node/test-invocation.html)
