---
slug: sudo
name: sudo
aliases: []
category: linux
tags:
  - sudo
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
  - run command as root
  - execute as admin
  - switch user context
  - bypass permission denied
  - elevate privileges
relatedCommands: [setuid, visudo]
alternatives: [setuid, visudo]
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`sudo` (superuser do) is a command-line utility that allows authorized users to execute commands as the superuser or another distinct user account. It evaluates a centralized security policy to validate permissions before execution.

## Why does it exist?

Historically, Unix administrators had to share the root password or use `su` to switch user contexts completely. `sudo` was created to enforce the principle of least privilege. It delegates granular administrative capabilities to specific users, utilizing their personal credentials rather than a shared password, while enforcing strict logging and audit trails.

## Syntax

```bash
sudo [OPTIONS] COMMAND [ARGUMENTS...]
sudo -i | -s
```

## Flags

| Flag                       | Description                                                                                                                  | Example                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `-u`, `--user=`            | Executes the command as the specified target user instead of `root`.                                                         | `sudo -u postgres psql`           |
| `-i`, `--login`            | Simulates a full login shell, loading the target user's environment profile and setting the working directory to their home. | `sudo -i`                         |
| `-s`, `--shell`            | Runs the shell specified by the `$SHELL` environment variable, retaining much of the invoking user's environment.            | `sudo -s`                         |
| `-l`, `--list`             | Lists the allowed (and forbidden) commands for the invoking user as defined in the security policy.                          | `sudo -l`                         |
| `-E`, `--preserve-env`     | Preserves the invoking user's existing environment variables instead of sanitizing/resetting them.                           | `sudo -E npm install -g`          |
| `-H`, `--set-home`         | Sets the `$HOME` environment variable to the home directory of the target user (usually `/root`).                            | `sudo -H pip install`             |
| `-k`, `--reset-timestamp`  | Invalidates the user's cached authentication ticket, forcing a password prompt on the next `sudo` execution.                 | `sudo -k`                         |
| `-K`, `--remove-timestamp` | Completely removes the timestamp file, operating similarly to `-k` but leaving no trace on disk.                             | `sudo -K`                         |
| `-v`, `--validate`         | Prompts for a password and updates the cached timestamp without actually executing any command.                              | `sudo -v`                         |
| `-n`, `--non-interactive`  | Fails immediately if a password prompt is required, useful for automated background scripts.                                 | `sudo -n apt update`              |
| `-S`, `--stdin`            | Reads the password from standard input instead of the terminal device, often used in automated pipelines.                    | `echo "pass" \| sudo -S ls`       |
| `-b`, `--background`       | Executes the requested command in the background, immediately returning control to the terminal.                             | `sudo -b tcpdump -w capture.pcap` |

## Examples

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

> This elevates privileges to root in order to update the system's package manager cache and install upgrades. The second `sudo` typically succeeds without a prompt because the authentication ticket was cached by the first command.

```bash
sudo -u www-data bash
```

> This spawns a new bash shell executing as the `www-data` service account. It allows an administrator to test file permissions and execute scripts exactly as the web server daemon would experience them.

```bash
sudo -l -U alice
```

> This queries the `sudoers` policy and lists exactly which commands the user `alice` is permitted to execute, and on which hosts. This requires the invoking user to already have sufficient `sudo` auditing privileges.

```bash
sudo -E docker-compose up -d
```

> This executes Docker Compose as root but intentionally bypasses the default environment sanitization. It ensures that locally exported variables (like `$AWS_ACCESS_KEY_ID`) are passed securely into the root-executed process.

```bash
echo "127.0.0.1 staging.local" | sudo tee -a /etc/hosts > /dev/null
```

> This uses the `tee` utility elevated as root to append a string to a protected system file. It bypasses the limitation of standard shell redirection, cleanly dropping the standard output to `/dev/null`.

## Real-World Scenarios

**Editing protected system configuration files safely.**

```bash
sudoedit /etc/ssh/sshd_config
```

> Instead of running `sudo vim` (which executes the editor as root and risks shell escapes), administrators use `sudoedit` (or `sudo -e`). This copies the file to a temporary location, opens it as the unprivileged user, and overwrites the original file as root only upon successful save.

**Restarting critical system services.**

```bash
sudo systemctl restart nginx.service
```

