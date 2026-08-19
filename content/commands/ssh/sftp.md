---
slug: sftp
name: sftp
aliases: ['secure file transfer protocol']
category: ssh
tags: [ssh, file-transfer, networking, ftp, interactive]
difficulty: intermediate
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'connect to sftp server'
  - 'download files interactively ssh'
  - 'secure ftp client'
  - 'upload directory sftp'
  - 'batch mode file transfer'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`sftp` (Secure File Transfer Protocol) is an interactive, command-line file transfer program that operates securely over an encrypted SSH transport. It provides a stateful, FTP-like shell environment where users can navigate remote directory structures, list files, manipulate permissions, and execute reliable file uploads and downloads, completely replacing the obsolete, unencrypted `ftp` protocol.

## Why does it exist?

Traditional `ftp` transmits usernames, passwords, and file payloads in plaintext across the internet, making it entirely unacceptable for modern security architectures. While `scp` provided a secure alternative, it was strictly non-interactive; if a user didn't know the exact absolute path of the file they needed on the remote server, `scp` was useless. `sftp` exists to marry the interactive, session-based exploration capabilities of FTP with the cryptographic security of SSH. Furthermore, the underlying SFTP protocol dictates strict, platform-independent packet structures for file attributes (unlike SCP's ad-hoc streaming), resulting in a vastly more reliable standard for enterprise B2B data exchanges.

## Syntax

```bash
sftp [options] [user@]host
```

_(Once connected, `sftp` drops into an interactive `sftp>` prompt)._

## Flags

**CLI Connection Flags**

| Flag             | Description                                                                                                         | Example                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `-P <port>`      | Specifies the port to connect to on the remote SSH server.                                                          | `sftp -P 2222 user@host`               |
| `-i <identity>`  | Uses a specific private key file for authentication.                                                                | `sftp -i ~/.ssh/id_rsa host`           |
| `-b <batchfile>` | Reads and executes a series of SFTP commands from a local text file, exiting when finished. Crucial for automation. | `sftp -b commands.txt user@host`       |
| `-r`             | Recursively copies entire directories when used during connection for automated fetching/pushing.                   | `sftp -r user@host:/var/log/`          |
| `-a`             | Attempts to resume interrupted file transfers rather than overwriting the destination file from 0%.                 | `sftp -a user@host`                    |
| `-q`             | Quiet mode. Suppresses the progress meter and informational messages.                                               | `sftp -q -b script.txt host`           |
| `-J <jump_host>` | Routes the SFTP connection through an intermediate bastion server.                                                  | `sftp -J jumpuser@bastion user@target` |

**Interactive Prompt Commands (`sftp>`)**

| Command           | Description                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `ls` / `lls`      | Lists the directory contents on the remote server (`ls`) or the local machine (`lls`).          |
| `cd` / `lcd`      | Changes the current working directory on the remote server (`cd`) or the local machine (`lcd`). |
| `get [-R] <file>` | Downloads a file or directory (`-R`) from the remote server to the local machine.               |
| `put [-R] <file>` | Uploads a file or directory (`-R`) from the local machine to the remote server.                 |
| `mkdir` / `rm`    | Creates a directory or deletes a file on the remote server.                                     |
| `chmod` / `chown` | Modifies file permissions or ownership on the remote server.                                    |
| `exit` / `quit`   | Closes the connection and exits the `sftp` program.                                             |

## Examples

```bash
sftp admin@fileserver.corp.com
```

> The standard interactive invocation. Initiates an SSH connection, authenticates the user, and presents the `sftp>` prompt. The user can now use `ls`, `cd`, and `get` to explore the filesystem and retrieve files.

```bash
sftp -P 8022 -i ~/.ssh/deploy_key webmaster@10.0.0.50
```

> Connecting with specific infrastructure requirements. Overrides the default port 22 and explicitly provides an SSH key, bypassing password prompts.

```bash
# Inside commands.txt:
# cd /var/www/uploads
# put report.csv
# bye

sftp -b commands.txt data_user@192.168.1.100
```

> The batch automation pattern. `sftp` connects to the server, reads the `commands.txt` file, executes the directory change and file upload consecutively without human intervention, and terminates the connection.

```bash
sftp> get -R /var/log/nginx/ ./local_logs/
```

> Interactive directory retrieval. While inside the `sftp>` prompt, the user executes a recursive `get` command. It downloads the entire `nginx` remote folder structure directly into the `local_logs` directory on their laptop.

