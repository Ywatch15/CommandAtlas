---
slug: cat
name: cat
aliases:
  - concatenate
category: text-processing
tags:
  - linux
  - text-processing
  - files
  - stdout
  - read
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
  - read file in terminal
  - concatenate multiple files bash
  - print text file to screen
  - view hidden characters in file
  - create new file with cat eof
relatedCommands:
  - less
  - more
  - tail
  - head
  - tac
  - nl
  - paste
  - split
  - dd
  - tee
  - vi
alternatives:
  - less
  - get-content
  - nl
  - dd
  - tee
status: draft
---

## What is it?

`cat` (concatenate) is one of the oldest and most fundamental POSIX utilities. Its primary architectural purpose is to read data sequentially from multiple file descriptors or standard input, stitch them together end-to-end, and dump the continuous, combined byte stream directly to standard output without pausing or paginating.

## Why does it exist?

In traditional UNIX pipelines, utilities are designed to accept data from standard input. While many commands natively accept filenames as arguments, `cat` exists as the absolute, generalized delivery mechanism. It abstracts the file system entirely, reading raw bytes from disks, memory streams, or hardware devices (`/dev/urandom`), and blindly "piping" those bytes directly into the inputs of downstream processors like `grep` or `awk`, facilitating complex, chained execution topologies.

## Syntax

```bash
cat [OPTION]... [FILE]...
```

## Flags

| Flag                       | Description                                                                                        | Example                   |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------- |
| `-n`, `--number`           | Prepends a sequential integer line number to every line of output.                                 | `cat -n script.sh`        |
| `-b`, `--number-nonblank`  | Numbers output lines, but explicitly skips numbering empty/blank lines.                            | `cat -b document.txt`     |
| `-s`, `--squeeze-blank`    | Suppresses repeated empty lines, compressing blocks of blank space into a single blank line.       | `cat -s messy_log.txt`    |
| `-v`, `--show-nonprinting` | Displays normally invisible control characters (except `\n` and `\t`) using `^` and `M-` notation. | `cat -v corrupt_file.bin` |
| `-E`, `--show-ends`        | Appends a literal `$` character to the absolute end of every line, revealing trailing spaces.      | `cat -E data.csv`         |
| `-T`, `--show-tabs`        | Replaces all physical Tab characters in the output with the literal string `^I`.                   | `cat -T Makefile`         |
| `-A`, `--show-all`         | Equivalent to combining `-vET`. Exposes every single hidden formatting character in the file.      | `cat -A windows_file.txt` |
| `-u`                       | Disables output buffering, forcing bytes to be written instantly (rarely needed in modern OSs).    | `tail -f log \| cat -u`   |

## Examples

```bash
cat /etc/os-release
```

> This is the ubiquitous, colloquial usage. It opens the OS identifier file, dumps its short contents directly to the terminal standard output, and immediately returns control to the shell prompt.

```bash
cat file1.txt file2.txt file3.txt > merged.txt
```

> This utilizes the utility for its true namesake: concatenation. It reads the three files sequentially from left to right, joins them end-to-end flawlessly in RAM, and utilizes the bash redirection operator (`>`) to stream the combined payload into a brand new file.

```bash
cat -A suspicious_script.sh
```

> This activates advanced diagnostic formatting (`-A`). Security engineers use this to reveal hidden, malicious control characters (like backspaces or ANSI escapes) designed to spoof terminal output, and to clearly differentiate between spaces and tabs (`^I`).

```bash
cat <<EOF> config.json
{
  "status": "active",
  "port": 8080
}
EOF
```

> This relies on a bash construct called a **Here-Document**. `cat` opens an input stream and waits. The shell feeds the raw multi-line string block into `cat` until it hits the `EOF` delimiter. `cat` then pushes that exact multi-line structure, preserving formatting, into `config.json`.

```bash
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 32
```

> This utilizes `cat` to stream endless binary data from a physical Linux kernel device (`/dev/urandom`). The raw bytes are piped into `tr` to filter out non-alphanumeric characters, creating a secure, 32-character random password generator.

## Real-World Scenarios

**Bundling SSL/TLS Certificates**

```bash
cat domain_cert.pem intermediate_ca.pem root_ca.pem > fullchain.pem
```

> Web servers (like Nginx) strictly require cryptographic trust chains to be bundled in a specific top-down hierarchy within a single file. Systems administrators universally rely on `cat` to mathematically combine the discrete `.pem` files sequentially into the required `fullchain.pem` payload.

