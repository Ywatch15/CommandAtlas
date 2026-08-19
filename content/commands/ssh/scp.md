---
slug: scp
name: scp
aliases: ['secure copy']
category: ssh
tags: [ssh, file-transfer, networking, copy, remote, legacy]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'copy file to remote server'
  - 'download file from ssh server'
  - 'securely transfer directory'
  - 'copy files between two servers'
  - 'scp with identity key'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`scp` (Secure Copy Protocol) is a command-line utility used to securely transfer computer files between a local host and a remote host, or between two remote hosts. It utilizes the SSH (Secure Shell) protocol for data transfer, ensuring that both file contents and passwords are encrypted over the network. _(Note: As of OpenSSH 9.0, `scp` uses the SFTP protocol under the hood by default, resolving historic protocol vulnerabilities while maintaining the familiar CLI syntax)._

## Why does it exist?

Before SSH, administrators transferred files using `rcp` (Remote Copy) or FTP, both of which sent data and passwords in absolute plaintext, making them highly vulnerable to packet sniffing. `scp` was developed to provide the exact same simplistic, non-interactive syntax as `rcp` (`scp source destination`), but encapsulated entirely within an encrypted SSH tunnel. It exists to provide the lowest-friction, universally available method for moving files across network boundaries securely without requiring complex daemon configurations like FTPS.

## Syntax

```bash
scp [options] [user@]host1:]file1 ... [[user@]host2:]file2
```

## Flags

| Flag                 | Description                                                                                                                                   | Example                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `-r`                 | Recursively copies entire directories and their contents.                                                                                     | `scp -r ./local_folder user@remote:/tmp/` |
| `-P <port>`          | Specifies a non-standard SSH port to connect to on the remote host. (Note the capital 'P', unlike standard `ssh`).                            | `scp -P 2222 file.txt user@host:/tmp`     |
| `-p`                 | Preserves modification times, access times, and strict file modes (permissions) from the original file.                                       | `scp -p backup.tar user@host:/backups/`   |
| `-i <identity_file>` | Specifies the private key (identity) file to use for public key authentication.                                                               | `scp -i ~/.ssh/id_ed25519 file.txt host:` |
| `-l <limit>`         | Limits the used bandwidth, specified in Kbit/s. Useful to prevent saturating slow WAN links.                                                  | `scp -l 5000 massive.iso user@host:/`     |
| `-3`                 | Routes traffic between two remote hosts entirely through the local machine. Essential if the two remote hosts cannot communicate directly.    | `scp -3 host1:/file host2:/file`          |
| `-C`                 | Enables compression. Passes the `-C` flag to SSH to compress the data stream, improving transfer speed on slow, highly-compressible payloads. | `scp -C massive_log.txt host:/tmp`        |
| `-q`                 | Quiet mode. Suppresses the progress meter, warning messages, and diagnostic output.                                                           | `scp -q file.txt host:/tmp`               |
| `-O`                 | (OpenSSH 9.0+) Forces `scp` to use the legacy SCP protocol instead of the modern SFTP subsystem. Required when talking to outdated routers.   | `scp -O config.bin admin@switch:/`        |
| `-J <destination>`   | Connects to the target host by first jumping through a designated bastion proxy host.                                                         | `scp -J jump@bastion user@target:/file .` |

## Examples

```bash
scp data.csv admin@192.168.1.50:/var/www/
```

> The standard upload pattern. Copies the local file `data.csv` to the remote server `192.168.1.50`, logging in as `admin`, and places it in the absolute path `/var/www/`.

```bash
scp admin@192.168.1.50:/var/log/syslog ./remote_syslog.txt
```

> The standard download pattern. Reverses the arguments to pull a file from the remote server and save it to the local directory (`.`) under a new name `remote_syslog.txt`.

```bash
scp -P 2022 -i ~/.ssh/prod_key -r ./dist deploy@server.com:/var/www/html/
```

> A complex deployment script pattern. Utilizes a non-standard SSH port (`-P 2022`), specifies a distinct private key for authentication (`-i`), and recursively uploads an entire web directory (`-r`) to the remote host.

```bash
scp db_server:/tmp/dump.sql web_server:/tmp/
```

