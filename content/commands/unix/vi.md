---
slug: vi
name: vi
aliases:
  - vim
  - ex editor
category: unix
tags:
  - linux
  - editor
  - text-editing
  - terminal
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
  - edit file in terminal vi
  - exit vi editor save
  - search and replace text in vi
  - open file at line number vi
  - execute search and replace opening file
relatedCommands:
  - sed
  - awk
  - cat
  - less
  - ed
alternatives:
  - sed
status: draft
---

## What is it?

`vi` (Visual Editor) is the ubiquitous, POSIX-standard, screen-oriented text editor natively installed on virtually every UNIX system in existence. Built originally for slow teleprinter terminals, it utilizes a deeply efficient "modal" editing architecture, separating text insertion from text manipulation (navigation, deletion, substitution) to allow engineers to edit code and configuration files at blistering speeds without relying on a mouse.

## Why does it exist?

In the 1970s, editing text on UNIX required `ed` or `ex`, which were "line editors" that only displayed one line of a file at a time, requiring blind commands to make changes. Bill Joy created `vi` in 1976 to provide a "visual" mode over `ex`, drawing an entire screen of text simultaneously. Its modal architecture exists entirely out of necessity: early keyboards lacked dedicated arrow keys or modifier key clusters. By separating Insert mode from Normal (Command) mode, `vi` allows the standard alphanumeric keys (`h`, `j`, `k`, `l`) to mathematically control the cursor, drastically minimizing hand movement and maximizing editing efficiency over low-bandwidth SSH connections.

## Syntax

```bash
vi [options] [file...]
```

## Flags

| Flag          | Description                                                                                                     | Example                         |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `-R`          | Opens the file in Read-Only mode (identical to executing the `view` command). Prevents accidental overwrites.   | `vi -R /etc/passwd`             |
| `-r <file>`   | Recovery mode. Lists or recovers swap files (`.swp`) left behind by a system crash or disconnected SSH session. | `vi -r dirty_script.sh`         |
| `+<num>`      | Initializes the editor, instantly jumping the cursor to the specified absolute line number.                     | `vi +150 app.py`                |
| `+/<pattern>` | Initializes the editor, instantly executing a regex search and jumping to the first match.                      | `vi +/ERROR syslog`             |
| `-c <cmd>`    | Executes an `ex` command strictly after the first file has been completely loaded into the buffer.              | `vi -c "%s/foo/bar/g" text.txt` |
| `-x`          | Prompts for an encryption key to open, edit, and save the file using symmetric encryption.                      | `vi -x secret.key`              |
| `-e`          | Starts `vi` in the legacy `ex` (line editor) mode, rather than visual screen mode.                              | `vi -e script.sh`               |
| `-s`          | Silent/Batch mode (only valid with `-e`). Suppresses all interactive prompts, executing standard input scripts. | `vi -e -s file < commands.txt`  |
| `-w <size>`   | explicitly sets the visual window size (number of rows) regardless of terminal dimensions.                      | `vi -w 10 document.md`          |
| `-n`          | Disables the creation of the `.swp` (swap) file, performing all editing strictly in volatile RAM.               | `vi -n config.json`             |

## Examples

```bash
vi /etc/ssh/sshd_config
```

> This is the foundational execution. The editor consumes the terminal screen, loads the file into a memory buffer, and initializes in Normal mode. The user types `i` to Insert text, `Esc` to return to Normal mode, and types `:wq` to write the changes and quit.

```bash
vi +525 /var/log/application.log
```

> Systems administrators debugging a stack trace explicitly open the log file directly at the line where the error occurred (`+525`). This eliminates the need to manually scroll through thousands of lines of text upon opening.

```bash
vi +/localhost config.yaml
```

> This initializes the editor dynamically. Instead of a line number, the editor automatically executes a forward search for the string `localhost`, dropping the cursor on the exact target line instantly upon boot.

```bash
vi -R production_database.sql
```

> This opens a massive, critical data file in strict Read-Only mode. It allows the operator to utilize all of `vi`'s powerful regex search and navigation features, but mathematically prevents the editor from saving any accidental keystrokes to the disk.

```bash
vi -c "%s/127.0.0.1/10.0.0.5/g" -c "wq" deployment.conf
```

> This uses `vi` as a non-interactive stream editor equivalent to `sed`. It opens the file, executes a global substitution across all lines (`%s`), executes a write-and-quit (`wq`), and instantly returns to the bash prompt, modifying the file in-place securely.

## Real-World Scenarios

**Recovering from Severed VPN Connections**

```bash
vi -r /etc/fstab
```

