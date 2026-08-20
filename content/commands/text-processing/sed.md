---
slug: sed
name: sed
aliases:
  - stream editor
category: text-processing
tags:
  - text-processing
  - regex
  - substitution
  - stream-editor
  - filter
difficulty: advanced
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - find and replace string in file
  - regex search and replace linux
  - delete line containing string
  - modify file in place bash
  - extract substring shell script
relatedCommands:
  - awk
  - grep
  - tr
alternatives:
  - awk
status: draft
---

## What is it?

`sed` (stream editor) is a non-interactive, Turing-complete text processing utility. It parses text from files or pipelines sequentially line-by-line, applies a heavily structured script of programmatic commands (most famously `s///` for substitution), transforms the data in memory, and pushes the mutated result to standard output.

## Why does it exist?

Before graphical interfaces, UNIX text editing relied on `ed`, an interactive line editor. However, `ed` required a human to manually type commands. As automation evolved, engineers needed a mechanism to apply edits programmatically to massive data streams flowing through pipes without opening an interactive editor. `sed` was created (based directly on `ed` commands) to solve this. It exists to perform surgical text transformations—regex substitutions, line deletions, and targeted insertions—at pipeline speed, processing gigabytes of data with minimal memory overhead.

## Syntax

```bash
sed [options] 'script' [file...]
sed [options] -f scriptfile [file...]
```

## Flags

| Flag          | Description                                                                                             | Example                             |
| ------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `-e <script>` | Appends a script to the commands to be executed. Allows chaining multiple distinct `sed` operations.    | `sed -e 's/a/b/' -e 's/c/d/' file`  |
| `-i[SUFFIX]`  | Edits files in-place (saving the changes back to the original disk file). Suffix creates a backup.      | `sed -i.bak 's/foo/bar/g' config`   |
| `-n`          | Silent mode. Suppresses the default behavior of automatically printing the pattern space. Requires `p`. | `sed -n '/ERROR/p' app.log`         |
| `-E` / `-r`   | Enables Extended Regular Expressions (ERE), dropping the need to escape operators like `+`, `?`, `()`.  | `sed -E 's/(foo)+/bar/g' file`      |
| `-u`          | Unbuffered mode. Flushes output dynamically, critical when tailing live logs via pipes.                 | `tail -f log                        | sed -u 's/a/b/'` |
| `-z`          | (GNU specific) Zero-terminated. Treats the input as a single line separated by NUL bytes (`\0`).        | `find . -print0 \| sed -z 's/a/b/'` |
| `-f <file>`   | Reads the sequence of `sed` commands to be executed from a dedicated script file.                       | `sed -f transform.sed input.txt`    |

## Examples

```bash
sed 's/localhost/127.0.0.1/g' config.yml
```

> This is the canonical Substitution (`s`) command. It reads `config.yml`, searches every line for the literal string `localhost`, replaces it with `127.0.0.1`, and utilizes the global (`g`) modifier to ensure it replaces multiple occurrences on the exact same line, rather than stopping at the first match.

```bash
sed -i 'd' /tmp/cache.log
```

> Wait, `d` alone is destructive. Let's fix that context:

```bash
sed -i '/DEBUG/d' /tmp/cache.log
```

> This uses the Delete (`d`) command. It executes an in-place edit (`-i`), modifying the physical file directly. It scans for any line containing the string `DEBUG` and deletes the entire line from the file, effectively scrubbing noisy logs.

```bash
sed -n '10,20p' massive_dump.sql
```

> This uses line addressing and the Print (`p`) command. The `-n` flag forcefully silences `sed` from printing anything by default. The script `10,20p` explicitly commands `sed` to print _only_ lines 10 through 20 inclusive, creating a highly efficient text extractor.

```bash
sed -E 's/([0-9]{3})-([0-9]{2})-([0-9]{4})/XXX-XX-\3/g' users.csv
```

> This utilizes Extended Regular Expressions (`-E`) and Capture Groups. It maps standard US Social Security Numbers using parentheses `()`. The replacement string utilizes backreferencing (`\3`) to dynamically inject the contents of the third captured group, redacting the first five digits while preserving the last four.

```bash
sed 's|/usr/local/bin|/opt/bin|g' paths.txt
```

> This demonstrates delimiter swapping. The `s///` command is not bound to forward slashes. When searching for file paths containing slashes, escaping them (`\/usr\/local`) leads to "leaning toothpick syndrome". You can swap the delimiter to pipes `s|||`, colons `s:::`, or commas `s,,,` to maintain readability.