**Debugging Windows Text File Corruption**

```bash
cat -v script_from_windows.sh
```

> A bash script copied from a Windows developer's machine throws strange "command not found" syntax errors. Running `cat -v` reveals that every line terminates in `^M` (Carriage Return). Windows uses `\r\n` for newlines, while Linux expects `\n`. The visual output proves the file needs to be passed through `dos2unix`.

## When should it NOT be used?

- **The Useless Use of Cat (UUOC):** **Reason:** Running `cat file.txt | grep "error"` is a legendary anti-pattern. It pointlessly spawns a `cat` subshell just to open a file. **Use instead:** `grep "error" file.txt` or `grep "error" < file.txt`. Modern commands natively open files; they do not need `cat` to feed them.
- **Reading massively large logs (10GB+):** **Reason:** `cat` dumps the entire file continuously. On a 10GB file, your terminal will violently scroll for 15 minutes, consuming CPU resources to render useless text you cannot read. **Use instead:** `less` to paginate, or `tail` to view the end.
- **Viewing compiled binary files:** **Reason:** Executing `cat /bin/ls` dumps raw, unprintable machine code instructions (null bytes, escape sequences) directly to your TTY. This frequently scrambles the terminal keymap, rendering the shell completely unusable. **Use instead:** `hexdump`, `strings`, or `xxd`.

## Alternatives

- **`bat`:** The modern clone. **Tradeoff:** A rust-based alternative that supports native syntax highlighting, git-diff integrations, and automatic pagination. Highly recommended for daily human interaction, but lacks the ubiquitous availability of `cat` on sterile servers.
- **`tac`:** Reverse concatenation. **Tradeoff:** It behaves exactly like `cat`, but prints lines in absolute reverse order (bottom to top). Ideal for reading chronological log files backward to see the most recent events first without using `tail`.
- **Input Redirection (`<`):** Native shell bridging. **Tradeoff:** `command < file.txt` feeds a file into a command's standard input securely via the shell itself, entirely bypassing the need to invoke the `cat` binary.

## How it works internally

`cat` is one of the simplest C programs in the coreutils library.

When executed on a list of files, it iterates through the arguments sequentially. For each file, it invokes the `open()` system call to obtain a file descriptor.

