---
slug: cut
name: cut
aliases: []
category: text-processing
tags:
  - linux
  - text-processing
  - filter
  - coreutils
  - formatting
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
  - extract columns from file
  - split string by delimiter bash
  - cut specific characters from line
  - parse csv in shell script
  - remove fields from text
relatedCommands:
  - awk
  - sed
  - tr
  - paste
  - join
  - sort
alternatives:
  - awk
status: draft
---

## What is it?

`cut` is a fast, POSIX-standard command-line utility used to extract sections (columns, characters, or bytes) from each line of a file or piped data stream. By treating each line as a distinct record, `cut` relies on a specified delimiter (such as a comma or a colon) or strict positional indexing to cleanly slice out required fields, discarding the remainder of the text.

## Why does it exist?

Unix systems rely heavily on structured, delimited text files (like `/etc/passwd` mapped by colons, or `/etc/fstab` mapped by tabs). Before the invention of robust programming languages, administrators needed a lightweight, hyper-fast C-binary to extract specific data columns (e.g., "Give me only the usernames from the password file") to feed into other pipeline commands. While `awk` can perform this task, `awk` is a complete programming language with significant parser overhead. `cut` exists to do exactly one thing—slice text—with maximum possible CPU efficiency.

## Syntax

```bash
cut OPTION... [FILE]...
```

## Flags

| Flag                      | Description                                                                                                                              | Example                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `-d`, `--delimiter`       | Specifies the character used to separate fields. The default delimiter is a single TAB character.                                        | `cut -d ',' -f 1 data.csv`                 |
| `-f`, `--fields`          | Selects which specific fields (columns) to extract, separated by the delimiter. Supports ranges (`1-3`) and distinct selections (`1,4`). | `cut -d ':' -f 1,3 /etc/passwd`            |
| `-c`, `--characters`      | Selects specific characters by their absolute numerical position on the line, ignoring delimiters entirely.                              | `cut -c 1-10 log.txt`                      |
| `-b`, `--bytes`           | Selects specific bytes. Mostly identical to `-c` unless processing complex multibyte UTF-8 characters on specific implementations.       | `cut -b 1-16 raw.dat`                      |
| `-s`, `--only-delimited`  | Instructs `cut` to completely ignore and suppress any lines that do not contain the specified delimiter.                                 | `cut -d '=' -s -f 2 config.ini`            |
| `--complement`            | Inverts the selection. Extracts everything _except_ the requested fields or characters.                                                  | `cut -d ' ' -f 1 --complement`             |
| `--output-delimiter`      | Modifies the delimiter when printing the extracted fields, replacing the original `-d` character in the output.                          | `cut -d ':' -f 1,3 --output-delimiter=','` |
| `-z`, `--zero-terminated` | (GNU only) Processes input separated by null bytes (`\0`) instead of newlines, essential for safe parsing of filenames.                  | `find . -print0                            | cut -z -d '/' -f 2` |

## Examples

```bash
cut -d ':' -f 1 /etc/passwd
```

> The classic system administration query. It parses the `/etc/passwd` file, explicitly setting the colon (`:`) as the column delimiter, and extracts exclusively the 1st field, dumping a clean list of every registered username on the server.

```bash
ls -l | cut -c 2-4
```

> Character position slicing. Bypasses variable whitespace formatting entirely by strictly extracting the 2nd through 4th characters of every line. In the context of `ls -l`, this cleanly isolates the "Owner" permissions block (e.g., `rwx`).

```bash
cut -d ',' -f 1,4,5 data.csv
```

> Non-contiguous field extraction. Parses a CSV file and extracts the 1st, 4th, and 5th columns. The columns are printed out in their original order, separated by the original comma delimiter.

```bash
echo "ID: 987654" | cut -d ' ' -f 2
```

> The simplest pipeline parser. Splits the echoed string based on a single space character and extracts the second field (`987654`).

```bash
cut -d ':' -f 1,3 /etc/passwd --output-delimiter=' - UID: '
```

> Transforming data formats. It extracts the username and UID fields from the password file. Instead of stitching them back together with the original colon, it replaces the delimiter on the fly, outputting highly readable strings like `root - UID: 0`.

## Real-World Scenarios

**Extracting IP Addresses from Web Logs**

