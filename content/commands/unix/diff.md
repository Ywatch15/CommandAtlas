---
slug: diff
name: diff
aliases: [file compare]
category: unix
tags: [linux, diff, text-processing, files, comparison]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'compare two files line by line linux'
  - 'generate patch file diff'
  - 'compare two directories recursively'
  - 'side by side file comparison bash'
  - 'show unified diff bash'
relatedCommands: [patch]
alternatives: []
status: draft
---

## What is it?

`diff` is a cornerstone POSIX command-line utility used to compare the contents of two files or directories line by line. It calculates the mathematically optimal set of changes—additions, deletions, and modifications—required to transform the first file into the second. Beyond simple visual inspection, `diff` generates structured delta outputs (patches) that can be algorithmically applied by the `patch` command, forming the foundational mechanics of early version control systems.

## Why does it exist?

In the early days of Unix development, sharing code updates meant sending entire monolithic source code files over slow, 300-baud acoustic modems. If a developer altered 5 lines in a 10,000-line C program, transmitting the whole file was economically unfeasible. `diff` was engineered by Douglas McIlroy to solve this transmission bottleneck. By analyzing the files and extracting _only_ the specific lines that changed (the delta), developers could transmit a 200-byte patch file instead of a 200-Kilobyte source file. Today, it remains heavily utilized for system administration to audit configuration drift across servers.

## Syntax

```bash
diff [OPTION]... FILES
```

## Flags

| Flag                         | Description                                                                                                                      | Example                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `-u`, `--unified`            | Outputs the differences in the unified format, displaying 3 lines of surrounding context. The absolute industry standard.        | `diff -u old.py new.py`            |
| `-c`, `--context`            | Outputs the differences in the context format (an older format showing blocks of old and new text separately).                   | `diff -c file1 file2`              |
| `-y`, `--side-by-side`       | Prints the two files in two columns side-by-side, visually highlighting differences with `                                       | `, `<`, or `>`.                    | `diff -y conf_A conf_B` |
| `-r`, `--recursive`          | Compares entire directories recursively. Matches filenames and runs `diff` on identically named files.                           | `diff -ru dir_v1/ dir_v2/`         |
| `-i`, `--ignore-case`        | Ignores case differences when evaluating line equality (e.g., treating "Server" and "server" as identical).                      | `diff -i list1 list2`              |
| `-w`, `--ignore-all-space`   | Completely ignores all white space. "a b" matches "ab". Crucial when code is reformatted (tabs vs spaces).                       | `diff -w code1.c code2.c`          |
| `-B`, `--ignore-blank-lines` | Ignores changes that consist exclusively of inserted or deleted blank lines.                                                     | `diff -B text1 text2`              |
| `-q`, `--brief`              | Suppresses detailed output. Only prints a single line stating whether the files differ or are identical.                         | `diff -q large1.dat large2.dat`    |
| `-N`, `--new-file`           | In directory comparisons, treats absent files as empty files. Essential when generating patches that include entirely new files. | `diff -ruN v1/ v2/ > update.patch` |
| `--color`                    | (GNU only) Injects ANSI color escape sequences into the output, highlighting additions in green and deletions in red.            | `diff -u --color old new`          |

## Examples

```bash
diff file1.txt file2.txt
```

> The legacy invocation. Outputs in the traditional "normal" format (e.g., `2,4c2,4`). It uses cryptic commands like `a` (add), `c` (change), and `d` (delete) to describe how to edit file1. Because it lacks context lines, it is extremely difficult for humans to read and is rarely used today.

```bash
diff -u config.old config.new
```

> The modern unified diff. This is the format popularized by Git. It prepends `-` (red) to lines deleted from the old file, and `+` (green) to lines added in the new file. It includes 3 lines of untouched context around every change, making it instantly readable.

```bash
diff -ruN /etc/nginx/ /opt/backup/nginx_conf/ > nginx_restore.patch
```

> System auditing and patch generation. It crawls two directory trees (`-r`), generates a unified patch (`-u`), and ensures that if a completely new configuration file was added to `/etc/nginx`, its entire contents are captured in the patch file (`-N`). The resulting `.patch` file can be executed on another server to perfectly sync its configurations.

```bash
diff -y -W 150 script_v1.sh script_v2.sh | less
```

