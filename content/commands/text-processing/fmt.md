---
slug: fmt
name: fmt
aliases: []
category: cloud-cli
tags:
  - linux
  - text-processing
  - formatting
  - coreutils
  - text-wrapping
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
  - word wrap text linux
  - format paragraph width terminal
  - wrap lines to 80 characters
  - clean up text file formatting
  - reformat text bash
relatedCommands:
  - sed
  - tr
alternatives: []
status: draft
---

## What is it?

`fmt` is a simple optimal text formatter provided by GNU Coreutils. It reads plain text files or piped standard input, identifies paragraph boundaries, and aggressively reformats the text by joining short lines and breaking long lines. This ensures the output is uniformly wrapped to a specified maximum column width (defaulting to 75 characters) while preserving indentation and blank lines.

## Why does it exist?

Before modern Graphical User Interface (GUI) word processors, developers authored `README` files, documentation, and email bodies in basic terminal editors that lacked dynamic word-wrapping. Writing a long paragraph often resulted in a single unbroken string extending infinitely to the right. `fmt` exists to sanitize this. It provides a programmatic, mathematically optimized engine to reflow text blocks automatically, ensuring that emails comply with legacy 80-character terminal constraints and source code comments remain highly readable within split-pane IDE windows.

## Syntax

```bash
fmt [OPTION]... [FILE]...
```

## Flags

| Flag                             | Description                                                                                                                                                     | Example                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `-w <N>`, `--width=N`            | Explicitly sets the maximum line width to `N` columns. The default is 75 columns.                                                                               | `fmt -w 60 doc.txt`       |
| `-p <STRING>`, `--prefix=STRING` | Only reformats lines beginning with the specified prefix, preserving the prefix on all newly generated wrapped lines. Essential for wrapping code comments.     | `fmt -p "# " script.py`   |
| `-c`, `--crown-margin`           | Preserves "crown margin" (hanging indent) formatting. The first two lines of a paragraph determine the indentation for the rest of the reflowed block.          | `fmt -c list.txt`         |
| `-t`, `--tagged-paragraph`       | Indentation of the first line differs from the second line. `fmt` aligns all subsequent wrapped lines to match the second line's indent.                        | `fmt -t data.txt`         |
| `-s`, `--split-only`             | Instructs `fmt` to break long lines, but mathematically refuses to join short lines together. Useful for preserving intentional line breaks in poetry or lists. | `fmt -s notes.txt`        |
| `-u`, `--uniform-spacing`        | Normalizes spacing. Enforces exactly one space between words, and exactly two spaces between sentences (after a period).                                        | `fmt -u draft.txt`        |
| `-g <N>`, `--goal=N`             | Sets a "goal" width independently of the absolute max width (`-w`), allowing the algorithm flexibility to leave margins slightly jagged for better readability. | `fmt -w 80 -g 70 doc.txt` |
| `--help`                         | Prints the usage manual and flag documentation.                                                                                                                 | `fmt --help`              |
| `--version`                      | Outputs the version information for the GNU coreutils `fmt` binary.                                                                                             | `fmt --version`           |

## Examples

```bash
fmt readme.txt > readme_formatted.txt
```

> The standard invocation. It evaluates `readme.txt`, collapses all jagged lines within the same paragraph, and wraps the text seamlessly so no line exceeds the default 75 characters, creating a clean, newspaper-like column.

```bash
git log -1 --pretty=format:"%B" | fmt -w 72
```

> Pipeline formatting. Git commit messages should historically wrap at 72 characters. This command pulls the raw body of the last commit and pipes it to `fmt`, perfectly re-flowing the developer's rambling text to comply with Linux kernel mailing list standards.

```bash
fmt -u -w 80 rough_draft.txt
```

> Enforcing typographical standardization. If a user accidentally typed multiple spaces between words, the `-u` (uniform-spacing) flag collapses them to a single space, while ensuring exactly two spaces are placed after every period, wrapping the cleaned text to an 80-character maximum.

```bash
fmt -p "# " config.yaml
```

> Surgical comment reflowing. In a configuration file containing raw data and comments (`# `), `fmt` detects the prefix. It ignores the raw configuration directives entirely, targeting _only_ the comment blocks, seamlessly reflowing the multi-line comments while automatically injecting `# ` at the start of any new lines it generates.

## Real-World Scenarios

**Normalizing Battered Documentation**

```bash
cat OCR_scan.txt | fmt -w 100 > clean_document.txt
```

> Text scraped from PDFs via Optical Character Recognition (OCR) often contains bizarre, hardcoded line breaks in the middle of sentences. A data engineer uses `fmt` to completely obliterate these artificial breaks, mathematically re-stitching the sentences together and reflowing the paragraphs cleanly to a modern 100-character width for subsequent NLP processing.

## When should it NOT be used?

