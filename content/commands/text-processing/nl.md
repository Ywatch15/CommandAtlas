---
slug: nl
name: nl
aliases:
  - number lines
category: cloud-cli
tags:
  - text-processing
  - formatting
  - lines
  - stream-editor
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - add line numbers to file linux
  - number lines excluding blank lines
  - format output with line numbers
  - number logical pages bash
  - cat -n alternative
relatedCommands:
  - cat
  - awk
  - sed
alternatives:
  - cat
  - awk
status: draft
---

## What is it?

`nl` (number lines) is a POSIX standard text-processing utility that reads lines from a file or standard input, prepends line numbers according to highly configurable styling and spacing rules, and writes the result to standard output. It operates on the concept of "logical pages" (composed of a header, body, and footer), allowing complex numbering resets and regex-based targeted numbering.

## Why does it exist?

While `cat -n` is commonly used to add line numbers to a file, it is completely rigid—it blindly numbers every single line, starting at 1, with zero configuration. `nl` exists for advanced text formatting and pagination. It was engineered to handle complex documents where headers/footers should not be numbered, where line numbers need custom zero-padding or delimiters, or where line counting should only increment if the text explicitly matches a specific regular expression.

## Syntax

```bash
nl [options] [file...]
```

## Flags

| Flag          | Description                                                                                                 | Example               |
| ------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- |
| `-b <type>`   | Body numbering style: `a` (all), `t` (non-empty), `n` (none), `p<regex>` (match regex). Defaults to `t`.    | `nl -b a file.txt`    |
| `-h <type>`   | Header numbering style (same options as `-b`). Defaults to `n`.                                             | `nl -h a file.txt`    |
| `-f <type>`   | Footer numbering style (same options as `-b`). Defaults to `n`.                                             | `nl -f a file.txt`    |
| `-n <format>` | Line number formatting: `ln` (left justified), `rn` (right justified), `rz` (right justified, zero-padded). | `nl -n rz data.txt`   |
| `-s <string>` | Specifies the separator string placed between the line number and the text. Defaults to a single Tab.       | `nl -s "              | " config` |
| `-w <width>`  | Specifies the total number of characters (width) to reserve for the line number column. Defaults to 6.      | `nl -w 3 list.txt`    |
| `-v <start>`  | Specifies the initial starting number for the very first line of a logical page. Defaults to 1.             | `nl -v 100 script.sh` |
| `-i <incr>`   | Specifies the increment step value added to the line number for each subsequent line. Defaults to 1.        | `nl -i 10 code.c`     |
| `-p`          | Prevents the line number from resetting back to the start value when encountering a new logical page.       | `nl -p doc.txt`       |

## Examples

```bash
nl -b a script.sh
```

> This replicates the behavior of `cat -n`. By explicitly setting the body numbering style to `a` (all), `nl` prepends a line number to every single line in the file, completely overriding its default behavior (which skips empty lines).

```bash
nl -n rz -w 4 -s " -> " names.txt
```

> This enforces strict formatting rules on the output. It right-justifies and zero-pads the line numbers (`-n rz`), strictly limits the number column to 4 characters wide (`-w 4`), and replaces the default tab delimiter with a custom ASCII arrow string (`-s " -> "`), resulting in output like `0001 -> Alice`.

```bash
nl -b p"ERROR" /var/log/syslog
```

> This executes targeted regex numbering. The body style `p` is followed immediately by a regular expression. `nl` prints the entire log file, but _only_ increments and attaches a line number to the lines containing the explicit string `ERROR`, leaving all other text unnumbered.

```bash
nl -v 100 -i 10 rules.conf
```

> This alters the mathematical sequencing of the line numbering. The file numbering will begin at exactly 100 (`-v 100`) and increment by 10 for every subsequent numbered line (`-i 10`), mimicking ancient BASIC programming language line formats.

```bash
# Given a file structured with logical page delimiters:
# \:\:\:
# Header text
# \:\:
# Body text
# \:
# Footer text
nl -h a -b a -f n document.txt
```

