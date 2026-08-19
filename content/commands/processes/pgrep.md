---
slug: pgrep
name: pgrep
aliases:
  - process grep
category: processes
tags:
  - linux
  - processes
  - search
  - regex
  - psmisc
  - monitoring
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
  - find process ID by name
  - get PID of running application
  - search processes regex linux
  - list all PIDs for user
  - find exact process ID without ps aux
relatedCommands:
  - pkill
  - killall
  - ps
  - top
  - fuser
alternatives:
  - ps
  - pidof
status: draft
---

## What is it?

`pgrep` (Process Grep) is a command-line utility from the `psmisc` (or `procps`) suite used to search the active kernel process table and return the Process IDs (PIDs) of applications matching a specific name, regular expression, or attribute constraint. It seamlessly replaces the convoluted and error-prone `ps aux | grep [n]ame | awk '{print $2}'` pipeline pattern.

## Why does it exist?

Automated shell scripts routinely need to query the state of running daemons or extract PIDs to pass into monitoring or termination tools (`kill`). Historically, engineers chained `ps` with `grep`, which famously resulted in the "grep matching itself" problem (where the `grep` process appears in its own output). `pgrep` exists to solve this inherently by natively iterating over the kernel's process array internally. It provides clean, programmable outputs composed entirely of integer PIDs and supports complex attribute filtering (like finding processes owned by specific users or attached to specific terminals).

## Syntax

```bash
pgrep [options] pattern
```

## Flags

| Flag                 | Description                                                                                                 | Example                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `-l`, `--list-name`  | Lists the process name alongside the numeric PID in the output, vastly improving human readability.         | `pgrep -l sshd`                         |
| `-a`, `--list-full`  | Lists the full command-line execution string alongside the PID, identical to `ps aux` output.               | `pgrep -a python`                       |
| `-f`, `--full`       | Matches the regex pattern against the entire command line, not just the 15-character truncated binary name. | `pgrep -f "worker.js --queue=critical"` |
| `-u <uid>`, `--euid` | Restricts matches to processes with a specific Effective User ID (EUID).                                    | `pgrep -u www-data php`                 |
| `-U <uid>`, `--uid`  | Restricts matches to processes with a specific Real User ID (RUID).                                         | `pgrep -U root bash`                    |
| `-x`, `--exact`      | Enforces a strict exact string match on the process name, disabling partial regex substring matching.       | `pgrep -x nginx`                        |
| `-n`, `--newest`     | Returns only the single newest (most recently spawned) process matching the pattern.                        | `pgrep -n java`                         |
| `-o`, `--oldest`     | Returns only the single oldest (longest running) process matching the pattern.                              | `pgrep -o postgres`                     |
| `-v`, `--inverse`    | Inverts the match; returns the PIDs of every process that does _not_ match the pattern.                     | `pgrep -v root`                         |
| `-c`, `--count`      | Suppresses PID output and simply prints the total integer count of matching processes.                      | `pgrep -c apache2`                      |
| `-P <ppid>`          | Restricts matches strictly to children of the specified Parent Process ID.                                  | `pgrep -P 1`                            |

## Examples

```bash
pgrep sshd
```

> This queries the process table for any binary name containing the substring `sshd` and returns a raw, newline-separated list of purely integer Process IDs, perfectly formatted for programmatic parsing.

```bash
pgrep -l -u postgres
```

> This searches for all processes owned by the effective user `postgres`. The `-l` flag enriches the output, printing the actual binary name next to the PID so administrators can visually audit the returned processes.

```bash
pgrep -f "java.*-Xmx16G.*tomcat"
```

> This leverages the full command-line search flag (`-f`). Rather than matching on the generic `java` binary name, it evaluates a POSIX regular expression across the entire execution string, isolating the specific Tomcat instance configured with 16GB of RAM.

```bash
pgrep -c nginx
```

> This bypasses outputting PIDs entirely (`-c`), mathematically counting the matched instances and returning a single integer. This is highly useful in monitoring scripts asserting that exactly X number of worker nodes are actively running.

```bash
pgrep -x -n worker_daemon
```