- **Source Code Formatting:** **Do not run `fmt` arbitrarily on Bash, Python, or C files.** `fmt` is a natural language text processor. If you run it on code, it will attempt to wrap and stitch your variable assignments and loops together into solid paragraphs, instantly destroying the application. Use `-p` for comments, or dedicated linters (like `black` or `gofmt`).
- **Hard-Wrapped Data:** **Do not use on tables or CSVs.** `fmt` destroys newline characters to join text. If you pass a CSV file, it will merge multiple distinct rows of data into a single continuous string.
- **Strict Byte Limitations:** If you absolutely must slice a string exactly at byte 80, regardless of whether it cuts a word in half, `fmt` is too intelligent (it prefers word boundaries). You must use `fold -w 80` or `cut`.

## Alternatives

- **`fold`:** **Best for dumb, strict wrapping.** Unlike `fmt`, which optimizes for word boundaries and paragraphs, `fold` blindly slices strings at exact column widths, cutting words in half if necessary.
- **`par`:** **Best for advanced typographical justification.** An external, highly advanced alternative to `fmt` that supports full block justification (aligning both left and right margins perfectly like a printed book).
- **Vim (`gq`):** Within the Vim editor, highlighting text and pressing `gq` invokes an internal text formatting engine functionally identical to `fmt`.

## How it works internally

`fmt` is a paragraph-aware parser. It processes a file by reading lines into a buffer until it hits a "paragraph break" (defined strictly as a blank line, or a line where the indentation changes significantly).

Once a paragraph is buffered, `fmt` tokenizes the string into individual words, destroying the original newline characters.

It then employs a greedy line-wrapping algorithm. It appends words to the output line, adding the character widths together. It aims for the `goal` width (usually 93% of the `width`). If adding the next word exceeds the absolute `width` limit, `fmt` inserts a newline and pushes the word to the next line.

Crucially, `fmt` is space-aware. If it sees a period, question mark, or exclamation point at the end of a word, it assigns a heavier "weight" to the spacing, preferring to insert the line break _after_ the sentence rather than splitting sentences across lines, optimizing for human readability.

## Performance Notes

- **Negligible Overhead:** `fmt` buffers text on a per-paragraph basis. It executes lightning-fast, linear $O(N)$ string tokenization, capable of reflowing megabytes of text in fractions of a second with virtually zero memory overhead.

## Security Notes

- **Non-Destructive:** `fmt` is inherently a read-only stream processor. It possesses no capability to execute code or overwrite system files unless explicitly directed via shell redirection (`>`).

## Common Mistakes

- **Destroying Poetry / Line Breaks**
  - _Mistake:_ Using `fmt` to wrap a document that contains lyrics or itemized lists.
  - _Why:_ By default, `fmt` actively _joins_ short lines together to create solid paragraphs. It will take a vertically formatted list and squash it into a horizontal sentence. You must append the `-s` (split-only) flag to instruct `fmt` to break long lines but aggressively respect existing short line breaks.
- **Misunderstanding Uniform Spacing**
  - _Mistake:_ Using `-u` to clean up text, and complaining that it added double spaces after periods.
  - _Why:_ The GNU `fmt -u` implementation enforces classical typesetting rules (French spacing), which mandates exactly two spaces following sentence-ending punctuation. If you prefer modern single-spacing, do not use the `-u` flag.

## Best Practices

- **Use the Prefix Flag in Git:** If writing a custom git hook to enforce formatting, always use `fmt -p "#"`. This guarantees the formatter safely skips diffs or metadata and only reflows the actual comment blocks in configuration files.

## Interview Questions

**Q: You have a text file where sentences are broken abruptly in the middle of lines (e.g., from a bad copy-paste). You run `fmt -s file.txt` to fix it, but the output looks exactly the same. Why did `fmt` fail to stitch the sentences back together?**
**A:** You used the `-s` (split-only) flag. The default behavior of `fmt` is to stitch short lines together to form a complete paragraph before re-wrapping them. The `-s` flag explicitly disables this joining behavior, instructing the algorithm to break long lines but strictly preserve the existing short line breaks. Removing the `-s` flag will allow `fmt` to rejoin the shattered sentences.

**Q: Explain the structural difference between how the `fmt` utility and the `fold` utility process a string that is 100 characters long when the maximum width is set to 80.**
**A:** `fmt` is a "smart", word-aware formatter. When approaching the 80th character, it looks for the nearest whitespace or word boundary. It will wrap the entire word to the next line to ensure the text remains human-readable. `fold` is a "dumb" byte/character formatter. It counts exactly 80 characters and violently slices the string at that precise position, inserting a newline, even if it cuts a word directly in half.

## Practice Problems

**Problem:** You have a disorganized text file named `draft.txt`. You need to completely reflow the paragraphs so that no line exceeds 60 characters in width.
**Hint:** Use the flag that defines the maximum column width.
**Solution:**

```bash
fmt -w 60 draft.txt
```

**Problem:** You are maintaining a massive bash script. You want to format the comments (which start with `# `) so they wrap neatly at 80 characters, but you absolutely cannot risk `fmt` altering the actual bash code below the comments. Write the command to surgically target only the comment blocks.
**Hint:** Use the specific flag designed to target and preserve string prefixes.
**Solution:**

```bash
fmt -p "# " script.sh
```

## References

- [fmt(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/fmt)
- [GNU Coreutils Manual: fmt invocation](https://www.gnu.org/software/coreutils/manual/html_node/fmt-invocation.html)
