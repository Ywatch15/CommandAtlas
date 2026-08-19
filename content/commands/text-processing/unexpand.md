---
slug: unexpand
name: unexpand
aliases: []
category: cloud-cli
tags:
  - text-processing
  - formatting
  - whitespace
  - coreutils
  - linux
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
  - convert spaces to tabs linux
  - replace leading spaces with tabs
  - fix makefile indentation command
  - minify text file whitespace
  - unexpand command usage
relatedCommands:
  - expand
  - sed
  - awk
  - tr
  - fmt
alternatives:
  - sed
  - awk
status: draft
---

## What is it?

`unexpand` is a POSIX-compliant command-line utility that reads standard input or specified files and converts sequences of space characters into corresponding tab characters. It is the direct mathematical inverse of the `expand` command, structurally enforcing tab-based indentation across codebases or text datasets.

## Why does it exist?

In the UNIX ecosystem, certain build systems and parsers (most notoriously `make` and its `Makefiles`) strictly require literal tab characters (`\t`) for functional logic and target execution. When files are edited across disparate IDEs or copied from web browsers, tabs are frequently flattened into spaces, completely breaking the compilation logic. `unexpand` exists to surgically repair this whitespace corruption, converting redundant space blocks back into native hardware tabs, while simultaneously reducing the physical byte size of text files by condensing multiple space characters into single tab bytes.

## Syntax

```bash
unexpand [OPTION]... [FILE]...
```

## Flags

| Flag           | Description                                                                                | Example                           |
| -------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| `-a`           | Converts _all_ sequences of two or more spaces into tabs, not just leading/initial spaces. | `unexpand -a code.c`              |
| `--all`        | The GNU long-form equivalent of the `-a` flag.                                             | `unexpand --all code.c`           |
| `-t <N>`       | Explicitly sets the tab stops to be `<N>` characters apart (defaults to 8). Implies `-a`.  | `unexpand -t 4 script.py`         |
| `--tabs=<N>`   | The GNU long-form equivalent of the `-t` flag.                                             | `unexpand --tabs=4 script.py`     |
| `-t <list>`    | Specifies an exact, comma-separated list of absolute column positions for tab stops.       | `unexpand -t 4,8,12 file.txt`     |
| `--first-only` | Forces `unexpand` to convert only leading whitespace (overriding `-a`).                    | `unexpand -t 4 --first-only file` |
| `--help`       | Outputs brief usage documentation and supported command-line options.                      | `unexpand --help`                 |
| `--version`    | Displays version information and copyright details for the coreutils package.              | `unexpand --version`              |

_(Note: `unexpand` is a highly focused, single-purpose utility. The flags above represent its complete operational spectrum within GNU coreutils.)_

## Examples

```bash
unexpand Makefile > Makefile.fixed
```

> This is the default execution. It reads the file and converts _only_ leading sequences of spaces (at the very beginning of the lines) into tabs, assuming a default tab width of 8 spaces. This is specifically designed to repair broken Makefiles safely without corrupting spaced strings later in the line.

```bash
unexpand -a data.txt
```

> By appending the `-a` (all) flag, `unexpand` aggressively scans the entire line. Any sequence of two or more spaces, regardless of where they appear in the text, is mathematically evaluated and replaced with the minimum required number of tab characters.

```bash
unexpand -t 4 source.js
```

> This explicitly modifies the tab-stop width. Because JavaScript developers typically use 4 spaces for indentation rather than the legacy UNIX 8-space default, passing `-t 4` instructs the engine to convert every block of 4 spaces into a single tab character. (Note: Using `-t` automatically enables `-a` under the hood).

```bash
cat dirty_code.sh | unexpand -t 4 --first-only > clean_code.sh
```

> This creates a highly safe formatter. It establishes a 4-space tab width (`-t 4`), but forcibly overrides the aggressive "all" behavior by explicitly declaring `--first-only`. This ensures that only the structural code indentation is converted to tabs, while spaces inside echo statements or variable assignments are safely ignored.