## Real-World Scenarios

**Automated Configuration Injection**

```bash
sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
```

> Security compliance scripts utilize `sed` to harden servers dynamically. The regex anchors to the start of the line (`^`), searches for the exact commented-out SSH directive, and violently replaces the entire line with the strict, uncommented `no` configuration, saving it directly to the disk (`-i`).

**Parsing IP Addresses via Stream Manipulation**

```bash
ip addr show eth0 | sed -n 's/.*inet \([0-9.]\+\).*/\1/p'
```

> Pipeline automation scripts extracting system state avoid complex `awk` printing logic. They use `-n` to silence the output, craft a regex that captures the IP address immediately following the word `inet`, replace the entire line with just the captured IP (`\1`), and explicitly print it (`p`).

## When should it NOT be used?

- **Parsing XML, JSON, or YAML data:** **Reason:** `sed` is structurally a line-based editor. It cannot natively understand nested arrays, multi-line blocks, or hierarchical schema logic. Using `sed` to edit JSON guarantees catastrophic corruption. **Use instead:** `jq`, `yq`, or `xmlstarlet`.
- **Massive multi-file text replacements on macOS:** **Reason:** The macOS/BSD version of `sed` handles the `-i` (in-place) flag differently than GNU `sed` (it strictly requires an extension like `-i ''`). Scripts written blindly with `sed -i` will crash across platforms. **Use instead:** `perl -pi -e` for guaranteed cross-platform compatibility.

## Alternatives

- **`awk`:** Field-based manipulation. **Tradeoff:** `awk` fundamentally parses lines into distinct columns (`$1`, `$2`). It is vastly superior for mathematical operations or reordering columns, while `sed` is superior for complex regex string mutation.
- **`perl -pe`:** The modern regex powerhouse. **Tradeoff:** Perl handles complex non-greedy regex (`.*?`), Lookaheads/Lookbehinds, and complex control structures that `sed` mathematically cannot parse. It is the direct upgrade path when `sed` syntax becomes unreadable.
- **`tr`:** Character translation. **Tradeoff:** For incredibly basic tasks like changing uppercase to lowercase or deleting specific ASCII characters, `tr` is significantly faster and syntactically simpler than `sed`.

## How it works internally

`sed` operates as a sophisticated Finite State Machine utilizing two isolated memory buffers: the **Pattern Space** and the **Hold Space**.

When `sed` reads a stream, it pulls exactly one line of text (up to the `\n` delimiter) and places it into the active **Pattern Space**. It strips the trailing newline.

It then executes the provided script commands sequentially against this buffer. For example, if the script is `s/a/b/; /foo/d`, it first runs the substitution on the buffer. Then, it evaluates the deletion command; if the buffer contains "foo", `sed` deletes the buffer entirely, skips all remaining commands, and jumps to the next line.

