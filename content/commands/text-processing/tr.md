---
slug: tr
name: tr
aliases:
  - translate
category: cloud-cli
tags:
  - linux
  - text-processing
  - strings
  - filtering
  - coreutils
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
  - convert lowercase to uppercase bash
  - remove newlines from string linux
  - replace specific characters in shell
  - squeeze multiple spaces into one
  - delete special characters from text
relatedCommands:
  - sed
  - awk
  - cut
alternatives:
  - sed
status: draft
---

## What is it?

`tr` (translate) is an ultra-fast, POSIX-standard command-line utility used to translate, squeeze, or delete specific characters from a standard input stream. By defining two sets of characters (SET1 and SET2), it maps and replaces characters byte-for-byte, making it the definitive tool for converting casing, sanitizing unprintable control characters, and normalizing erratic whitespace without the overhead of heavy regular expression engines.

## Why does it exist?

Before powerful text manipulation languages like `awk` and `perl` existed, shell scripts needed a lightweight, system-level C binary to execute fundamental string hygiene—such as converting DOS line endings (`\r\n`) to Unix line endings (`\n`), stripping punctuation for cryptographic hashing, or collapsing multiple consecutive spaces into a single space so tools like `cut` could parse columns reliably. `tr` exists because byte-for-byte translation using direct memory mapping is orders of magnitude faster and syntactically simpler than invoking Turing-complete regex machines for basic character replacements.

## Syntax

```bash
tr [OPTION]... SET1 [SET2]
```

_(Note: `tr` does not accept file paths as arguments. It exclusively reads from standard input and writes to standard output)._

## Flags

| Flag                       | Description                                                                                                                            | Example                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `-d`, `--delete`           | Deletes any characters found in SET1 from the input stream. SET2 is ignored.                                                           | `tr -d '\r' < win_file.txt`      |
| `-s`, `--squeeze-repeats`  | Replaces a sequence of repeated characters listed in SET1 with a single instance of that character.                                    | `echo "a b"                      | tr -s ' '` |
| `-c`, `-C`, `--complement` | Inverts SET1. Operations (translate or delete) apply to all characters _except_ those explicitly defined in SET1.                      | `tr -cd '[:alnum:]' < dirty.txt` |
| `-t`, `--truncate-set1`    | Truncates SET1 to the exact length of SET2 before translating. Prevents unexpected duplication mappings when SET1 is longer than SET2. | `tr -t 'abcd' 'xy' < file.txt`   |
| `--help`                   | Prints the usage manual, flags, and POSIX class definitions.                                                                           | `tr --help`                      |
| `--version`                | Outputs the version information for the GNU coreutils `tr` binary.                                                                     | `tr --version`                   |

_Character Set Syntax Note: `tr` supports ranges (`a-z`), escaped octals (`\012`), and strict POSIX bracket expressions (e.g., `[:lower:]`, `[:alpha:]`, `[:punct:]`, `[:space:]`)._

## Examples

```bash
cat data.txt | tr 'a-z' 'A-Z'
```

> The universal capitalization pattern. It reads the input stream and maps every single lowercase letter in SET1 to its exact positional counterpart in the uppercase SET2, resulting in fully capitalized output. (Using `tr '[:lower:]' '[:upper:]'` is the safer, globally locale-compliant alternative).

```bash
echo "Server    is     healthy" | tr -s ' '
```

> Normalizing whitespace. The `-s` (squeeze) flag targets the space character. It detects consecutive blocks of spaces and collapses them into a single, solitary space character, outputting `Server is healthy`. This is mandatory preparation before piping text into `cut -d ' '`.

```bash
tr -d '\r' < windows_script.sh > unix_script.sh
```

> The canonical DOS-to-Unix line ending fix. Windows editors append Carriage Return (`\r`) characters before Newlines (`\n`). Bash crashes when executing scripts containing `\r`. This command aggressively deletes every Carriage Return byte from the stream, repairing the script.

```bash
head -c 32 /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16
```