> Visual side-by-side analysis. The `-y` flag splits the terminal down the middle, rendering `v1` on the left and `v2` on the right. The `-W 150` flag expands the width to 150 characters to prevent aggressive line wrapping, and piping to `less` allows the administrator to scroll through the massive comparison cleanly.

```bash
if diff -q file1.bin file2.bin >/dev/null; then echo "Match"; fi
```

> Scripted idempotency checks. The `-q` (brief) flag is highly optimized. It exits and returns a status code without generating textual deltas. In a bash script, this cleanly branches logic based on whether two files have drifted from parity.

## Real-World Scenarios

**Auditing Configuration Drift**

```bash
diff -u /etc/ssh/sshd_config <(ssh other_server "cat /etc/ssh/sshd_config")
```

> An administrator suspects a fleet of servers has fallen out of configuration sync. By leveraging bash process substitution (`<()`), `diff` pulls the configuration file directly over an SSH stream into memory, instantly calculating the delta between the local server's file and the remote server's file without generating temporary files.

**Stripping Formatting Noise**

```bash
diff -uwB old_code.js new_code.js
```

> A developer runs a codebase through a linter (like Prettier) which massively alters indentation, tabs, and blank lines. A standard `diff` outputs a 5,000-line change. By applying `-w` (ignore all space) and `-B` (ignore blank lines), `diff` strips away the formatting noise, returning a 10-line output revealing exclusively the _actual functional code_ that was altered.

## When should it NOT be used?

- **Binary File Comparison:** **Do not use `diff` to find differences in `.iso` or compiled binaries.** `diff` loads data line-by-line expecting newline characters (`\n`). On binaries, it will simply output `Binary files A and B differ`. Use `cmp` (which compares byte-by-byte) or `vbindiff` for binary analysis.
- **Structured Data (JSON/XML):** **Do not use `diff` on minified JSON.** If a 50MB JSON payload is contained on a single line, `diff` evaluates the entire 50MB string as one monolithic chunk. It will output the entire 50MB string as "deleted" and the new 50MB string as "added", offering zero granular visibility. Use `jq` to prettify the JSON first, or use specialized tools like `jd` (JSON Diff).

## Alternatives

- **`git diff`:** **The modern developer standard.** Even outside of git repositories, running `git diff --no-index fileA fileB` is heavily preferred by developers. It utilizes superior coloring algorithms, intra-line word diffing, and uses a built-in pager (`less`) automatically.
- **`cmp`:** **Best for binaries and scripts.** `cmp file1 file2` is massively faster than `diff`. It stops reading the absolute microsecond it encounters a single differing byte, making it the mathematically superior tool for boolean `if` statements verifying identical files.
- **`vimdiff`:** **Best for interactive merging.** Opens both files in side-by-side Vim split panes, visually highlighting differences and allowing the user to push/pull changes interactively (`dp` / `do`).

## How it works internally

`diff` utilizes the **Myers Longest Common Subsequence (LCS)** algorithm, published by Eugene W. Myers in 1986.

When executed, `diff` does not perform a simple line-by-line string comparison (like `awk`). If you delete line 2, line 3 shifts up. A naive comparison would flag lines 2 through 10,000 as completely different because they are offset.

Instead, `diff` loads both files into memory. It mathematically maps the lines to an $X/Y$ edit graph. It searches for the Longest Common Subsequence—the largest possible set of lines that appear in both files in the exact same order, regardless of what was inserted between them.

Once the LCS is found, `diff` knows those lines are identical. Everything _not_ in the LCS is classified as an insertion or a deletion. This is why `diff` can brilliantly re-synchronize its tracking even if you copy-paste a massive 500-line block into the middle of a document.

The time complexity is $O(ND)$, where $N$ is the sum of the lengths of the sequences and $D$ is the size of the minimum edit script. While highly optimized, this mathematical graph generation forces `diff` to hold massive arrays in user-space RAM, which can trigger OOM killers on gigabyte-scale text files.

## Performance Notes

- **Memory Exhaustion:** Because the Myers algorithm must construct an edit graph, `diff` loads the entirety of both files into RAM. Diffing two 5GB log files will consume 10GB+ of RAM and execute extremely slowly. For massive files, `cmp` (which streams sequentially) is mandatory if you only need a boolean match.
- **Speeding up via Hashing:** Modern GNU `diff` calculates a hash (like MD5) of the lines. Instead of executing expensive `strcmp()` calls on 1000-character lines repeatedly, it compares the numerical hashes of the lines first. If the hashes mismatch, it instantly knows the lines differ.

