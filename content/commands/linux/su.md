---
slug: su
name: su
aliases: []
category: linux
tags:
  - su
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - switch to root user
  - login as another user
  - change active user
  - run command as different user
  - bypass nologin shell
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---
## What is it?

`su` (substitute user or switch user) is a command-line utility that allows a user to temporarily assume the identity, privileges, and group memberships of another system user. It accomplishes this by authenticating the target user's password and spawning a new shell process under their User ID (UID).

## Why does it exist?

Before the advent and widespread adoption of `sudo` for granular, policy-based privilege delegation, Unix systems required a mechanism for administrators to perform privileged tasks without physically logging out of their unprivileged TTY session and logging back in as `root`. `su` was built to fill this gap, enabling an in-session context switch by securely transitioning the UID of the running process tree after a successful password challenge.

## Syntax

```bash
su [options] [-] [user [args...]]
```

## Flags

| Flag                                 | Description                                                                                                        | Example                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `-`, `-l`, `--login`                 | Starts the shell as a login shell, completely resetting the environment to match the target user's profile.        | `su - postgres`                       |
| `-c`, `--command=`                   | Passes a single command to the invoked shell using its `-c` option, then immediately returns to the original user. | `su -c "ls /root" root`               |
| `-s`, `--shell=`                     | Specifies an alternate shell to execute, overriding the default shell listed in `/etc/passwd`.                     | `su -s /bin/bash nginx`               |
| `-m`, `-p`, `--preserve-environment` | Preserves the entire current environment (except `$PATH` in some security configurations) when switching users.    | `su -m devuser`                       |
| `-g`, `--group=`                     | Specifies the primary group to switch to, overriding the user's default primary group (requires root privileges).  | `su -g wheel alice`                   |
| `-G`, `--supp-group=`                | Specifies supplemental groups to append to the target user's context (requires root privileges).                   | `su -G docker bob`                    |
| `-w`, `--whitelist-environment=`     | Specifies a comma-separated list of environment variables that should not be reset during a login shell switch.    | `su -w DISPLAY,XAUTHORITY - alice`    |
| `--session-command=`                 | Similar to `-c`, but does not spawn an intermediate shell to evaluate the command string, executing it directly.   | `su --session-command="top" postgres` |
| `-P`, `--pty`                        | Creates a new pseudo-terminal (PTY) for the session, isolating it for security (available in modern `util-linux`). | `su --pty - root`                     |
| `-h`, `--help`                       | Displays the help text, detailing available arguments compiled into the local binary.                              | `su --help`                           |

## Examples

```bash
su -
```

> Without a specified user, `su` assumes `root`. The appended hyphen `-` ensures it spawns a full login shell, sourcing `/root/.bash_profile` and resetting variables like `$PATH` and `$HOME` to the root user's defaults.

```bash
su -c "pg_dump mydatabase > backup.sql" postgres
```

> This temporarily switches to the `postgres` user, passes the database backup command to a child shell, executes it, and instantly drops back to the invoking user once the backup completes.

```bash
su -s /bin/bash www-data
```

> Service accounts like `www-data` typically have their shell set to `/usr/sbin/nologin` to prevent interactive access. This command overrides the `/etc/passwd` entry, forcing the execution of `/bin/bash` to allow administrative debugging of web permissions.

```bash
su -w DISPLAY,XAUTHORITY - alice
```

> This switches to the user `alice` with a full login environment, but explicitly whitelists the `DISPLAY` and `XAUTHORITY` variables so that GUI applications launched by Alice will successfully render on the original user's X11 server.

```bash
su -m oracle
```

> This switches to the `oracle` user while preserving the invoking user's existing environment variables. This is useful when you have already manually exported complex configuration variables (like `LD_LIBRARY_PATH`) that the target user process requires.

## Real-World Scenarios

**Managing Relational Databases**

```bash
su - postgres
```

> Database systems typically restrict CLI access to their corresponding OS user via peer authentication. Administrators use this command to assume the database service account before running tools like `psql` or `createuser`, completely bypassing password prompts for the database itself.

**Debugging Web Server File Permissions**

```bash
su -s /bin/bash nginx -c "cat /var/www/html/config.php"
```