```bash
unexpand -t 10,20,30 structured.txt
```

> This establishes absolute, non-uniform tab stops. Instead of a repeating interval, the utility converts spaces into tabs strictly aligned to physical columns 10, 20, and 30, which is useful for cleaning up legacy fixed-width mainframe reports.

## Real-World Scenarios

**Automated Makefile Repair**

```bash
find . -name "Makefile" -exec unexpand -t 8 --first-only {} > {}.tmp \; -exec mv {}.tmp {} \;
```

> DevOps engineers managing massive C/C++ repositories use `find` paired with `unexpand` to automatically repair `Makefile` indentation globally. This guarantees that developers utilizing misconfigured text editors don't break the CI/CD pipeline with space-indentation syntax errors.

**Minifying Log Files Before Archival**

```bash
cat application.log | unexpand -a > minified.log
```

> SREs processing heavily spaced, column-aligned application logs pipe the output through `unexpand -a` before compressing with `gzip`. By transforming blocks of 8 spaces (8 bytes) into single tabs (1 byte), the uncompressed file size is reduced by up to 20%, significantly accelerating network transfers and reducing storage costs.

## When should it NOT be used?

- **Parsing codebases where whitespace alignment is strictly structural:** **Reason:** Programming languages like Python strictly prohibit mixing spaces and tabs, and the PEP8 standard mandates spaces. Running `unexpand -a` on a Python repository will instantly break interpreter execution. **Use instead:** Code formatters like `black` or `autopep8`.
- **On files with complex, arbitrary internal string spacing:** **Reason:** Running `unexpand -a` will convert double spaces after periods in paragraphs into tabs, destroying grammatical formatting and printing alignment. **Use instead:** `--first-only` to restrict changes purely to indentation.

## Alternatives

- **`sed 's/ \{8\}/\t/g'`:** The Stream Editor. **Tradeoff:** `sed` can emulate `unexpand`, but it blindly searches for exact blocks of X spaces. `unexpand` is mathematically aware of column geometry; if a word ends at column 6, and is followed by 2 spaces, `unexpand` knows that crosses the 8-column tab stop and converts those 2 spaces to a tab. `sed` cannot do this natively.
- **`expand`:** The exact opposite. **Tradeoff:** `expand` replaces tabs with spaces. Used when uploading code to web systems or printers that misinterpret tab widths, guaranteeing absolute visual consistency everywhere.

## How it works internally

`unexpand` operates as a stateful, columnar text parser.

As it reads characters from standard input or a file descriptor, it maintains an internal integer representing the current "column" position of the terminal cursor, starting at column 0.

When the utility encounters a standard character, it increments the column counter by 1. When it encounters a space, it enters a buffering state, keeping track of how many consecutive spaces it has seen. When it encounters a tab stop boundary (which defaults to every 8th column: 8, 16, 24...), it evaluates the buffer. If the buffer contains two or more spaces that bridge the gap to this tab stop, it strips the spaces, outputs a single literal `\t` byte, and sets the column counter to the tab stop.

If `--first-only` is active (the default), this space-buffering logic completely disables the exact microsecond `unexpand` encounters the first non-blank character on the line, acting purely as an indentation repair tool.

## Performance Notes

- **Zero RAM Footprint:** `unexpand` operates strictly character-by-character on sequential streams. It possesses virtually no memory overhead and can process infinite pipelines or 100GB text files at the absolute maximum speed of the disk I/O controller.
- **CPU Mathematics:** The modulo arithmetic required to calculate tab stops introduces negligible CPU overhead. It executes exponentially faster than any equivalent regex substitution logic in `sed` or `awk`.

## Security Notes

- **No inherent security risks:** `unexpand` strictly performs read-only string manipulation and output generation. It does not execute code, modify file permissions, or perform network requests. The only risk is data corruption if applied to sensitive spacing-dependent configuration files (like YAML) with the aggressive `-a` flag.