> An administrator is editing a critical mount file when their VPN disconnects. The `vi` process dies, but the kernel leaves behind a `.fstab.swp` file. Upon reconnecting, the administrator executes the recovery flag (`-r`), and `vi` reconstructs the exact unsaved state of the file from the binary swap ledger.

**Editing Highly Restricted Kernel Parameters**

```bash
sudo vi /etc/sysctl.conf
```

> Modern Linux servers intentionally omit heavy text editors (like VS Code or Emacs) and graphical dependencies. `vi` is the absolute guarantee. Cloud engineers universally rely on `vi` to hot-patch kernel limits or networking IP routes directly on headless, sterile production nodes.

## When should it NOT be used?

- **Massive, multi-file code refactoring:** **Reason:** `vi` is excellent for surgical edits. Complex operations across 50 project files requiring deep AST parsing, intellisense, or Git conflict resolution are horrific in raw `vi`. **Use instead:** Modern IDEs (VS Code, IntelliJ) or advanced Neovim configurations.
- **Simple stream replacements in bash scripts:** **Reason:** Spawning an interactive visual editor to replace a single string blocks script execution. While `-c` works, it is architecturally heavy. **Use instead:** `sed -i` or `perl -pi`.

## Alternatives

- **`vim` (Vi IMproved):** The modern standard. **Tradeoff:** `vim` is a vast superset of `vi`, adding syntax highlighting, unlimited undo trees, and plugin ecosystems. On modern Linux (like Ubuntu), typing `vi` is actually a symlink that secretly executes `vim-tiny`.
- **`nano`:** The beginner-friendly editor. **Tradeoff:** `nano` stays entirely in insert mode and displays its keyboard shortcuts (`^O` to save) at the bottom of the screen. It is significantly easier for complete beginners to use, but lacks the blinding speed and regex power of `vi`'s modal system.
- **`ed`:** The standard text editor. **Tradeoff:** The prehistoric line editor from 1969. It prints absolutely nothing to the screen unless explicitly commanded, making it virtually unusable for humans, but technically lighter than `vi`.

## How it works internally

`vi` operates fundamentally on a "buffer" paradigm. When you execute `vi file.txt`, the editor does not edit the file on the hard drive. It allocates RAM, executes a `read()` system call, and copies the entire text payload into a memory buffer.

Simultaneously, `vi` creates a hidden binary swap file in the same directory (e.g., `.file.txt.swp`). As you execute changes, `vi` doesn't just mutate the RAM buffer; it writes delta instructions (adds, deletes, keystrokes) to this physical swap file periodically. This architecture ensures that if the server loses power, the RAM is destroyed, but the `.swp` ledger survives on disk to reconstruct the edits.

`vi` interprets input through its modal state machine:

- **Normal Mode (Default):** Every keystroke is evaluated as a mathematical command. `5dd` deletes 5 lines. The editor parses the integer (`5`), the operator (`d`), and the motion (`d` again, indicating line).
- **Insert Mode:** Triggered by `i`, `a`, or `o`. The editor disables command parsing. Every keystroke is treated as literal text and injected into the memory buffer.
- **Ex (Command) Mode:** Triggered by `:`. The editor shifts focus to the bottom prompt, accepting robust, file-wide POSIX regex commands (like `%s/a/b/g`) passed directly to the legacy `ex` parsing engine.

When the user types `:w`, `vi` executes a `write()` system call, flushing the entire modified RAM buffer sequentially back onto the original physical disk file, and deletes the `.swp` file upon `:q` (quit).

## Performance Notes

- **Massive File Saturation:** Standard `vi` attempts to load the entire file into RAM, calculate syntax, and map line wraps. Opening a 20GB database dump in `vi` will cause the application to freeze, consume all system memory, and potentially trigger an Out-Of-Memory (OOM) kernel kill. Always use `less` for massive read-only files.
- **The Swap Overhead:** Over heavily latent NFS or CIFS network shares, editing a file causes `vi` to constantly execute `fsync()` writes to the `.swp` file over the network. Setting `vi -n` disables the swap file, vastly accelerating remote editing speeds at the cost of crash recovery.

## Security Notes

- **Swap File Data Leaks:** If a user edits a sensitive file containing database passwords (e.g., `.env`), `vi` creates a `.env.swp` file. If the editor crashes, the swap file is left behind. If this directory is publicly accessible on a web server, attackers can download `.env.swp` and extract the plaintext passwords, bypassing standard web configuration protections. Always cleanly exit `vi` to ensure swap cleanup.
- **Sudoedit:** Never run `sudo vi /etc/shadow`. If an attacker compromises your shell environment variables, they can hijack the editor. Always use `sudoedit /etc/shadow`. This securely copies the file to a temporary location, opens `vi` as your unprivileged user, and only uses root privileges to copy the safely edited file back.