> When a web application returns a 403 Forbidden error, administrators use this to simulate the exact read access of the web daemon. If this command returns a "Permission denied" error, it confirms the file ownership or ACLs are misconfigured.

**Legacy System Administration**

```bash
su -
```

> On older Unix systems (like Solaris or AIX) or minimalist Linux distributions where `sudo` is not installed or configured, administrators rely exclusively on this command to transition into the root environment for system maintenance.

**Testing User Profiles**

```bash
su - newemployee
```

> After creating a new user account, an administrator switches into it using a login shell to verify that custom `/etc/skel` files, `.bashrc` aliases, and default group permissions were applied correctly before handing off the credentials.

## When should it NOT be used?

- **Routine administrative tasks:** Using `su` requires sharing the root password among all administrators. **Reason:** This eliminates individual accountability in audit logs. **Use instead:** `sudo`, which logs specific commands against the invoking user's personal identity.
- **Automated scripting:** `su` is inherently interactive and relies on TTY input for password handling. **Reason:** Bypassing this programmatically requires brittle tools like `expect`. **Use instead:** `sudo -n` (non-interactive) or `runuser` (if already executing as root).
- **Partial root execution without a hyphen:** Running `su root` (without `-`). **Reason:** This retains the unprivileged user's `$PATH` and environment variables. If the unprivileged user has a malicious binary named `ls` in their local directory, root might inadvertently execute it. **Use instead:** Always use `su -`.

## Alternatives

- **`sudo`:** Granular privilege escalation. **Tradeoff:** `sudo` requires complex policy configuration (`/etc/sudoers`) and uses the invoking user's password, whereas `su` works universally out-of-the-box but requires knowing the target user's password.
- **`runuser`:** A variant of `su` specifically for the root user. **Tradeoff:** It completely bypasses PAM password prompts and authentication, making it ideal for init scripts, but it can only be invoked by a user who is already root.
- **`doas`:** The default privilege escalation tool from OpenBSD. **Tradeoff:** It possesses a drastically simpler configuration syntax and smaller codebase than `sudo`, but lacks the rich ecosystem, LDAP integration, and granular environment filtering of modern enterprise tools.

## How it works internally

When executed, `su` reads the target user's metadata from `/etc/passwd`. It then interfaces with Pluggable Authentication Modules (PAM)—specifically looking at `/etc/pam.d/su` and `/etc/pam.d/su-l`—to authenticate the invoking user. If the invoking user is `root` (UID 0), the `pam_rootok.so` module typically allows the transition without prompting for a password.

Once authentication succeeds, `su` orchestrates a critical sequence of system calls. It calls `initgroups()` to establish the target user's supplemental group list, `setgid()` to assume the primary group, and finally `setuid()` to assume the target user's ID.

If invoked with `-` (or `--login`), it wipes the current environment block (calling `clearenv()`), sets the foundational variables (`$HOME`, `$USER`, `$LOGNAME`, `$SHELL`, `$PATH`), and forks a child process. The child process uses `execve()` to replace itself with the target user's shell, passing `-` as the first character of `argv[0]`, which signals the shell (e.g., `-bash`) to behave as a login shell and source configuration files like `/etc/profile`. The parent `su` process uses `waitpid()` to sleep until the child shell exits, passing signals (like `SIGINT`) down to the child. Exit codes mirror the child process, or return `125` if `su` itself failed, `126` if the shell was found but not executable, and `127` if the shell was not found.

## Performance Notes

- The primary latency in `su` execution is derived from the PAM stack. Modules like `pam_unix.so` deliberately introduce hashing delays (e.g., bcrypt rounds) to thwart brute-force attacks.
- Using `su -` incurs the initialization cost of the target shell. For users with heavily customized `.bashrc` or `.zshrc` files (e.g., loading Node Version Manager or complex prompt integrations), the context switch can take hundreds of milliseconds.
- In highly loaded systems, `su` consumes minimal memory (a few kilobytes) as it only serves to wait on the child process, making it perfectly safe for deep concurrent execution.

## Security Notes