> When deploying new configuration files for a web server, administrators must bind to privileged ports (like 80 or 443). Restarting the system daemon requires `sudo` because standard users cannot manipulate `systemd` targets.

**Inspecting active network connections for malware.**

```bash
sudo netstat -tulpn
```

> While unprivileged users can view their own network sockets, they cannot see the Process IDs (PIDs) or program names of sockets opened by other users or the root system. Running this elevated reveals the exact binary bound to every open port.

**Identifying large files across the entire disk.**

```bash
sudo du -ahx / | sort -rh | head -20
```

> Searching the entire root filesystem (`/`) as a standard user triggers thousands of "Permission denied" errors for restricted directories like `/root/` or `/var/log/`. `sudo` ensures the disk usage calculation has unrestricted read access to accurately map storage consumption.

## When should it NOT be used?

- **Executing untrusted downloaded scripts:** Running `curl -sL https://example.com/install.sh | sudo bash` grants an unaudited internet payload total control over the kernel and filesystem. Download, inspect, and only then execute.
- **Redirecting standard output directly in the shell:** Writing `sudo echo "text" > /etc/fstab` fails with "Permission denied". The shell performs the `>` redirection as the unprivileged user before `sudo` is even evaluated. Use `echo "text" | sudo tee /etc/fstab`.
- **Running graphical user interface (GUI) applications:** Executing `sudo gedit /etc/fstab` can corrupt X11 authorization files or change ownership of `.config` files in your home directory to root, breaking future logins. Use `pkexec` or `admin://` URIs in GVFS instead.
- **Long-running interactive root sessions:** Relying on `sudo -i` to act as root for hours defeats the purpose of the audit trail, as all subsequent commands are logged vaguely as root actions rather than specific delegated commands.

## Alternatives

- **`su`**: The original "substitute user" command. **Tradeoff:** It requires the invoking user to know the target user's actual password (often the root password), eliminating non-repudiation and individual accountability in shared administrative environments.
- **`doas`**: Originally from OpenBSD, a much smaller and simpler privilege escalation tool. **Tradeoff:** It boasts a significantly smaller attack surface and simpler configuration syntax, but lacks the LDAP integration, fine-grained command restrictions, and rich plugin ecosystem of `sudo`.
- **`pkexec`**: The command-line front-end for PolicyKit. **Tradeoff:** It integrates deeply with graphical desktop environments and D-Bus, allowing complex policy evaluations (like "allow if the user is physically at the active console"), but is more complex to configure for simple CLI delegation.

## How it works internally

When a user executes `sudo`, the operating system loads the binary, which must possess the `setuid` bit (`chmod 4755`) and be owned by root; otherwise, privilege escalation is impossible. `sudo` immediately checks `/etc/sudoers` (and `/etc/sudoers.d/`) to evaluate the security policy. This file uses a specialized grammar strictly validated by the `visudo` utility.

If the policy dictates the user is authorized, `sudo` interfaces with Pluggable Authentication Modules (PAM) to verify the invoking user's password. Upon successful authentication, it creates or updates a timestamped ticket in a secure directory (typically `/var/run/sudo/ts/`). This ticket grants a grace period (defaulting to 15 minutes), bound to the user's TTY or session, during which subsequent `sudo` commands bypass the PAM password prompt.

Before execution, `sudo` sanitizes the process space to prevent injection attacks. It applies the `env_reset` policy, aggressively stripping dangerous environment variables like `LD_PRELOAD`, `IFS`, and `PERLLIB` to ensure the root process cannot be hijacked by malicious user-space library paths. Finally, `sudo` invokes the `setuid` and `setgid` system calls to assume the target user's UID/GID, and uses `execve` to run the requested binary, forwarding signals and exit codes between the terminal and the child process.

## Performance Notes

- Interactive execution incurs negligible overhead, but calling `sudo` repeatedly in tight programmatic loops (e.g., inside a bash `while` loop processing thousands of files) will cause severe CPU spikes due to repetitive PAM evaluations and syslog socket writes.
- The timestamp caching mechanism intentionally mitigates the expensive bcrypt/sha-512 hashing overhead of password evaluation for short-term, sequential administrative tasks.
- Using the `NOPASSWD` directive in the sudoers file bypasses PAM entirely, making script execution nearly instantaneous, but sacrificing interactive verification.

## Security Notes