> Secure password generation. Extracts raw binary garbage from `/dev/urandom`. The `-dc` (delete complement) combination tells `tr` to delete everything that is _not_ an alphanumeric character. The clean stream of a-z, A-Z, 0-9 is piped to `head` to truncate it to a perfect 16-character secure password.

```bash
cat array.json | tr '\n' ' '
```

> Stripping newlines. A multiline JSON or text file is piped into `tr`. It targets the newline character (`\n`) and maps it to a space (` `). The entire multi-line file is instantly crushed into a single, continuous horizontal string of text.

## Real-World Scenarios

**Sanitizing Machine IDs for URLs**

```bash
MACHINE_ID=$(cat /etc/machine-id | tr -d '-')
curl -X POST "[https://api.internal/register/$](https://api.internal/register/$){MACHINE_ID}"
```

> Cloud deployment scripts often extract system UUIDs, but backend APIs sometimes reject hyphens. Using `tr -d '-'` instantly strips all hyphens from the UUID variable before it is injected into the REST API URL string.

**Creating Word Frequency Histograms**

```bash
cat book.txt | tr '[:space:]' '\n' | tr -cd '[:alnum:]\n' | tr '[:upper:]' '[:lower:]' | sort | uniq -c | sort -nr
```

> A classic text-processing pipeline. A book is piped in. `tr` translates every space/tab into a newline (putting every word on its own line). `tr -cd` deletes all punctuation, leaving only alphanumeric characters and newlines. `tr` forces all words to lowercase. `sort` and `uniq` then count the most frequently used words in the book flawlessly.

## When should it NOT be used?

- **Replacing whole words or strings:** **Do not use `tr` to replace "cat" with "dog".** `tr` maps _individual bytes_, not strings. If you run `echo "catch" | tr 'cat' 'dog'`, `tr` maps 'c' to 'd', 'a' to 'o', and 't' to 'g'. The output will be `doggh`. For string replacement, you absolutely must use `sed 's/cat/dog/g'`.
- **Modifying files in place:** `tr` cannot edit files directly (it has no `-i` flag like `sed`). Attempting `tr 'a' 'b' < file.txt > file.txt` will instantly destroy the file content because the shell truncates the destination file before `tr` reads the source.

## Alternatives

- **`sed`:** **Best for regex and string replacement.** Vastly more powerful. Can replace whole words, use capture groups, and edit files in place (`-i`).
- **`awk`:** **Best for column formatting.** Can manipulate specific fields in a string without blindly affecting the entire line like `tr`.
- **`dos2unix`:** **Best for line endings.** A specialized C binary explicitly designed to convert Windows `\r\n` files to Linux `\n` formats perfectly, handling edge cases better than raw `tr` commands.

## How it works internally

`tr` is one of the leanest utilities in the POSIX toolchain.

When you run `tr SET1 SET2`, the utility allocates an internal memory array of 256 bytes (representing every possible character in standard ASCII/Extended ASCII).

It populates this translation array. If SET1 is `a` (ASCII 97) and SET2 is `z` (ASCII 122), it updates index 97 of the array to contain the value 122. All other indexes contain their own default value (e.g., index 65 contains 65).

As `tr` reads the input stream byte-by-byte from `stdin`, it takes the integer value of the incoming byte, performs an instant `O(1)` memory lookup on the translation array, and writes the resulting byte to `stdout`.

Because it lacks regex compilation, backtracking state machines, or memory buffers larger than a few bytes, `tr` processes data at speeds heavily bottlenecked by RAM/Disk bandwidth rather than CPU cycles.

## Performance Notes

- **Length Mismatch:** If SET1 is longer than SET2 (e.g., `tr 'abcd' 'xy'`), standard POSIX behavior dictates that the final character of SET2 (`y`) is duplicated to fill the gap. Thus, 'c' and 'd' are both translated to 'y'. Use the `-t` (truncate) flag to prevent this behavior if it is unintended, forcing 'c' and 'd' to remain untranslated.

## Security Notes