> This employs strict boundaries. It forces an exact string match (`-x`), ensuring it doesn't accidentally catch `worker_daemon_backup`, and returns strictly the single newest (`-n`) PID spawned by the system, often used to track the latest deployment iteration.

## Real-World Scenarios

**Idempotent Daemon Initialization Scripts**

```bash
if ! pgrep -x "my_daemon" > /dev/null; then
    /opt/bin/my_daemon &
fi
```

> Bash initialization scripts (or legacy SysV init scripts) utilize `pgrep` as a rapid, silent boolean check. If the exact binary is not found in the process table, `pgrep` returns a non-zero exit code, triggering the script to safely spawn the daemon, guaranteeing multiple instances aren't accidentally launched.

**Targeted Automated Terminations**

```bash
pgrep -f "celery worker" | xargs -r kill -15
```

> Deployment pipelines isolating specific background task runners pipe the raw PIDs generated by a full-string `pgrep` match directly into `xargs kill`, enabling surgical shutdown of Python workers without relying on unreliable PID lockfiles.

**Auditing Zombie or Orphaned SSH Sessions**

```bash
pgrep -o -u deployer sshd
```

> System sweepers hunting for stale, hanging connections grab the absolute oldest (`-o`) SSH process owned by a specific service account, allowing scripts to evaluate its uptime and aggressively prune abandoned CI/CD deployment tunnels.

## When should it NOT be used?

- **Terminating processes matched by name:** **Reason:** Running `pgrep name | xargs kill` relies on piping and multiple binaries. **Use instead:** `pkill name`, which perfectly combines both functions internally and safely.
- **Diagnosing comprehensive system performance (CPU/RAM):** **Reason:** `pgrep` strictly extracts metadata identifiers (PIDs/Names). It has zero knowledge of CPU percentage, Resident Memory (RES), or I/O states. **Use instead:** `top`, `htop`, or `ps aux`.

## Alternatives

- **`pidof`:** Strict PID finder. **Tradeoff:** `pidof` demands the exact, literal string name of the program to return PIDs, whereas `pgrep` natively supports fuzzy regular expression matching and complex attribute filtering (like users or parents).
- **`ps aux | grep [n]ame`:** The legacy pipeline hack. **Tradeoff:** This ancient hack uses `[n]` to prevent grep from matching itself. It is prone to word-splitting errors, requires heavy piping through `awk`, and executes drastically slower than `pgrep`.

## How it works internally

`pgrep` (part of the `procps` suite) operates directly in user-space by reading the Linux virtual filesystem at `/proc/`.

When executed, `pgrep` iterates sequentially through every numeric directory mapped in `/proc/` (e.g., `/proc/1234/`). It opens and reads the `status` and `stat` virtual files to extract the binary command name (truncated to 15 characters) and evaluates the User ID metadata.

If the `-f` (full) flag is invoked, `pgrep` alters its logic. It opens the `/proc/[PID]/cmdline` file, which contains the complete, un-truncated string of execution arguments separated by null bytes (`\0`). `pgrep` translates these null bytes into spaces, compiles the user-provided regex pattern utilizing the standard C regex library, and executes the match against the full string.

Because `pgrep` maintains internal awareness of its own execution PID during this process, it inherently excludes itself from the match results, solving the classic `ps | grep` recursion flaw structurally.

## Performance Notes

- Executing a standard `pgrep` operates incredibly fast, evaluating the `/proc` tree in low single-digit milliseconds.
- Invoking the `-f` (full command line) flag forces `pgrep` to execute significantly more disk I/O, as it must open, read, and serialize the `cmdline` file for every single running process on the system, though performance impacts are negligible on modern SSDs.

## Security Notes

- **Information Leakage Context:** Standard users can execute `pgrep` to search for processes owned by other users or the `root` daemon. Because `-f` exposes the full execution arguments (which may inadvertently contain plaintext database passwords or API keys passed via CLI), `pgrep` can be utilized as a reconnaissance tool for unprivileged lateral movement.
- **Race Conditions (PID Recycling):** When automating scripts, the PID returned by `pgrep` is technically stale the microsecond the command completes. If a process terminates and the kernel aggressively recycles that specific PID to a newly launched root process, a subsequent `kill` command in your script might terminate the wrong application.