> Remote-to-Remote transfer. By default, `scp` connects to `db_server` and tells it to open a direct SSH connection to `web_server` to transfer the file. This requires `db_server` to have SSH keys authorized on `web_server`.

```bash
scp -3 host_a:/var/log/app.log host_b:/var/log/host_a_app.log
```

> Triangulated remote transfer. If `host_a` and `host_b` are on isolated networks and cannot route to each other, the `-3` flag pulls the file from `host_a` down to your local machine, and then securely pushes it up to `host_b`, bridging the gap.

## Real-World Scenarios

**Exfiltrating Logs from Jump Hosts**

```bash
scp -J bastion-user@10.0.0.5 prod-user@10.0.1.20:/var/log/nginx/error.log ./
```

> Often, production servers reside in private VPCs with no inbound internet access. Developers use the `-J` (Jump) flag to instruct `scp` to transparently route the file transfer through an intermediate public bastion host, securely pulling the log file directly to their laptop in one command.

**Bandwidth-Constrained Network Backups**

```bash
scp -l 10000 -p /backups/db.tar.gz backup-server:/archives/
```

> Pushing a massive database dump across a T1 or slow site-to-site VPN link will consume 100% of the available bandwidth, crippling VOIP and active applications. An administrator limits the upload speed to ~10,000 Kbps (1.25 MB/s) using `-l` and preserves file timestamps using `-p`.

## When should it NOT be used?

- **Synchronizing Directories:** **Do not use `scp -r` to update folders.** `scp` is extremely "dumb"—it copies every single byte of every single file unconditionally, even if the destination files are identical. For syncing updates, always use `rsync`, which uses delta-transfers to send only the modified chunks of files.
- **Large-scale file migrations:** `scp` handles file stat requests poorly. Transferring a directory containing 1,000,000 tiny images via `scp -r` will take significantly longer than bundling them into a `tar` stream over SSH.
- **Legacy Appliances:** If you are running a brand new OS (like Ubuntu 22.04+) but need to pull a config file from a 15-year-old Cisco switch, standard `scp` might fail because modern OpenSSH defaults to the SFTP backend. You must explicitly pass the `-O` flag to force the legacy RCP-style protocol.

## Alternatives

- **`rsync`:** **Best for professional synchronization.** It is faster, resumes broken transfers, supports partial file deltas, and can exclude specific files via patterns. Almost entirely supersedes `scp` for complex tasks.
- **`sftp`:** **Best for interactive browsing.** Provides an FTP-like shell to traverse directories before downloading, whereas `scp` requires you to know the exact absolute path beforehand.

## How it works internally

Historically, `scp` operated using a highly undocumented, ad-hoc protocol based on the 1983 BSD `rcp` command. The client spawned an `ssh` process to execute a hidden `scp -t` (to) or `scp -f` (from) command on the remote server. The two `scp` binaries then communicated directly over the encrypted SSH tunnel via standard input/output, passing raw control bytes (like `C0644 1024 file.txt`) followed by raw file data. This protocol had severe design flaws, including trusting the remote server's filenames blindly, which led to directory traversal vulnerabilities.

Because of these flaws, as of OpenSSH release 9.0 (April 2022), the `scp` command line utility was completely rewritten internally.

When you type `scp file host:/path`, the modern `scp` binary actually spins up an `sftp` (SSH File Transfer Protocol) client session under the hood. It connects to the `sftp-server` subsystem on the remote SSH daemon. The transfer utilizes the heavily standardized, packetized SFTP protocol, which enforces strict filesystem boundaries and attribute handling. The classic `scp` command is now simply a syntax-wrapper acting as a frontend to the SFTP engine.

## Performance Notes

- **Encryption Overhead:** `scp` encrypts all data. Transferring files on a highly trusted, air-gapped 10Gbe backend network using `scp` will bottleneck on the CPU's ability to encrypt/decrypt AES-GCM, not the network speed. Tools like `netcat` or unencrypted `tar` pipes are vastly faster for trusted bulk transfers.

## Security Notes