Once all commands finish executing (and assuming the buffer wasn't deleted), `sed` automatically appends a newline to the altered Pattern Space and flushes it to standard output. (The `-n` flag silences this automatic flush). The Pattern Space is then cleared, the next line is read, and the cycle repeats.

The **Hold Space** acts as secondary storage. Advanced commands (`h`, `H`, `g`, `G`, `x`) allow developers to copy the Pattern Space into the Hold Space, process new lines, and then retrieve the stored data later. This is what allows `sed` to execute complex multi-line logic and mathematical Turing-complete operations, albeit via highly esoteric, assembly-like syntax.

## Performance Notes

- **Memory Efficiency:** Because `sed` operates strictly line-by-line within the microscopic Pattern Space, it consumes practically zero RAM. It can execute complex regex substitutions across a 500-Gigabyte text file instantly, outperforming dynamic languages like Python or Ruby that attempt to load massive strings into heap memory.
- **ERE Flag Optimization:** Utilizing Extended Regular Expressions (`-E`) utilizes modern POSIX regex compilation libraries, which often execute complex pattern matching and grouping significantly faster than basic `sed` escaping logic.

## Security Notes

- **Symlink Destruction (`-i` flag):** In older versions of GNU `sed`, running `sed -i` on a symbolic link would physically destroy the link, replace it with a standard file, and write the output, breaking filesystem architecture. Modern GNU `sed` natively follows symlinks (usually via `--follow-symlinks`), but extreme caution must be exercised when mutating system configuration links.

## Common Mistakes

- **Using `-i` without backups:** Running `sed -i 's/a/b/' file.txt`. **Why it's wrong:** The `-i` flag overwrites the file physically. If your regex is slightly flawed, your original data is permanently destroyed. Always test without `-i` first, or utilize `-i.bak` to force `sed` to generate a safe rollback file.
- **Leaning Toothpick Syndrome:** Running `sed 's/\/var\/www\/html/\/opt\/web/g'`. **Why it's wrong:** Escaping forward slashes when manipulating file paths makes the script totally unreadable. You can use any delimiter after the `s` command. Use `sed 's|/var/www/html|/opt/web|g'` to maintain clean syntax.
- **Expecting `\n` to match multiple lines natively:** **Why it's wrong:** `sed` reads line-by-line and explicitly strips the `\n` character before placing the text in the Pattern Space. Therefore, searching for `\n` inside standard `sed` commands will never work. You must employ advanced multi-line commands (`N`) or switch to `perl -0777 -pe`.

## Best Practices

- When extracting highly specific data streams (like IP addresses or ID numbers), combine the Silent flag (`-n`) with the Print command (`p`): `sed -n 's/.*ID=\([0-9]*\).*/\1/p'`. This guarantees nothing is printed except the exact mathematical match.
- Use line addressing to vastly accelerate executions on massive files. If you only need to run a substitution on the first 100 lines, use `sed '1,100s/foo/bar/'`. `sed` bypasses evaluating the regex on the remaining millions of lines, saving massive CPU cycles.
- If writing cross-platform shell scripts (targeting both Linux and macOS), avoid `sed -i` entirely due to unresolvable syntax incompatibilities. Use the temporary file redirection pattern: `sed 's/a/b/' file > tmp && mv tmp file`.

## Interview Questions

- _Query:_ A developer attempts to extract all text between `<start>` and `<end>` tags using `sed -n '/<start>/,/<end>/p' file.txt`. However, this prints the boundary tags themselves. How do you instruct `sed` to print only the inner payload, dynamically stripping the boundary tags?
  - _A:_ The comma operator creates a range address, applying the print (`p`) command to every line between the two matches. To strip the boundaries, you must chain commands using curly braces `{}`. You instruct `sed` to delete (`d`) the lines if they explicitly contain the boundary markers: `sed -n '/<start>/,/<end>/{ /<start>/d; /<end>/d; p }' file.txt`.
- _Query:_ What is the fundamental, architectural difference between how `sed` evaluates regular expressions compared to a modern language like Python or Perl?
  - _A:_ `sed` inherently uses POSIX Basic Regular Expressions (BRE), or Extended Regular Expressions (ERE) with the `-E` flag. Critically, standard POSIX regex does not support Non-Greedy (Lazy) quantifiers like `.*?`, nor does it support Zero-Width Assertions (Lookaheads/Lookbehinds). If a developer attempts to use `.*?` in `sed`, it will fail syntactically or evaluate greedily to the end of the line, forcing the developer to use negated character classes (`[^<]*`) instead.
- _Query:_ Explain the internal mechanism of the `-i` (in-place edit) flag in GNU `sed`. Does it physically overwrite the bytes on the hard drive sector-by-sector?
  - _A:_ No. `sed -i` is a destructive abstraction. When executed, `sed` physically creates a brand new temporary file in the directory. It streams the data from the original file, processes the substitutions, and writes the output into the new temporary file. Once complete, it invokes the `rename()` system call to atomically swap the temporary file over the original file, effectively overwriting it while preserving the original inode structure if possible.

## Practice Problems

- _Problem:_ Execute an in-place substitution on `config.yaml`, searching for the exact string `password: secret`, and replacing it with `password: REDACTED`. Ensure the command creates a backup of the original file named `config.yaml.bak`.
  - _Hint:_ Combine the in-place editing flag with a specific suffix string, and execute a standard substitution.
  - _Solution:_ `sed -i.bak 's/password: secret/password: REDACTED/g' config.yaml` (The suffix attached directly to `-i` handles the backup snapshot natively).
- _Problem:_ Extract the specific block of text from `logs.txt` starting exactly at line 500 and ending exactly at line 1000. Suppress all other output, and print only those 500 lines to the terminal.
  - _Hint:_ Combine the silent flag with numerical line addressing and the explicit print command.
  - _Solution:_ `sed -n '500,1000p' logs.txt` (This utilizes the range address operator to isolate the execution scope perfectly).

## References

- [GNU Sed Manual](https://www.gnu.org/software/sed/manual/sed.html)
- [Bruce Barnett's Sed FAQ](http://www.grymoire.com/Unix/Sed.html)
  === END FILE ===