- **Multibyte Character Corruption:** Standard GNU `tr` is historically a single-byte utility. It assumes 1 byte = 1 character. If you attempt to translate complex UTF-8 multibyte characters (like Emojis or Kanji), `tr` may violently sever the byte sequence, corrupting the text stream and outputting invalid Unicode characters. For heavy Unicode text manipulation, rely on modern environments like Python or Perl.

## Common Mistakes

- **Trying to pass a filename as an argument**
  - _Mistake:_ Typing `tr 'a' 'b' data.txt`.
  - _Why:_ `tr` does not process command-line file arguments. It complains `tr: extra operand ‘data.txt’`. It strictly operates on standard input. You must use shell redirection: `tr 'a' 'b' < data.txt` or `cat data.txt | tr 'a' 'b'`.
- **Using shell globbing in brackets**
  - _Mistake:_ Typing `tr [A-Z] [a-z]`.
  - _Why:_ If you don't wrap the sets in single quotes (`'...'`), the bash shell intercepts the `[A-Z]` syntax, treats it as a glob, and looks for a 1-letter uppercase filename in your current directory. Always strictly quote your sets: `tr '[A-Z]' '[a-z]'`.

## Best Practices

- **Use POSIX Character Classes:** Do not rely on `a-zA-Z`. Depending on the server's locale variable (`LC_ALL`), `A-Z` might not include accented characters or might sort unpredictably. Using `tr '[:upper:]' '[:lower:]'` relies on the OS's native locale definitions, guaranteeing 100% accurate translation across international environments.
- **Squeeze before AWK:** When processing highly erratic text outputs (like the output of `ls -l` or `df`), pipe it through `tr -s ' '` to normalize the columns to single spaces before piping it to `cut` or `awk`.

## Interview Questions

**Q: You want to replace every occurrence of the string `apple` with the string `pear` in a text stream. A junior developer writes `cat file.txt | tr 'apple' 'pear'`. Why is this completely incorrect, and what output will it actually generate?**
**A:** `tr` performs a 1-to-1 character translation based on byte sets; it does not replace whole words or strings. The command creates a mapping where 'a'->'p', 'p'->'e', 'l'->'a', and 'e'->'r'. If the file contains the word "appeal", `tr` will translate it character-by-character into "peerep". To replace whole strings, the developer must abandon `tr` and use `sed 's/apple/pear/g'`.

**Q: Explain how the command `tr -cd '[:digit:]'` operates on a string of text.**
**A:** This command isolates numbers. The `[:digit:]` is a POSIX class representing numbers 0-9. The `-c` (complement) flag inverts the set, meaning the target set becomes "everything that is NOT a digit." The `-d` (delete) flag instructs the utility to remove characters matching the target set. Ultimately, it deletes every single character from the input stream that is not a number, leaving only pure digits behind.

## Practice Problems

**Problem:** You are processing a file containing MAC addresses formatted with colons (e.g., `00:1A:2B:3C:4D:5E`). You need a pure, unbroken string of lowercase hexadecimal characters for a database insert (e.g., `001a2b3c4d5e`). Write a single pipeline using two `tr` commands to strip the colons and convert the text to lowercase.
**Hint:** First use the delete flag to target the colon, then pipe that to a translation targeting uppercase to lowercase ranges.
**Solution:**

```bash
cat macs.txt | tr -d ':' | tr '[:upper:]' '[:lower:]'
```

**Problem:** You have a file `dirty.txt` that is riddled with random, non-printable control characters (like bell sounds or vertical tabs). Write a command using `tr` that completely deletes all non-printable characters from the file, utilizing standard POSIX character classes, redirecting the output to `clean.txt`.
**Hint:** Use the delete and complement flags. The POSIX class for printable characters is `[:print:]` (or use `[:cntrl:]` with just delete).
**Solution:**

```bash
tr -cd '[:print:]\n' < dirty.txt > clean.txt
```

_(Note: Adding `\n` to the complement preserves line breaks, which are technically control characters)._

## References

- [tr(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/tr)
- [GNU Coreutils Manual: tr invocation](https://www.gnu.org/software/coreutils/manual/html_node/tr-invocation.html)