## Common Mistakes

- **Using `-t` and destroying inner-line spacing:** Running `unexpand -t 4 file.sh`. **Why it's wrong:** The `-t` flag implicitly and automatically enables the `-a` (all) flag. This means `unexpand` will convert spaces _everywhere_ in the line, not just the beginning. This breaks `echo "    "` alignments. Always append `--first-only` when setting a custom tab width for code indentation.
- **Assuming it edits files in-place:** Running `unexpand Makefile`. **Why it's wrong:** `unexpand` strictly outputs to standard output (the terminal). The original file remains completely untouched. You must use standard shell redirection (`>`) to capture the output into a new file, and then `mv` it over the original.
- **Misunderstanding tab alignment math:** **Why it's wrong:** If a tab stop is 8, and a word is 7 characters long, followed by 1 space, `unexpand` will convert that 1 space into a tab (if `-a` is active) because it hits the geometric column 8 boundary. This often leads to highly confusing visual outputs if the terminal's tab width differs from the `unexpand` tab width.

## Best Practices

- When executing `unexpand` to enforce coding standards, universally enforce the `--first-only` flag to guarantee that only the logical left-margin indentation is altered, preserving the integrity of string literals and inline comments.
- Always explicitly define the tab width using `-t 4` or `-t 8` in automation scripts. Relying on the system default behavior makes scripts brittle, as different POSIX environments occasionally alter implicit defaults.

## Interview Questions

- _Query:_ What is the functional consequence of utilizing the `-t 4` flag in `unexpand`, and what hidden behavior does it automatically activate that might corrupt shell script output?
  - _A:_ The `-t 4` flag overrides the default 8-character tab stop, instructing the engine to evaluate tabs at 4-character intervals. However, invoking `-t` implicitly activates the `-a` (all) flag. This forces `unexpand` to convert spaces to tabs across the _entire_ line, not just the leading indentation. This will corrupt carefully spaced strings inside `echo` statements or aligned inline comments. You must explicitly append `--first-only` to suppress this implicit behavior.
- _Query:_ A developer attempts to fix a Makefile by running `sed 's/        /\t/g' Makefile`. Why is `unexpand` architecturally superior and safer for this specific task than `sed`?
  - _A:_ `sed` performs a literal, dumb string replacement; it strictly looks for exactly 8 spaces and replaces them with a tab. If the Makefile has a command indented with 7 spaces, `sed` misses it entirely. `unexpand` is a geometric column parser. It tracks the logical cursor position on the line. If it sees 7 spaces leading up to an 8-column tab stop, it mathematically understands the intent and seamlessly converts the gap into a proper hardware tab, ensuring absolute structural alignment.

## Practice Problems

- _Problem:_ Repair the leading indentation of a file named `pipeline.yml`, converting spaces to tabs using a 2-space tab width, and absolutely ensure spaces inside the actual text remain perfectly untouched. Print the output to the screen.
  - _Hint:_ Combine the custom tab width integer with the safety override flag.
  - _Solution:_ `unexpand -t 2 --first-only pipeline.yml` (This fixes the YAML indentations securely without destroying the configuration string spacing).
- _Problem:_ Minify a massive log file named `audit.log` by converting every single sequence of spaces throughout the entire file into tabs (using the default 8-space width) to save disk space, redirecting the result to `minified.log`.
  - _Hint:_ Invoke the aggressive, global transformation flag and utilize standard bash output redirection.
  - _Solution:_ `unexpand -a audit.log > minified.log` (This blindly compresses all whitespace blocks across the entire document into single bytes).

## References

- [GNU Coreutils - unexpand invocation](https://www.gnu.org/software/coreutils/manual/html_node/unexpand-invocation.html)
- [POSIX Standard - unexpand utility](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/unexpand.html)
  === END FILE ===