- **The Legacy Protocol Vulnerability (CVE-2019-6111):** In the legacy SCP protocol (used by default prior to OpenSSH 9.0 or when using the `-O` flag), the client trusts the server blindly. If you run `scp user@evil-server:/file.txt .`, a compromised server could choose to send a file named `../../.ssh/authorized_keys`, maliciously overwriting your local SSH keys. Modern OpenSSH fixed this by strictly validating filenames, and ultimately migrating to the SFTP backend.

## Common Mistakes

- **Getting the capital letters wrong**
  - _Mistake:_ Typing `scp -p 2222 local_file host:/tmp`.
  - _Why:_ In standard `ssh`, port selection is a lowercase `-p`. In `scp`, lowercase `-p` means "preserve file attributes," and capital `-P` means "Port." Using the wrong case will result in `scp` attempting to connect to the default port 22 and failing.
- **Overwriting local files silently**
  - _Mistake:_ Running `scp host:/var/log/syslog .` when a local `syslog` file already exists.
  - _Why:_ `scp` executes completely non-interactively. It does not prompt "File exists, overwrite? [Y/n]". It instantly overwrites the local file with the remote payload, destroying the local data.
- **Path expansion failures**
  - _Mistake:_ Running `scp host:/var/log/*.log .` in a complex script.
  - _Why:_ The local shell attempts to expand `*.log` before passing it to `scp`. If no `.log` files exist locally, bash passes the literal string. `scp` then securely asks the remote server for `*.log`, and the _remote_ shell expands it. This double-expansion creates incredibly confusing edge cases. Use quotes: `scp "host:/var/log/*.log" .`.

## Best Practices

- **Migrate to `rsync`:** Cultivate the habit of typing `rsync -avzP source dest` instead of `scp -r source dest`. It handles edge cases, resuming, and symlinks significantly better.
- **Validate SSH Configuration:** `scp` respects your `~/.ssh/config` file. Instead of typing `scp -i ~/.ssh/key -P 2222 -J bastion user@10.0.5.10:/file .`, define the host in your config file. Then you can simply type `scp target_host:/file .`.

## Interview Questions

**Q: You attempt to copy a file using `scp -r ./data user@server:/tmp`. The command fails with an error stating "subsystem request failed on channel 0". What is the architectural reason for this, and how can you fix it without modifying the server?**
**A:** Modern `scp` (OpenSSH 9.0+) relies on the SFTP subsystem to transfer files. If the remote server has explicitly disabled the SFTP subsystem in its `sshd_config` (or is a legacy embedded device like a router that never supported it), the connection fails. You can fix this client-side by passing the `-O` flag, which forces `scp` to fall back to the legacy RCP-style plaintext streaming protocol.

**Q: Explain the difference between `scp host_a:/file host_b:/file` and `scp -3 host_a:/file host_b:/file`.**
**A:** By default, `scp` attempts a direct remote-to-remote transfer: it logs into `host_a` and instructs `host_a` to open a direct SSH connection to `host_b` to push the file. This requires `host_a` to have the appropriate firewall access and SSH keys to authenticate to `host_b`. The `-3` flag routes the traffic through the local machine executing the command. `scp` downloads the file from `host_a` to the local laptop, and then uploads it from the laptop to `host_b`, bypassing the need for direct network or auth relationships between the two remote servers.

## Practice Problems

**Problem:** You need to securely copy an entire directory named `website_backup` to a remote server. You must connect on port `8022`, and you want the uploaded files to retain their exact original creation timestamps and file permissions.
**Hint:** Combine the recursive flag, the capital port flag, and the preserve flag.
**Solution:**

```bash
scp -r -P 8022 -p ./website_backup admin@remote_server:/var/www/
```

**Problem:** You are downloading a 50GB database dump (`db.sql`) from a production server to your local machine. To avoid saturating the 1 Gbps network interface and causing latency for active users, you must throttle the download speed to a maximum of 50 Mbps (50,000 Kbps). Write the command.
**Hint:** Use the flag that limits bandwidth consumption.
**Solution:**

```bash
scp -l 50000 prod@server:/backups/db.sql .
```

## References

- [scp(1) - Linux man page](https://linux.die.net/man/1/scp)
- [OpenSSH 9.0 Release Notes (SFTP migration)](https://www.openssh.com/txt/release-9.0)