## Common Mistakes

- **The 15-character truncation trap:** Running `pgrep very_long_application_name` and getting no results. **Why it's wrong:** Without the `-f` flag, `pgrep` strictly checks the `comm` kernel file, which hard-truncates binary names at 15 bytes (e.g., `very_long_appli`). The regex fails to match. You must append `-f` to match against the full `cmdline` string.
- **Failing to anchor regular expressions:** Running `pgrep java` intending to match your app, but grabbing `java-worker`, `javascript-ide`, and `my-java-app`. **Why it's wrong:** `pgrep` uses partial regex matching by default. To enforce an absolute match without regex bleeding, strictly utilize the `-x` (exact) flag.
- **Confusing EUID and RUID:** Expecting `-u` to match a process originally spawned by `root` but demoted to `nginx`. **Why it's wrong:** `-u` matches Effective User ID (what the process is currently running as). `-U` matches Real User ID (who originally launched it). Understanding the distinction is critical for SetUID binaries.

## Best Practices

- When executing `pgrep` manually in a terminal to hunt for application PIDs, universally pair it with the `-a` (list-full) flag. The visual confirmation of the full command-line execution string ensures you do not blindly manipulate the wrong process.
- In highly constrained bash scripts determining boolean execution states, favor `pgrep -c <name> > /dev/null`. This suppresses all raw output and cleanly utilizes the exit code (`0` on match, `1` on no match) for elegant `if` statements.

## Interview Questions

- _Query:_ A developer writes a bash script containing `PIDS=$(ps aux | grep node | awk '{print $2}')`. What is the notorious bug inherent in this legacy pipeline pattern, and how does substituting `pgrep node` natively resolve it?
  - _A:_ The legacy pattern is vulnerable to the "grep matches itself" bug. The `grep node` process spawns in the process table simultaneously with the `ps` command. The pipeline intercepts its own execution string, returning an invalid PID that breaks downstream scripts. `pgrep node` natively resolves this because the binary possesses internal state awareness; it calculates its own PID during initialization and explicitly filters itself out of the internal `/proc` traversal loop, returning only pure target PIDs.
- _Query:_ You run `pgrep python` and receive 10 PIDs. However, you are only interested in finding the exact PID of the python process that was started most recently by the operating system. What single flag accomplishes this?
  - _A:_ The `-n` (newest) flag. It instructs `pgrep` to evaluate the creation timestamps/PID sequencing and returns strictly the single process matching the pattern that has been alive for the shortest duration.
- _Query:_ What is the structural difference between `pgrep my_app` and `pgrep -f my_app` regarding how they read kernel data to execute the regex match?
  - _A:_ Without `-f`, `pgrep` reads the `/proc/[PID]/stat` or `comm` files, which only contain the name of the executable binary hard-truncated by the kernel to 15 characters. When `-f` (full) is applied, `pgrep` opens the `/proc/[PID]/cmdline` file instead. This file contains the complete, un-truncated execution string, including the binary path and all command-line arguments passed during execution, allowing for vastly deeper regex targeting.

## Practice Problems

- _Problem:_ Find and display the PIDs of all processes where the full command-line execution string contains the word `redis`, and ensure the output prints the full execution string next to the PID for visual verification.
  - _Hint:_ Combine the full command-line match flag with the full listing output flag.
  - _Solution:_ `pgrep -f -a redis` (This interrogates the `cmdline` files and displays a comprehensive, `ps`-like audit of the matched targets).
- _Problem:_ Write a command that mathematically counts exactly how many processes are currently running that are owned by the effective user `www-data`, outputting only the final integer.
  - _Hint:_ Chain the user isolation flag with the numeric counting flag, targeting all binaries.
  - _Solution:_ `pgrep -u www-data -c .` (The `.` acts as a wildcard regex matching any binary, while `-c` squashes the output into a single cumulative integer).

## References

- [Man Page for pgrep (Linux)](https://man7.org/linux/man-pages/man1/pgrep.1.html)
- [Procps Utilities Repository](https://gitlab.com/procps-ng/procps)
  === END FILE ===