It enters a highly optimized `while` loop, allocating a fixed-size memory buffer (typically sized to match the filesystem's block geometry, such as 4KB or 8KB). It invokes the `read()` syscall to pull chunks of bytes from the file descriptor into the buffer, and instantly invokes the `write()` syscall to push that exact buffer directly to file descriptor 1 (`stdout`). It repeats this cycle until `read()` returns 0 (indicating End of File), closes the file, and proceeds to the next argument.

In highly advanced, modern Linux kernels, if `cat` detects it is routing a physical file directly to another physical file or socket (and no formatting flags like `-n` or `-v` are engaged), it can abandon the `read/write` user-space loop entirely. Instead, it utilizes the `sendfile()` or `copy_file_range()` system calls, instructing the kernel to splice the bytes directly between the disk drivers internally, achieving zero-copy transfer speeds.

## Performance Notes

- Because `cat` operates using buffered block I/O, it executes file transfers at the absolute maximum read/write throughput speed physically permitted by the underlying SSD or NVMe hardware.
- Applying any formatting flags (`-n`, `-v`, `-A`) disables zero-copy kernel optimizations. `cat` must load every byte into CPU registers, check for newlines or non-printable ASCII codes, and manipulate the string array before pushing it to standard output, measurably reducing throughput on multi-gigabyte files.

## Security Notes

- **Arbitrary File Reads:** `cat` possesses no internal security checks. If executed via `sudo cat /etc/shadow`, it blindly dumps the encrypted system password hashes to the screen. It is a highly sensitive binary if exposed via misconfigured `sudoers` files.
- **Terminal Escape Exploits:** If an attacker writes malicious ANSI terminal escape sequences into a log file, an administrator running `cat` on that log file will execute those escape sequences natively in their terminal. This can spoof fake `sudo` prompts or overwrite the terminal display. Always use `cat -v` on untrusted external files to neutralize executable escape sequences.

## Common Mistakes

- **Overwriting the source file:** Running `cat file1 file2 > file1`. **Why it's wrong:** The shell evaluates redirection (`>`) before executing the binary. It truncates (empties) `file1` to 0 bytes instantly. When `cat` boots and attempts to read `file1`, the data is permanently gone. You must redirect to a new, distinct filename or use a sponge utility.
- **Useless Use of Cat (UUOC) in loops:** Running `cat ips.txt | while read ip; do ...`. **Why it's wrong:** Spawns an unnecessary subshell and binary. **Fix:** `while read ip; do ... done < ips.txt`.
- **Assuming `-n` is reliable for code line numbers:** **Why it's wrong:** The `-n` flag indiscriminately numbers blank lines. If you need structural code references, use `-b` (skips blank lines) or the vastly more powerful `nl` command.

## Best Practices

- Universally audit your automation scripts for "Useless Uses of Cat." If you see `cat file | grep X`, rewrite it as `grep X file`. It executes faster, consumes less RAM, and preserves the exit codes of the primary command cleanly.
- When evaluating dirty data sets (like CSVs loaded from Excel), immediately execute `cat -A data.csv | head` to explicitly verify the presence of hidden carriage returns (`^M`), preventing hours of downstream `awk` parsing failures.
- To create rapid, multi-line text files directly in the terminal without opening `nano` or `vim`, utilize the `cat > file.txt` pattern. Type your text, hit Enter, and press `Ctrl+D` (EOF) to save and close the stream.

## Interview Questions

**Q:** A developer writes the command `cat auth.log | awk '{print $1}' | sort | uniq -c`. While functionally correct, senior engineers reject this pull request due to a "UUOC" anti-pattern. Explain what this is and how to rewrite the command optimally.
**A:** UUOC stands for "Useless Use of Cat." The `cat` command is completely redundant here. It spawns an extra subshell process and consumes CPU/RAM simply to pipe text into `awk`. The `awk` utility is natively designed to open and read files independently. The command should be rewritten optimally as `awk '{print $1}' auth.log | sort | uniq -c`, eliminating the useless binary execution.
**Q:** You receive a bash script from a colleague using a Windows laptop. The script looks perfectly normal, but when you execute it on your Linux server, the shell throws bizarre `\r: command not found` syntax errors on every line. What `cat` command flag will visually diagnose the root cause of this error?
**A:** The `-v` (show-nonprinting) or `-A` (show-all) flags. Windows utilizes `\r\n` (Carriage Return + Line Feed) for line endings, while Linux strictly expects `\n` (Line Feed). The Linux bash interpreter attempts to execute the invisible `\r` character as part of the command text. Running `cat -v script.sh` will explicitly render the invisible carriage returns as `^M` symbols at the end of every line, proving the file requires `dos2unix` conversion.
**Q:** What catastrophic data loss occurs if you execute the command `cat header.txt body.txt footer.txt > header.txt` to merge three files into one?
**A:** The shell evaluates the `>` output redirection operator _before_ it launches the `cat` binary. The shell instantly opens `header.txt` with the `O_TRUNC` flag, shredding the file down to 0 bytes. By the time the `cat` binary actually starts and attempts to read `header.txt`, its original contents are permanently destroyed, resulting in a merged file containing only the body and footer.

## Practice Problems

**Problem:** Combine the contents of `part1.log` and `part2.log` into a single stream, but output the data safely to the terminal by exposing all invisible control characters and appending a `$` to the end of every line to verify there are no trailing spaces.
**Hint:** Combine multiple files and utilize the advanced diagnostic formatting flags.
**Solution:** `cat -A part1.log part2.log` (The `-A` flag acts as an omni-tool, combining `-v`, `-E`, and `-T` to perfectly map invisible text boundaries).
**Problem:** Without opening a text editor like `nano`, use a single command block directly in the bash terminal to create a new file named `app.env` containing exactly two lines of text: `ENV=PROD` and `PORT=443`.
**Hint:** Utilize a Here-Document construct bridged to the `cat` utility and redirected to the target file.
**Solution:**
`bash
    cat <<EOF> app.env
    ENV=PROD
    PORT=443
    EOF
    `

## References

- [GNU Coreutils - cat invocation](https://www.gnu.org/software/coreutils/manual/html_node/cat-invocation.html)
- [Wikipedia - Useless use of cat](<https://en.wikipedia.org/wiki/Cat_(Unix)#Useless_use_of_cat>)
  === END FILE ===