```bash
sftp> lcd /tmp
sftp> put update.tar.gz
```

> Local context manipulation. The user connects, but realizes they are in the wrong local directory. They use `lcd` (Local Change Directory) to move their local shell context to `/tmp`, and then `put` the file located there up to the server.

## Real-World Scenarios

**Secure B2B Data Ingestion (Chroot Jails)**

```bash
sftp vendor_a@sftp.mycompany.com
# sftp> cd /etc
# Couldn't stat remote file: No such file or directory
```

> Enterprises frequently use SFTP to receive daily CSV drops from external vendors. The SSH server is configured with `ChrootDirectory %h` and `ForceCommand internal-sftp`. When the vendor logs in via `sftp`, they are cryptographically locked inside their home directory. They cannot use standard `ssh` to get a bash shell, and they cannot navigate upward (`cd ..`) to view or compromise the rest of the Linux filesystem.

**Resuming Broken Transfers**

```bash
sftp -a db_admin@storage.cloud
sftp> put massive_database.bak
# Upload resumes from where the connection previously dropped
```

> A user is uploading a 50GB file over an unstable connection. The connection drops at 40GB. By reconnecting with the `-a` (append/resume) flag and issuing the exact same `put` command, the SFTP client negotiates with the server to append the remaining 10GB to the existing payload, saving hours of bandwidth.

## When should it NOT be used?

- **System Administration:** **Do not use `sftp` to administer a server.** `sftp` is strictly a file-transfer protocol. You cannot execute shell scripts, restart systemd services, or read `top` outputs through an SFTP connection. You must use `ssh` for shell execution.
- **Large-scale synchronization:** **Do not use `sftp` to mirror directories.** While `sftp` supports `get -R`, it transfers every file entirely. It cannot calculate deltas. If you have 10,000 files and 1 changes, `rsync` takes 1 second; `sftp` takes 10 minutes to re-download everything.
- **High-Bandwidth Trusted Transfers:** Because SFTP traffic is wrapped in SSH encryption, transferring data at 10+ Gbps is often bottlenecked by CPU cryptography limits. On secure, backend air-gapped networks, pure TCP streams (like `netcat`) are significantly faster.

## Alternatives

- **`rsync`:** **Best for automation and synchronization.** Significantly more robust for scripts, handles symlinks better, and uses delta-compression.
- **GUI Clients (FileZilla, Cyberduck, WinSCP):** **Best for visual users.** These graphical applications use the exact same underlying SFTP protocol but abstract the CLI into a drag-and-drop, dual-pane window interface.
- **`lftp`:** **Best for advanced CLI features.** A significantly more powerful command-line client that supports SFTP, HTTP, and FTP, offering advanced features like parallel multi-segmented downloading and job queueing.

## How it works internally

`sftp` operates over the SSH-2 protocol. When you run `sftp user@host`, the client binary (`/usr/bin/sftp`) physically spawns a child `ssh` process under the hood (`ssh -s host sftp`).

This `ssh` process handles the TCP connection, the TLS/crypto handshake, and the user authentication phase. Once authenticated, the SSH client requests the execution of a specific "subsystem" named `sftp`.

On the remote server, the `sshd` daemon detects this subsystem request. Instead of spawning a `/bin/bash` shell, it spawns the `/usr/lib/openssh/sftp-server` binary (or utilizes its own internal SFTP handler).

The local `sftp` CLI and the remote `sftp-server` begin communicating over standard input/output passing through the encrypted SSH tunnel. They speak the standardized SFTP protocol (defined in IETF drafts). When you type `ls`, the client sends an `SSH_FXP_READDIR` packet. The server parses the directory, constructs an `SSH_FXP_NAME` payload containing the file attributes, and sends it back. This packetized protocol guarantees cross-platform consistency, unlike the older SCP protocol which relied on brittle shell execution parsing.

## Performance Notes

- **Pipelining / Window Size:** By default, SFTP sends a chunk of data (typically 32KB) and waits for an acknowledgment from the server before sending the next. Over high-latency connections (e.g., across oceans), this latency drastically bottlenecks transfer speeds. Advanced clients (like `lftp` or patched OpenSSH) increase the number of outstanding requests (pipelining) to saturate the bandwidth pipeline.

## Security Notes