## Common Mistakes

- **Getting trapped in the editor:** Typing `Ctrl+C` or `q` and failing to exit. **Why it's wrong:** `vi` is modal. Keystrokes do nothing if you are in the wrong mode. You must hit `Esc` (to guarantee Normal mode), type `:` (to enter Command mode), type `q!` (quit forcefully, discarding changes), and hit Enter.
- **Using the arrow keys in Insert mode on legacy systems:** **Why it's wrong:** On strict, legacy POSIX `vi` (like on Alpine Linux or AIX), pressing the Up Arrow while in Insert Mode injects literal ANSI escape characters (like `^[OA`) into your code instead of moving the cursor. You must hit `Esc`, use `k` to move up, and hit `i` to insert again.
- **Crashing with "E325: ATTENTION":** **Why it's wrong:** Opening a file and seeing a massive warning about an existing swap file. This means either another administrator is actively editing the file _right now_, or a previous session crashed. Blindly pressing Enter risks corrupting the file via race conditions. You must investigate the PID listed in the warning.

## Best Practices

- When editing configuration files, universally adopt the habit of executing `:set paste` before entering Insert mode and pasting code from your clipboard. Modern terminal emulators auto-indent pasted text, causing a horrific "staircase" effect that permanently breaks YAML configurations. `:set paste` disables this logic safely.
- Master the native search and replace syntax (`:%s/old/new/gc`). The `c` flag at the end stands for "confirm". It will jump to every match in the file and prompt you `(y/n)` before making the replacement, preventing catastrophic global typos.
- Use `vi -R` (or the `view` alias) unconditionally when examining critical system files (like `/etc/sudoers`) to establish a physical barrier against accidental "fat-finger" keystrokes destroying production infrastructure.

## Interview Questions

- _Query:_ What is the exact sequence of keystrokes required to cleanly exit the `vi` editor and discard all accidental changes made to the file, and why does `Ctrl+C` fail to accomplish this?
  - _A:_ The sequence is `Esc` (to ensure you exit Insert mode and return to Normal mode), `:` (to enter Ex command mode), `q!` (quit and forcefully override unsaved changes), and `Enter`. `Ctrl+C` fails because `vi` traps the `SIGINT` terminal signal explicitly. It uses it to cancel active searches or half-typed commands, mathematically preventing users from accidentally destroying their editing buffer by bumping the keyboard.
- _Query:_ A developer attempts to edit `config.yaml` using `vi`. Upon opening the file, the screen is overtaken by a massive warning reading `E325: ATTENTION - Found a swap file by the name ".config.yaml.swp"`. What two scenarios cause this, and how should the developer proceed?
  - _A:_ This warning occurs because the hidden binary ledger file (`.swp`) exists on disk. Scenario 1: Another user is currently logged into the server and actively editing the exact same file in `vi`. Scenario 2: The developer was editing the file previously, and their SSH connection dropped or the server crashed before they could type `:wq`. The developer should press `q` to quit, check `ps aux` to see if another `vi` process is active, and if not, run `vi -r config.yaml` to recover the lost data.
- _Query:_ Explain the mechanical function of the `+/<pattern>` argument when executing `vi +/database config.json` from the bash prompt.
  - _A:_ This argument initializes the editor dynamically. Instead of opening the file at line 1, it instructs the internal `vi` execution engine to automatically run a forward regex search for the string `database` the exact millisecond the file buffer loads. The editor opens with the viewport centered and the cursor placed precisely on the first matching line, drastically accelerating targeted troubleshooting.

## Practice Problems

- _Problem:_ Open a file named `sysctl.conf` using the `vi` editor. Ensure the file opens completely protected against any accidental modifications, and force the editor to jump immediately to line number 50 upon opening.
  - _Hint:_ Combine the Read-Only flag with the specific line-initialization syntax.
  - _Solution:_ `vi -R +50 sysctl.conf` (This establishes a secure, hyper-targeted viewing environment).
- _Problem:_ Use `vi` as a non-interactive tool to append the exact text string `DEBUG=True` to the absolute bottom of a file named `.env`, saving the file and exiting back to the bash prompt instantly.
  - _Hint:_ Utilize the command-execution flag to pass an `ex` command. Use `$a` or simply append via an echo pipe if avoiding `vi` quirks, but for `vi` strictly: use the command flag.
  - _Solution:_ `vi -c "$ put ='DEBUG=True'" -c "wq" .env` (This forces the editor to jump to the last line `$`, put the string, write, and quit autonomously).

## References

- [POSIX Standard - vi utility](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)
- [Vim Official Documentation](https://www.vim.org/docs.php) (Inherits and expands base vi mechanics)
  === END FILE ===
