---
slug: man
name: man
aliases: []
category: linux
tags:
  - documentation
  - help
  - manual
  - reference
  - groff
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
  - how to use a command
  - find command options
  - linux manual pages
  - read system documentation
  - search for command syntax
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`man` is the system's manual pager, used to read, format, and navigate the on-system reference documentation. It provides access to detailed specifications for executable programs, configuration files, system calls, library functions, and kernel conventions.

## Why does it exist?

Before widespread internet access, Unix systems required comprehensive, self-contained documentation built directly into the operating system. `man` was developed to provide an authoritative, offline reference standard. It standardizes how documentation is written (via `troff`/`groff` macros) and consumed, ensuring administrators and developers always have immediate access to API specifications and command syntaxes directly from the terminal without external dependencies.

## Syntax

```bash
man [OPTIONS] [SECTION] PAGE...
man -k [KEYWORD]
```

## Flags

| Flag                     | Description                                                                                                | Example                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------- |
| `-k`, `--apropos`        | Searches the short descriptions and manual page names for a specific keyword or regex pattern.             | `man -k "remove file"` |
| `-f`, `--whatis`         | Displays only the brief, one-line description from the manual page.                                        | `man -f grep`          |
| `-w`, `--where`          | Prints the physical absolute file path of the manual page instead of rendering it.                         | `man -w sshd`          |
| `-a`, `--all`            | Displays all matching manual pages sequentially rather than stopping at the first one found.               | `man -a printf`        |
| `-c`, `--catman`         | Forces a re-format of the source manual page, ignoring any cached, pre-formatted versions.                 | `man -c bash`          |
| `-K`, `--global-apropos` | Performs a brute-force full-text search across all manual pages (extremely slow).                          | `man -K "O_DIRECT"`    |
| `-I`, `--match-case`     | Performs a strictly case-sensitive search for the manual page name.                                        | `man -I Readme`        |
| `-u`, `--update`         | Forces `man` to update its internal database caches to ensure newly installed pages are visible.           | `man -u`               |
| `-P`, `--pager=`         | Specifies a custom pager program to display the output, overriding the `PAGER` environment variable.       | `man -P cat ls`        |
| `-S`, `--sections=`      | Restricts the search to a specific, comma-separated list of manual sections.                               | `man -S 1,8 systemctl` |
| `-7`, `--ascii`          | Translates certain Latin1 characters to ASCII approximations to ensure compatibility with older terminals. | `man -7 utf8`          |

## Examples

```bash
man tar
```

> This opens the standard manual page for the `tar` command in your system's default pager (usually `less`), allowing you to read its syntax, flags, and examples. It defaults to Section 1 (User Commands).

```bash
man 5 passwd
```

> This forces `man` to look strictly in Section 5 (File Formats). Instead of displaying the documentation for the `passwd` executable, it displays the structure and formatting rules for the `/etc/passwd` configuration file.

```bash
man -k "network interface"
```

> This executes an `apropos` search against the `mandb` database, returning a list of all commands and files whose names or short descriptions contain the phrase "network interface".

```bash
man -a printf
```

> Because `printf` is both a shell command (Section 1) and a C library function (Section 3), this command displays the Section 1 page first. When you quit (`q`), it immediately opens the Section 3 page.

```bash
man -P cat ls | grep -A 3 "color"
```

> This sets the pager to `cat`, forcing `man` to dump the fully formatted text to standard output rather than opening an interactive pager. It then pipes that output to `grep` to extract specific lines.

## Real-World Scenarios

**Auditing System Call Behavior**

```bash
man 2 fork
```

> When writing or debugging C/C++ systems programming code, you must understand exactly how the OS handles process creation, including memory mappings and specific error codes (`ERRNO`). Section 2 specifically isolates Linux kernel system calls.

**Locating Forgotten Commands**

```bash
man -k "partition" | grep 8
```

> When you need to manage disk partitions but forget the specific command name (`fdisk`, `parted`, `sfdisk`), you search the database for "partition" and pipe the output to `grep 8` to isolate administrative tools (Section 8).

**Extracting Documentation for CI/CD Archiving**

```bash
zcat $(man -w ssh_config) > ssh_config_docs.txt
```

> When you need to parse or host the raw markup of a manual page elsewhere, you use `-w` to find the physical `.gz` file location, then immediately decompress it into a flat text file for external use.

## When should it NOT be used?

- **Quick syntax reminders:** `man` pages are historically dense, exhaustive specifications. If you only need to remember how to untar a file, use **`tldr`** instead for community-driven, practical examples.
- **GNU-specific hypertext documentation:** Many GNU tools (like `emacs` or `gcc`) only maintain basic `man` pages and store their actual, deeply structured documentation in Info format. Use **`info`** to navigate these hierarchical manuals.
- **Checking shell builtins:** Running `man cd` or `man alias` will often just dump you into the massive 5,000-line manual page for your entire shell (e.g., `bash`), which is unhelpful. Use the **`help`** builtin (e.g., `help cd`) for these internal commands.

## Alternatives

- **`tldr`:** A community-driven client that provides simplified, example-first documentation. Tradeoff: It lacks the exhaustive flag coverage and edge-case behaviors documented in `man`.
- **`info`:** The GNU project's official hyperlinked format. Tradeoff: Its navigation system (using emacs-like keystrokes) is notoriously unintuitive for modern users, though it handles complex documentation trees better than `man`'s flat structure.
- **`help`:** A shell builtin. Tradeoff: It only works for commands internal to the shell itself (like `cd`, `fg`, `bg`), providing no information on external binaries.