## Security Notes

- **Information Leakage:** When generating `.patch` files using `diff -ruN`, the patch file explicitly contains the raw plaintext of the lines added or removed. If you hardcoded a password into a script, removed it, and then ran `diff` to create a patch of the fix, the generated patch file _contains the deleted plaintext password_. Never distribute patch files without auditing their contents.

## Common Mistakes

- **Using default `diff` instead of `-u`**
  - _Mistake:_ Running `diff old.txt new.txt > update.patch` and trying to use `patch < update.patch` later.
  - _Why:_ The default "normal" format uses raw line numbers (e.g., `4c4`). If the target file has been modified even slightly by another user (shifting the line numbers down by 1), the `patch` utility will blindly overwrite the wrong line, corrupting the code. The unified format (`-u`) includes the surrounding text context, allowing `patch` to use fuzzy-matching to find the correct line even if the line numbers shifted, guaranteeing safety.
- **Reversing the file order**
  - _Mistake:_ Typing `diff new_version.txt old_version.txt`.
  - _Why:_ `diff` calculates how to turn File 1 into File 2. If you reverse the order, the output will show all your newly written code as red "deleted" lines (`-`), and all the old code you just removed as green "added" lines (`+`). The universal standard is `diff [OLD_FILE] [NEW_FILE]`.

## Best Practices

- **Adopt `git diff --no-index`:** If `git` is installed on your server, train yourself to use it for arbitrary files. It provides superior intra-line highlighting (showing exactly which _word_ on the line changed) and native pagination, drastically improving the debugging experience over raw GNU `diff`.
- **Always use `-u`:** Never execute `diff` without the `-u` flag. Unified diffs are the absolute standard format understood by human developers, code review tools (like GitHub/GitLab), and automated deployment patching engines.

## Interview Questions

**Q: You generate a patch using `diff -r dir_old/ dir_new/ > update.patch`. In `dir_new`, you created a completely brand new configuration file. However, when you apply this patch to a third server, the new file is not created. What flag did you forget during the diff generation?**
**A:** You forgot the `-N` (or `--new-file`) flag. When `diff` encounters a file in `dir_new` that does not exist in `dir_old`, its default behavior is to simply print a warning ("Only in dir_new: new_config.json") and skip it entirely. The `-N` flag forces `diff` to treat the missing file in `dir_old` as an empty file, generating a massive block of `+` additions in the patch payload, ensuring the file is physically created when the patch is applied.

**Q: Explain why `diff` struggles to provide meaningful output when run against a minified JSON or Javascript file (a file where all line breaks have been removed), and what strategy you would use to fix it.**
**A:** `diff` is a line-oriented comparison tool. It uses newline (`\n`) characters as boundaries to break the file into discrete tokens for its comparison algorithm. A minified file is technically a single, massive 10,000-character line. `diff` evaluates it, sees a single character changed, and outputs the entire 10,000-character string as deleted, and the new one as added, providing zero granular context. To fix this, you must run the files through a formatter (like `jq . file.json` or `prettier`) to re-inject standard newline formatting before piping them into `diff`.

## Practice Problems

**Problem:** You are comparing two large text files: `data_v1.txt` and `data_v2.txt`. You suspect someone changed tabs to spaces and added a bunch of blank lines, but the actual textual data hasn't changed. Write the command to generate a unified diff that strictly ignores all whitespace differences and all blank line differences.
**Hint:** Combine the unified flag, the ignore-all-space flag, and the ignore-blank-lines flag.
**Solution:**

```bash
diff -uwB data_v1.txt data_v2.txt
```

**Problem:** You are writing an automation script. You simply need to verify if `/etc/app.conf` perfectly matches `/mnt/backup/app.conf`. You want the command to output absolutely nothing and just return a boolean exit code (0 for match, 1 for mismatch) so you can use it in an `if` statement.
**Hint:** Use the flag designed for brief, quiet comparisons, and redirect standard output to `/dev/null`.
**Solution:**

```bash
diff -q /etc/app.conf /mnt/backup/app.conf > /dev/null
```

## References

- [diff(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/diff)
- [GNU Diffutils Manual](https://www.gnu.org/software/diffutils/manual/diffutils.html)