- **Shell Escapes:** Granting `sudo` access to binaries that contain internal shell escapes (like `vi`, `less`, `find`, or `awk`) effectively grants unrestricted root access, bypassing all intended command restrictions.
- **Sudoers Misconfiguration:** Editing `/etc/sudoers` with a standard text editor (like `nano`) can leave the file with syntax errors. If the file is unparseable, `sudo` breaks entirely, potentially permanently locking all administrators out of root access. Always use `visudo`.
- **Environment Hijacking:** By default, `sudo` strips the environment for a reason. Using `sudo -E` or configuring `SETENV` indiscriminately allows unprivileged users to inject malicious shared libraries into root processes via variables like `LD_PRELOAD`.

## Common Mistakes

- **Failing to find custom binaries:** Executing `sudo my_custom_script` results in "command not found", even though it works without `sudo`. **Why it's wrong:** `sudo` forces a secure, hardcoded `$PATH` (defined by `secure_path` in sudoers) to prevent `$PATH` poisoning attacks. You must use the absolute path: `sudo /opt/bin/my_custom_script`.
- **Aliasing commands with sudo:** Adding `alias rm='rm -i'` to `.bashrc`, then running `sudo rm file.txt` and realizing it didn't prompt for confirmation. **Why it's wrong:** Bash does not expand aliases after a command name. You must add a trailing space to your sudo alias (`alias sudo='sudo '`) to force alias expansion on the subsequent word.
- **Creating files with restricted permissions:** Running `sudo npm install` inside a user-owned project directory. **Why it's wrong:** This generates `node_modules` folders owned by `root`. Subsequent unprivileged attempts to build or modify the project will fail with permission errors.

## Best Practices

- Never modify `/etc/sudoers` directly. Instead, create separate, dedicated files in `/etc/sudoers.d/` (e.g., `/etc/sudoers.d/dba_team`). This keeps configuration modular, prevents package updates from overwriting local policies, and makes auditing easier.
- When granting `NOPASSWD` capabilities to scripts or service accounts, always specify the absolute path to the executable (e.g., `/usr/bin/systemctl restart myapp`) to prevent PATH manipulation attacks.
- Regularly audit the `auth.log` or `secure` log files. `sudo` defaults to logging all executed commands and failed attempts via `syslog`, which is critical for incident response and forensic analysis.

## Interview Questions

**Q:** Why does `sudo cd /var/log` fail to change your current directory?
**A:** `cd` is a shell builtin, not an external binary. `sudo` creates a new child process, executes the command within that context, and immediately terminates. The working directory of the parent shell remains completely unaffected.

**Q:** Explain the functional difference between `sudo -s` and `sudo -i`.
**A:** `sudo -s` reads the `$SHELL` variable and spawns a non-login shell, retaining the current working directory and much of the original user's environment variables. `sudo -i` spawns a login shell, aggressively resetting the environment, sourcing root's profile scripts (`.bash_profile`, `.profile`), and changing the directory to `/root`.

**Q:** What is the `secure_path` directive in `/etc/sudoers`, and what attack vector does it mitigate?
**A:** `secure_path` forces `sudo` to use a specific, trusted `$PATH` environment variable when executing commands, completely ignoring the invoking user's local `$PATH`. This prevents an attacker from creating a malicious binary named `ls` in their home directory and tricking root into executing it.

## Practice Problems

**Problem:** You recently entered your password for a `sudo` command, but you want to ensure the next `sudo` command you run forces you to authenticate again immediately.
**Hint:** Look for the flag that manipulates the cached timestamp.
**Solution:** `sudo -k` (This resets the cached ticket, ensuring the next command requires a password prompt).

**Problem:** You need to execute `tcpdump` to capture packets on `eth0`, but you want it to run detached so you can continue using your current terminal session immediately.
**Hint:** Standard shell backgrounding (`&`) handles standard output poorly with `sudo` prompts. Use the dedicated background flag.
**Solution:** `sudo -b tcpdump -i eth0 -w /tmp/capture.pcap` (The `-b` flag prompts for the password in the foreground, but pushes the execution of the actual binary entirely to the background).

## References

- [sudo(8) - Linux manual page](https://man7.org/linux/man-pages/man8/sudo.8.html)
- [sudoers(5) - Linux manual page](https://man7.org/linux/man-pages/man5/sudoers.5.html)
- [visudo(8) - Linux manual page](https://man7.org/linux/man-pages/man8/visudo.8.html)
  === END FILE ===