```bash
cut -d ' ' -f 1 /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

> A security engineer identifies a DDoS attack. NGINX logs place the client IP address as the absolute first field, separated by spaces. The engineer uses `cut` to rapidly slice out millions of IP addresses, sorts them, and counts the unique occurrences, instantly highlighting the offending IP flooding the server.

**Scrubbing Secrets from CSV Exports**

```bash
cut -d ',' -f 3 --complement user_database.csv > safe_users.csv
```

> A data analyst needs to share a database export with a third party, but column 3 contains plaintext passwords. Instead of manually editing the spreadsheet, they use the `--complement` flag to instantly create a cloned CSV file that contains every column _except_ the passwords.

## When should it NOT be used?

- **Variable Whitespace:** **Do not use `cut` to parse files delimited by multiple spaces.** If you run `ps aux | cut -d ' ' -f 2`, it will fail chaotically. `cut` treats _every single space_ as a new column. If a PID is padded with 3 spaces, `cut` sees 3 empty columns. You must use `awk '{print $2}'` for any data where whitespace varies.
- **Reordering Columns:** **Do not try to reorder columns with `cut`.** `cut -f 3,1` will NOT print field 3 followed by field 1. `cut` fundamentally reads the line linearly and always outputs fields in ascending order (Field 1, then Field 3). Use `awk '{print $3, $1}'` to manipulate column order.
- **Complex CSV Files:** If a CSV contains commas wrapped in quotes (e.g., `1, 2, "Smith, John", 4`), `cut` is blind to the quotes and will erroneously split "Smith" and "John" into separate fields. Use dedicated CSV parsers (like `cvskit` or Python) for escaped data.

## Alternatives

- **`awk`:** **The definitive alternative.** `awk` inherently understands variable whitespace, can perform mathematical operations, and can reorder columns easily. It is heavier than `cut` but infinitely more robust for unstructured text.
- **`sed`:** **Best for regex-based extraction.** If your delimiter is not a single character, but a complex regex pattern, `cut` cannot help you. `sed` can capture and replace patterns dynamically.
- **`tr`:** While `tr` translates characters, it is frequently used to "squeeze" variable spaces (`tr -s ' '`) into single spaces _before_ piping to `cut`.

## How it works internally

`cut` is an extremely lean C binary. It processes data using a fast, single-pass sequential read algorithm.

When you execute `cut -d ':' -f 3`, it allocates a boolean array mapping the requested fields. It reads the input stream character by character.
It maintains a `current_field` integer counter, starting at 1.

As it reads bytes, if the byte matches the requested delimiter (`:`), it increments the `current_field` counter.
If the `current_field` index is marked as "true" in its boolean array, it writes the character directly to standard output. If the index is "false", it simply discards the character and moves to the next byte.

When it encounters a newline (`\n`), it resets the `current_field` counter to 1 and repeats. This sequential, byte-by-byte evaluation means `cut` uses almost zero RAM and never stores the entire line in memory, making it blazingly fast on 100GB files, but fundamentally incapable of looking backward to reorder columns.

## Performance Notes

- **Speed:** Because it lacks regular expression engines and complex memory buffers, `cut` is mathematically one of the fastest text processing utilities on a Linux system, often outperforming `awk` by a factor of 3x to 5x on massive datasets where strict single-character delimiters are guaranteed.

## Security Notes

- **Binary Data Corruption:** Be cautious when using `cut -c` (characters) or `cut -b` (bytes) on binary files or complex UTF-8 payloads. Cutting a multi-byte Unicode character exactly in half leaves an invalid byte sequence in the terminal, which can corrupt subsequent string processing or terminal emulators.

## Common Mistakes

- **Using a multi-character delimiter**
  - _Mistake:_ Running `cut -d '::' -f 2 file.txt`.
  - _Why:_ The `-d` flag strictly accepts exactly _one_ character. Passing a string will cause a fatal error: `cut: the delimiter must be a single character`. You must use `awk -F '::'` for multi-character splits.
- **Forgetting the `-s` flag on dirty data**
  - _Mistake:_ Parsing `config.ini` with `cut -d '=' -f 2`.
  - _Why:_ Configuration files often contain blank lines or comments (`# comment`). By default, if `cut` does not find the delimiter on a line, it echoes the _entire line_ to the output, polluting your data. Always append `-s` (only-delimited) to explicitly drop lines missing the delimiter.

## Best Practices

- **Squeeze spaces before cutting:** If you are forced to use `cut` on CLI output containing variable spaces (like `ls -l`), always sanitize it first: `ls -l | tr -s ' ' | cut -d ' ' -f 3`. The `tr -s` command collapses multiple spaces into a single space, fixing `cut`'s parsing logic.
- **Prefer `cut` for simple loops:** In bash `while read` loops that execute millions of times, shelling out to `awk` inside the loop causes massive CPU thrashing. Shelling out to `cut` is significantly lighter, optimizing heavy loop iterations.

## Interview Questions

**Q: You want to swap the order of two columns in a colon-delimited file, printing column 2 first, then column 1. You type `cut -d ':' -f 2,1 file.txt`. Why does this fail to achieve the desired result, and what tool should you use instead?**
**A:** `cut` processes text strictly sequentially as a stream of bytes. It does not buffer the fields in memory to rearrange them. Regardless of the order specified in the `-f` flag, `cut` will always print the fields in ascending numerical order as it encounters them in the line. Therefore, it will print column 1, then column 2. To dynamically reorder columns, you must use a tool that buffers the fields, such as `awk -F ':' '{print $2, $1}'`.

**Q: In bash scripting, what is the functional difference between `cut -b 1-5` and `cut -c 1-5`, and under what specific condition would their outputs differ?**
**A:** `-b` extracts literal bytes, while `-c` extracts logical characters. If the file contains strictly ASCII text, the output is identical (1 byte = 1 character). However, if the file contains complex multibyte UTF-8 characters (like emojis or foreign alphabets), a single character might consume 3 or 4 bytes. `cut -c 1-5` will correctly return the first 5 visual characters. `cut -b 1-5` will return exactly 5 bytes, potentially slicing a multibyte character in half and returning corrupted gibberish.

## Practice Problems

**Problem:** You have a file `inventory.csv`. You need to extract everything _except_ the 3rd and 4th columns. The output must retain the original commas. Write the command.
**Hint:** Combine the fields flag with the inversion flag.
**Solution:**

```bash
cut -d ',' -f 3,4 --complement inventory.csv
```

**Problem:** You are parsing `/etc/passwd`. You want to extract the username (1st column) and the home directory (6th column). However, you want the output to replace the colons separating them with the word " HOME: ". Write the command.
**Hint:** Use the delimiter flag, field selection, and the custom output delimiter flag.
**Solution:**

```bash
cut -d ':' -f 1,6 /etc/passwd --output-delimiter=' HOME: '
```

## References

- [cut(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/cut)
- [GNU Coreutils Manual: cut invocation](https://www.gnu.org/software/coreutils/manual/html_node/cut-invocation.html)