> This utilizes logical page processing. `nl` natively detects the delimiters `\:\:\:` (header), `\:\:` (body), and `\:` (footer). The command instructs the utility to number all lines in the Header (`-h a`), number all lines in the Body (`-b a`), but completely skip numbering anything in the Footer (`-f n`).

## Real-World Scenarios

**Formatting Source Code for Documentation**

```bash
nl -b t -n rn -s ": " source_code.py > documented_source.txt
```

> Technical writers preparing code snippets for manuals use `nl` to cleanly format the text. This command right-aligns the numbers seamlessly, ignores entirely blank lines (`-b t` is default but explicitly declared for readability), and separates the numbers cleanly with a colon, preventing tab-alignment issues in PDF renderers.

**Tracking Distinct Subsets in Data Streams**

```bash
grep -i "fail" auth.log | nl -w 3 -s ". "
```

> Systems administrators pipeline the output of an error extraction into `nl`. This applies a sequential integer index (`1. `, `2. `) specifically to the filtered failure events. If 15 events are returned, they are numbered 1 through 15, creating an instantly readable, enumerated list for incident response tickets.

## When should it NOT be used?

- **Simple file concatenation and numbering:** **Reason:** If you just want to quickly dump a file to the screen with numbers on the left, typing `cat -n file.txt` is faster, more universally memorized, and less syntactically complex.
- **Heavy text parsing based on line numbers:** **Reason:** `nl` only adds visual strings to the output; it cannot extract or conditionally manipulate the text itself based on the line count. **Use instead:** `awk '{print NR, $0}'` which allows deep mathematical computation on the line numbers themselves.

## Alternatives

- **`cat -n` / `cat -b`:** Quick numbering. **Tradeoff:** `cat -n` numbers all lines. `cat -b` numbers non-blank lines. It is fast and simple but completely lacks custom delimiters, zero-padding, or regex-based numbering.
- **`awk '{printf "%04d | %s\n", NR, $0}'`:** Advanced streaming. **Tradeoff:** `awk` is the absolute powerhouse for this. It can replicate every single feature of `nl` and infinitely more, but requires knowing the C-style `printf` syntax rather than `nl`'s built-in flags.
- **`pr -n`:** Pagination formatting. **Tradeoff:** `pr` is designed to prepare text for physical printing (adding margins and page headers). It can number lines, but is generally bulkier than the focused `nl`.

## How it works internally

`nl` operates as a Finite State Automaton that processes input line-by-line while tracking its current position within a "logical page."

A logical page in `nl` consists of three sections: Header, Body, and Footer. The transition between these sections is governed by hardcoded, esoteric string delimiters that must appear on a line by themselves:

- `\:\:\:` indicates the start of a Header section.
- `\:\:` indicates the start of a Body section.
- `\:` indicates the start of a Footer section.

When `nl` reads a file, it starts in the Body state by default. As it reads each line, it evaluates the line against the delimiter strings. If a delimiter is found, `nl` switches states (e.g., from Body to Footer), completely resets the internal line counter back to the `-v` start value (unless `-p` is passed), and processes the subsequent lines using the formatting rules explicitly defined for that new section (e.g., `-f n` to stop numbering). The delimiter lines themselves are never printed to standard output.

If no delimiters are present in the file, `nl` treats the entire file as a single continuous Body section. It then evaluates the text against the Body numbering rule (`-b`). It runs `regcomp()` and `regexec()` internally if the `p<regex>` flag was utilized, determining if the internal counter should be incremented and prepended to the line buffer before issuing a `write()` system call to `stdout`.

## Performance Notes

- **Regex Overhead:** Using the `-b p"regex"` flag forces `nl` to execute a regular expression match against every single line in the file. On massive multi-gigabyte log files, this is significantly slower than standard line counting.
- `nl` is highly optimized C code and buffers its input effectively. It is vastly faster to execute `command | nl` than to execute a slow `while read` loop in bash to manually increment and format a counter variable.

## Security Notes

- **No inherent security risks:** `nl` strictly performs read-only string manipulation on standard input or file descriptors. It does not execute code, modify file permissions, or possess shell escape vulnerabilities.