## How it works internally

Manual pages are written in a typesetting markup language called `troff` (specifically utilizing `man` or `mdoc` macro packages) and are typically stored as gzip-compressed files in `/usr/share/man/` or `/usr/local/share/man/`. They are categorized into rigid sections: (1) User Commands, (2) System Calls, (3) Library Functions, (4) Special Files/Devices, (5) File Formats, (6) Games, (7) Miscellanea, and (8) System Administration.

When invoked, the `man-db` (or `man`) binary resolves the requested page by scanning the directories specified in the `MANPATH` environment variable. It then decompresses the `.gz` file into memory, pipes it through the `groff` formatting engine to interpret the markup macros, translates bold and underline directives into terminal-specific ANSI escape sequences, and finally pipes the rendered output to the program specified in the `PAGER` environment variable (defaulting to `less`). To support fast `-k` (apropos) searches without grokking the filesystem, a background cron job or systemd timer periodically runs `mandb`, indexing the names and `NAME` section descriptions into a local binary cache.

## Performance Notes

- Opening a manual page is generally instantaneous and heavily optimized via caching (frequently accessed pages may be stored in `/var/cache/man` as pre-rendered `cat` files).
- Using `-K` (global full-text search) is catastrophically slow on large filesystems because it sequentially decompresses and regex-scans thousands of `.gz` files.
- If `man -k` returns "nothing appropriate" for newly installed software, it is because the asynchronous `mandb` indexer hasn't run yet. Run `sudo mandb` to manually force a database rebuild.

## Security Notes

- **Arbitrary Code Execution via PAGER:** `man` executes the binary specified in the user's `PAGER` or `MANPAGER` environment variables. If an attacker can modify a user's `.bashrc` to point `PAGER` to a malicious script, they achieve execution whenever the user seeks help.
- **Privilege Dropping:** Historically, `man` was a setuid binary so it could write cached files to `/var/cache/man/`. Modern implementations aggressively drop these privileges before executing external formatting filters or pagers to mitigate privilege escalation vectors.
- **Format String Vulnerabilities:** Because `man` parses arbitrary input from untrusted troff source files (if downloaded from third-party repositories), vulnerabilities in the underlying `groff` pipeline can theoretically compromise the user's terminal session.

## Common Mistakes

- **Ignoring sections:** Typing `man printf` to look up the C function, and getting confused when the shell command syntax appears instead. **Why it's wrong:** `man` stops searching at the first match it finds chronologically (Section 1). You must specify the section: `man 3 printf`.
- **Piping output without modifying the pager:** Running `man ls | grep foo` and getting output littered with `^H` and ANSI color codes. **Why it's wrong:** The default pager attempts to maintain terminal formatting. You must bypass the pager using `man -P cat ls | grep foo` to get clean plaintext.
- **Assuming configuration files share the command name:** Searching for `man sshd_config` works, but searching for `man resolv` fails. **Why it's wrong:** Configuration files don't always match the binary name. You should use `man -k dns` or `man -k resolv` to find `resolv.conf`.

## Best Practices

- Master `less` navigation shortcuts since it is the default pager: use `/` to search forward, `?` to search backward, `n` to jump to the next match, and `q` to quit.
- Regularly browse Section 7 for high-level overviews of system architecture, protocols, and concepts rather than specific commands (e.g., `man 7 regex`, `man 7 boot`, `man 7 signal`).
- Set the `MANPAGER` environment variable in your shell profile to include color-rendering flags (e.g., `export MANPAGER="less -R --use-color -Dd+r -Du+b"`) to drastically improve readability over standard monochrome text.

## Interview Questions

**Q:** What is the significance of the numbers in parentheses after a command name in documentation, such as `crontab(5)` versus `crontab(1)`?
**A:** The numbers indicate the specific manual section. Section 1 refers to general user commands (the `crontab` executable), while Section 5 refers to file formats and conventions (the syntax of the `crontab` file itself).

**Q:** How do you find the appropriate command for a task when you do not know the command's exact name?
**A:** You use `man -k "keyword"` (or the equivalent `apropos "keyword"`), which searches the cached descriptions of all manual pages for the specified term.

**Q:** Where are manual pages physically stored on a standard Linux filesystem?
**A:** They are typically stored as gzip-compressed `troff` files inside the `/usr/share/man/` directory, organized into subdirectories by section (e.g., `/usr/share/man/man1/`).

## Practice Problems

**Problem:** You need to understand the syntax rules for the `/etc/fstab` file. Open the manual page specifically for this file format.
**Hint:** Configuration files are stored in Section 5.
**Solution:** `man 5 fstab` (This skips any executables named `fstab` and pulls the configuration documentation directly).

**Problem:** Find the physical file path of the manual page for the `sudo` command without actually opening the documentation.
**Hint:** Use the flag that tells `man` _where_ the file is located.
**Solution:** `man -w sudo` (This returns the absolute path, such as `/usr/share/man/man8/sudo.8.gz`, instead of invoking the pager).

## References

- [man(1) - Linux manual page](https://man7.org/linux/man-pages/man1/man.1.html)
- [man-pages(7) - Linux manual page conventions](https://man7.org/linux/man-pages/man7/man-pages.7.html)
  === END FILE ===