- **Environment Poisoning (The `$PATH` Exploit):** If an administrator runs `su` instead of `su -`, the root shell inherits the unprivileged user's `$PATH`. If that `$PATH` includes `.` (the current directory) or a user-writable directory, the administrator might type a common command (like `sl` instead of `ls`) and execute a malicious payload crafted by the unprivileged user, running it as root.
- **Shared Passwords:** Relying on `su` for root access mandates that multiple humans know the root password. If an administrator leaves the organization, the root password must be rotated across the entire fleet immediately, which is operationally fragile.
- **TTY Hijacking:** Because `su` executes the new shell on the original user's pseudo-terminal (PTY), sophisticated attacks (like `TIOCSTI` ioctl injection) could theoretically allow the original, unprivileged process to inject input keystrokes into the elevated root shell. Modern Linux mitigates this with kernel patches or by using `su --pty`.

## Common Mistakes

- **Forgetting the hyphen:** Running `su` instead of `su -`. **Why it's wrong:** This changes the UID to root but leaves your working directory, `$HOME`, and `$PATH` set to your unprivileged user. Scripts expecting root's path will fail, and configuration files may be accidentally written to your unprivileged home directory.
- **Quoting errors with `-c`:** Running `su -c echo "hello" > file.txt root`. **Why it's wrong:** The shell interprets this as running `su -c echo "hello"` and then performing the redirection `> file.txt` as the _current_ user, failing with permission denied. It must be wrapped entirely: `su -c "echo 'hello' > file.txt" root`.
- **Using `su` inside automated cron jobs:** Hardcoding passwords into `expect` scripts to automate `su`. **Why it's wrong:** Storing plaintext passwords on disk is a critical vulnerability. Cron jobs requiring different user contexts should simply be placed in that user's specific crontab or executed via root using `su -c` (which requires no password from root).

## Best Practices

- When executing single commands as another user in shell scripts, always use single quotes to wrap the `-c` payload if you need the target user's shell to evaluate internal variables (e.g., `su -c 'echo $USER' alice` prints "alice", whereas `su -c "echo $USER" alice` evaluates the variable prematurely and prints the invoking user).
- Disable direct root login over SSH (`PermitRootLogin no` in `sshd_config`) and enforce the use of unprivileged SSH keys, forcing administrators to intentionally escalate using `su -` or `sudo` once inside the machine.
- If you only need a temporary root shell, modern compliance standards strongly prefer `sudo -i` or `sudo su -` over the traditional `su -` command, as the former utilizes the invoking user's password and generates distinct audit logs.

## Interview Questions

**Q:** What is the technical difference between `su targetuser` and `su - targetuser`?
**A:** `su targetuser` changes the process UID but inherits the environment variables (like `$PATH` and `$HOME`) from the invoking user. `su - targetuser` initiates a login shell, clearing the environment completely and sourcing the target user's profile files (`.bash_profile`, `.profile`) as if they had just logged in natively.

**Q:** How do you execute a command as a service account (like `apache` or `nginx`) that has `/usr/sbin/nologin` set as its shell in `/etc/passwd`?
**A:** You must bypass the restriction in `/etc/passwd` by explicitly specifying a valid shell using the `-s` flag, such as `su -s /bin/bash apache`.

**Q:** If a user is already logged in as `root`, what happens when they run `su - alice`?
**A:** The command executes immediately without prompting for a password. PAM configurations generally utilize `pam_rootok.so`, which grants the UID 0 process instant authentication authorization to assume any other user context.

## Practice Problems

**Problem:** You are logged in as a standard user. Switch to the `postgres` user, ensuring that all of `postgres`'s default environment variables and paths are loaded.
**Hint:** You need the flag that simulates a full login.
**Solution:** `su - postgres`

**Problem:** Execute the command `tail -f /var/log/syslog` as the `root` user without spawning an interactive root shell, returning to your standard prompt immediately when you cancel the `tail` command.
**Hint:** Use the flag designed for passing a single command string.
**Solution:** `su -c "tail -f /var/log/syslog" root`

## References

- [su(1) - Linux manual page](https://man7.org/linux/man-pages/man1/su.1.html)
- [pam(8) - Pluggable Authentication Modules](https://man7.org/linux/man-pages/man8/pam.8.html)
- [runuser(1) - Linux manual page](https://man7.org/linux/man-pages/man1/runuser.1.html)
  === END FILE ===
