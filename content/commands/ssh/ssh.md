---
slug: ssh
name: ssh
aliases: []
category: ssh
tags:
  - ssh
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
  - connect to remote server
  - secure shell connection
relatedCommands:
  - gcloud-compute-ssh
  - kubectl-exec
alternatives:
  - gcloud-compute-ssh
  - kubectl-exec
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---
## What is it?

`ssh` (OpenSSH SSH client) connects securely to a remote machine's shell server over an encrypted network protocol.

## Why does it exist?

`ssh` provides encrypted, authenticated remote terminal access, replacing unencrypted legacy protocols like telnet and rlogin.

## Syntax

```bash
ssh [options] [user@]hostname [command]
```

## Flags

| Flag | Description                         | Example                              |
| ---- | ----------------------------------- | ------------------------------------ |
| `-i` | Specify identity (private key) file | `ssh -i ~/.ssh/id_rsa user@host`     |
| `-p` | Specify remote port                 | `ssh -p 2222 user@host`              |
| `-L` | Local port forwarding               | `ssh -L 8080:localhost:80 user@host` |

## Examples

```bash
ssh user@remote.server.com
```

> Establishes interactive SSH session on standard port 22.

## Real-World Scenarios

**Remote server administration**: Connecting to cloud virtual machines (AWS EC2, DigitalOcean) to execute management commands.

## When should it NOT be used?

- **Transferring large files**: `scp` or `rsync` are preferred over raw SSH stream piping for file copies.

## Alternatives

- **`mosh`**: Mobile Shell designed for roaming connections and high-latency networks.

## How it works internally

`ssh` uses asymmetric cryptography for host/user authentication, establishing an encrypted symmetric channel (AES/ChaCha20) for session data.

## Performance Notes

Negligible CPU overhead for modern hardware encryption acceleration.

## Security Notes

Disable password authentication in sshd config and rely exclusively on strong public key pairs (Ed25519).

## Common Mistakes

- **Incorrect file permissions on `~/.ssh/config` or key files**: SSH client rejects key files with permissions broader than `600`.

## Best Practices

- Define host aliases and default keys inside `~/.ssh/config` for clean invocation.

## Interview Questions

**Q:** How does SSH local port forwarding work?
**A:** `ssh -L local_port:target_host:target_port server` forwards connections on `local_port` through `server` to `target_host:target_port`.

## Practice Problems

**Problem:** Connect to `dev.example.com` as user `admin` using port `2222` and key `~/.ssh/dev_key`.
**Solution:** `ssh -i ~/.ssh/dev_key -p 2222 admin@dev.example.com`

## References

- [OpenSSH Manual](https://www.openssh.com/manual.html)