- **Subsystem Isolation:** A major security advantage of SFTP is that administrators can configure the SSH server (`sshd_config`) to deny shell access (`ForceCommand internal-sftp`) to specific users. This allows companies to securely grant third parties the ability to upload files without risking them executing reverse shells or exploring the Linux filesystem.
- **Key Management:** When using batch mode (`-b`), you cannot enter a password interactively. The connection _must_ be secured via public key authentication. Ensure the private keys used for automation scripts are restricted using `command="internal-sftp"` inside the `~/.ssh/authorized_keys` file to prevent the key from being repurposed for malicious shell access.

## Common Mistakes

- **Confusing `cd` and `lcd`**
  - _Mistake:_ Using `cd /tmp` to change your local directory to `/tmp` before downloading a file, and wondering why the file still saved to your home directory.
  - _Why:_ `sftp` maintains two separate environment states. Commands without an `l` (like `cd`, `ls`, `pwd`) operate strictly on the _remote_ server. Commands prefixed with an `l` (like `lcd`, `lls`, `lpwd`) operate on your _local_ machine.
- **Failing batch scripts silently**
  - _Mistake:_ Running `sftp -b script.txt host` where step 2 (a `cd` command) fails, but the script blindly executes step 3 (a `put` command) anyway.
  - _Why:_ By default, if a command in a batch file fails, `sftp` aborts the entire script and exits. If you explicitly prefix a command in the batch file with a `-` (e.g., `-rm old_file.txt`), it instructs `sftp` to ignore errors for that specific line and continue, similar to `make`. Understanding this error handling is critical for resilient automation.

## Best Practices

- **Leverage Batch Mode for CI/CD:** Never use interactive tools like `expect` or `sshpass` to automate SFTP. Always configure SSH keys and use `sftp -b commands.txt`. It is deterministic, handles errors gracefully, and prevents credential leakage in process lists.
- **Use the `-J` flag for Bastions:** Modern OpenSSH versions of `sftp` natively support the `-J` Jump host flag. Instead of setting up complex local port forwards to transfer files to an isolated database server, simply use `sftp -J jump_user@bastion db_user@internal_db`.

## Interview Questions

**Q: You have an automation script that uploads logs to a vendor using `sftp -b upload.txt vendor@external.com`. The vendor enforces strict security and disables standard shell access. The script fails to connect. However, `sftp` interactive mode works perfectly. What is preventing the automated script from running?**
**A:** Batch mode (`-b`) completely disables interactive prompts. The vendor likely requires a password, or the SSH host key of `external.com` is not in the script runner's `~/.ssh/known_hosts` file, prompting an interactive `(yes/no)` verification check. Because batch mode cannot answer these prompts, the connection violently aborts. You must use SSH key authentication and pre-populate the `known_hosts` file.

**Q: In an SSH server configuration (`sshd_config`), an administrator sets `ForceCommand internal-sftp` for a specific group of users. What security benefit does `internal-sftp` provide over the standard `sftp-server` binary?**
**A:** The standard `/usr/lib/openssh/sftp-server` is an external binary. To execute it, the user's environment must possess a working Linux filesystem structure (including `/bin`, `/lib`, and shared `.so` libraries). `internal-sftp` is built directly into the `sshd` memory space. It requires no external binaries or libraries. This allows administrators to "Chroot" (jail) the user into a completely empty directory for maximum security, as the SFTP protocol handler is executed internally by the SSH daemon itself.

## Practice Problems

**Problem:** You need to automate the upload of a file named `backup.zip` to a remote server. Write a one-line bash command that executes `sftp`, uses an identity key located at `/opt/keys/id_rsa`, and utilizes a batch file located at `/opt/scripts/sftp_cmds.txt` to connect to `admin@10.0.0.50`.
**Hint:** Combine the identity file flag and the batch file flag.
**Solution:**

```bash
sftp -i /opt/keys/id_rsa -b /opt/scripts/sftp_cmds.txt admin@10.0.0.50
```

**Problem:** You are currently in an interactive `sftp>` session. You need to upload the file `payload.tar` to the remote `/var/www/` directory. However, the file `payload.tar` is located in your local `/tmp` directory, and your local working directory is currently `~`. Write the two interactive commands required to change your local context and upload the file.
**Hint:** Use the command to change the Local directory, followed by the upload command.
**Solution:**

```bash
sftp> lcd /tmp
sftp> put payload.tar /var/www/
```

## References

- [sftp(1) - Linux man page](https://linux.die.net/man/1/sftp)
- [OpenSSH SFTP Server Subsystem](https://man.openbsd.org/sftp-server.8)