## Common Mistakes

- **Being confused by empty lines:** Running `nl data.txt`. **Why it's wrong:** The user expects every line to be numbered. However, `nl` defaults to `-b t` (number only non-empty lines). Blank lines are printed, but skipped in the count sequence. You must explicitly pass `-b a` (all) to number blank lines.
- **Using `nl` to parse log formats:** **Why it's wrong:** Developers sometimes use `nl` to prepend IDs to CSV data, but forget the default `-s` is a Tab character. If the CSV parser expects strict commas, the Tab breaks the column parsing downstream. Always explicitly declare `-s ","`.
- **Accidentally triggering logical pages:** Processing a file that happens to contain lines with exactly `\:\:`. **Why it's wrong:** `nl` will interpret this as a control character, silently drop the line from the output, reset the counter to 1, and switch to body formatting. This destroys data integrity on files containing literal ASCII art or specific syntax.

## Best Practices

- When preparing code payloads for automated email reports or Slack webhooks, utilize `nl -n rz -w 3 -s " "` to generate clean, zero-padded, fixed-width line numbers. This guarantees the text perfectly aligns structurally regardless of proportional font rendering in the chat client.
- Combine `nl` with `grep` to create powerful context locators. Running `nl file.txt | grep "ERROR"` instantly provides the exact absolute line number of the original file where the error occurred, preventing the need to re-open the file and search manually.

## Interview Questions

- _Query:_ If you run `nl script.sh`, you notice that blank lines in the script are printed, but they do not receive a line number, and the counter skips them. How do you force `nl` to number every single line, identical to the behavior of `cat -n`?
  - _A:_ By default, `nl` sets the Body numbering style to `t` (text only), which strictly ignores empty lines. To mimic `cat -n`, you must override the Body numbering style by executing `nl -b a script.sh`. The `a` (all) flag forces the engine to apply an incremented number to every line regardless of content.
- _Query:_ Explain the concept of "logical pages" in the `nl` utility. How does the command identify the different sections of a logical page within a plain text file?
  - _A:_ `nl` breaks documents into three logical sections: Header, Body, and Footer, allowing different numbering rules (e.g., number the body, but not the footer). It identifies these sections by reading lines containing exact, hardcoded delimiter strings. A line containing exactly `\:\:\:` shifts the state to the Header, `\:\:` shifts to the Body, and `\:` shifts to the Footer. The counter resets to its initial value upon encountering any of these state transitions unless overridden.
- _Query:_ You want to number a log file, but you _only_ want to apply line numbers to lines that begin with the word "Warning". How can `nl` achieve this natively without relying on external tools like `awk`?
  - _A:_ The `nl` command supports native regular expression targeting for its numbering styles. You use the `-b` (body) flag combined with the `p` (pattern) modifier, immediately followed by the regex. The command is `nl -b p"^Warning" file.log`. It will print the entire file, but the line counter will only increment and print on the lines matching the regex.

## Practice Problems

- _Problem:_ Output the contents of `inventory.txt`, applying line numbers to every line (including blank lines). Ensure the numbers are right-justified, padded with zeros to a width of 5 characters, and separated from the text by a pipe character `|`.
  - _Hint:_ You need to override the default body style, configure the number format to right-zero, set the width integer, and explicitly define the separator string.
  - _Solution:_ `nl -b a -n rz -w 5 -s "|" inventory.txt` (This produces highly structured, database-ready output).
- _Problem:_ Number the lines of `data.csv`, but force the numbering sequence to start at exactly 500, and mathematically increment by 5 for every subsequent line.
  - _Hint:_ Utilize the specific flags that manipulate the starting integer value and the sequence increment value.
  - _Solution:_ `nl -v 500 -i 5 data.csv` (This establishes custom sequence mathematics directly within the format engine).

## References

- [GNU Coreutils - nl invocation](https://www.gnu.org/software/coreutils/manual/html_node/nl-invocation.html)
- [POSIX Standard - nl utility](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/nl.html)
  === END FILE ===
