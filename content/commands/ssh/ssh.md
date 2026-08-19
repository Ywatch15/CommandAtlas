---
slug: ssh
name: ssh
aliases: ['secure shell']
category: ssh
tags: [networking, security, remote-access, tunneling, sysadmin]
difficulty: beginner
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'login to remote server'
  - 'secure shell connect'
  - 'ssh port forwarding'
  - 'execute remote command'
  - 'setup reverse ssh tunnel'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`ssh` (Secure Shell) is a ubiquitous network protocol and command-line application used for secure, encrypted communication between two untrusted hosts over an insecure network. As the definitive industry standard for remote systems administration, it replaces legacy, plaintext protocols like Telnet and `rlogin`, providing robust cryptographic authentication, interactive terminal sessions, remote command execution, and highly versatile TCP port forwarding (tunneling) capabilities.

## Why does it exist?

In the early days of the internet, administrators logged into remote Unix machines using Telnet. Telnet transmitted every keystroke—including root passwords—in absolute plaintext, allowing malicious actors with a basic packet sniffer (like Wireshark) to hijack servers effortlessly. Developed in 1995, `ssh` was designed to eradicate this vulnerability. By utilizing a hybrid cryptographic architecture (asymmetric keys for authentication and key exchange, and symmetric keys for bulk data encryption), `ssh` mathematically guarantees data confidentiality, payload integrity, and server authenticity, establishing the secure foundation of modern cloud infrastructure management.

## Syntax

```bash
ssh [options] [user@]hostname [command]
```

## Flags

| Flag                      | Description                                                                                                                                | Example                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `-p <port>`               | Connects to a non-standard port on the remote host (the default is TCP 22).                                                                | `ssh -p 2222 user@host`                    |
| `-i <file>`               | Selects a specific private key file (identity) to use for public key authentication.                                                       | `ssh -i ~/.ssh/dev_key user@host`          |
| `-J <destination>`        | The "Jump" host. Instructs SSH to connect to a target machine by transparently routing the connection through a bastion proxy.             | `ssh -J bastion@10.0.0.1 dbadmin@10.0.1.5` |
| `-L <port:host:hostport>` | Local Port Forwarding. Binds a local port and securely tunnels it to a destination reachable by the remote server.                         | `ssh -L 8080:localhost:80 user@host`       |
| `-R <port:host:hostport>` | Reverse Port Forwarding. Binds a port on the remote server and tunnels traffic backwards to the local machine.                             | `ssh -R 9000:localhost:3000 user@host`     |
| `-D <port>`               | Dynamic Port Forwarding. Spawns a local SOCKS proxy. Traffic sent to this proxy is routed dynamically through the remote server.           | `ssh -D 1080 user@host`                    |
| `-N`                      | Do not execute a remote command. This is explicitly used for port forwarding; it prevents the allocation of a shell.                       | `ssh -N -L 8080:localhost:80 user@host`    |
| `-f`                      | Requests SSH to instantly drop into the background just before command execution. Used exclusively with `-N` for headless tunneling.       | `ssh -f -N -D 1080 user@host`              |
| `-v`                      | Verbose mode. Prints intricate debugging messages detailing the cryptographic handshake and authentication negotiation.                    | `ssh -v user@host`                         |
| `-X` / `-Y`               | Enables X11 Forwarding. Allows graphical Linux desktop applications running on the remote server to display their UI on the local machine. | `ssh -X user@host`                         |

## Examples

```bash
ssh admin@192.168.1.100
```

> The universal invocation. The client attempts a connection to port 22 on `192.168.1.100`. It negotiates encryption, attempts to authenticate the user `admin` (via key or password), and allocates an interactive pseudo-terminal (PTY) tied to the user's default login shell (e.g., `/bin/bash`).

```bash
ssh ubuntu@webserver "uptime && free -m"
```

> Remote command execution. Instead of launching an interactive shell, the client connects securely, executes exactly the commands specified within the quotes on the remote operating system, streams the standard output back to the local terminal, and instantly disconnects.

```bash
ssh -i ~/.ssh/aws_ec2.pem -p 2222 ec2-user@34.200.10.15
```

> Hardened access. Bypasses the default port to connect to 2222, and explicitly designates an unencrypted `.pem` private key file to satisfy public-key authentication, overriding the default `~/.ssh/id_rsa` lookup.

```bash
ssh -N -L 5432:10.0.5.10:5432 jump-user@bastion-host.com
```

> Local Port Forwarding. The developer's machine opens local port `5432`. Any traffic sent to `localhost:5432` is encrypted, tunneled to `bastion-host.com`, and the bastion host decrypts and forwards it to the internal database at `10.0.5.10:5432`. The `-N` flag prevents a shell from opening, optimizing it purely as a background tunnel.

```bash
ssh -J user1@bastion1,user2@bastion2 user3@target-db
```

> Multi-hop Jump chaining. Introduced in newer OpenSSH versions, this allows an administrator to transparently tunnel through multiple perimeter security gateways consecutively to reach a deeply nested production server in a single command.

## Real-World Scenarios

**Bypassing Corporate Firewalls (SOCKS Proxy)**

```bash
ssh -D 8080 -C -N -f home-user@my-home-server.com
```

> An employee on a restrictive corporate Wi-Fi network executes this command to connect to their home server. It spawns a local SOCKS5 proxy on port 8080. By configuring their web browser to use `localhost:8080` as a proxy, all web traffic is heavily compressed (`-C`) and tunneled securely out of the corporate network, emerging un-filtered from the home server's IP address.

**Exposing Local Webhooks to the Internet (Reverse Tunneling)**

```bash
ssh -R 80:localhost:3000 public-user@my-cloud-vps.com
```

> A developer is building a Stripe/Twilio integration on `localhost:3000` but needs a public HTTPS URL to receive the webhook payloads. By initiating a reverse tunnel, any traffic hitting port 80 on the public VPS is securely piped backward across the internet and delivered directly to the developer's laptop, eliminating the need for complex NAT routing. (Tools like `ngrok` automate this specific pattern).

## When should it NOT be used?

- **Massive parallel fleet execution:** **Do not use a `for` loop of `ssh` commands to update 500 servers.** `ssh` connections are sequential and slow to handshake. For managing infrastructure at scale, use agentless automation frameworks like Ansible (which multiplexes SSH connections aggressively) or agent-based systems like Chef/Puppet.
- **Unreliable/Roaming Network Connections:** If you are on a cellular connection or moving a laptop between Wi-Fi access points, the underlying TCP connection will break, and the SSH session will freeze entirely. Use `mosh` (Mobile Shell), which utilizes UDP and instantly recovers roaming connections.
- **High-Volume Data Streaming:** Transferring terabytes of data over an SSH tunnel (e.g., `tar | ssh | tar`) is highly inefficient on fast, trusted backend networks because the single-threaded CPU AES encryption overhead caps out gigabit speeds. Use `netcat` (nc) on trusted air-gapped internal subnets.

## Alternatives

- **Mosh (Mobile Shell):** **Best for roaming/unstable networks.** Abstracts the terminal session over UDP, predicting keystrokes locally to hide latency, and survives IP address changes and network drops flawlessly.
- **AWS Session Manager / GCP IAP:** **Best for cloud environments.** Completely eliminates the need to open port 22 to the internet or manage SSH keys, utilizing the cloud provider's proprietary control-plane agents to broker secure terminal access via IAM.
- **Ansible:** **Best for remote execution.** Designed to execute commands and configuration states across thousands of hosts simultaneously.

## How it works internally

The OpenSSH client executes a complex, stateful state machine when initiating a connection:

1.  **Transport Layer & Handshake:** It opens a TCP connection to port 22. The client and server exchange version strings (e.g., `SSH-2.0-OpenSSH_8.9`). They negotiate the strongest mutually supported cryptographic algorithms for Key Exchange (e.g., `curve25519-sha256`), Bulk Encryption (e.g., `aes256-gcm`), and MAC (Message Authentication Code).
2.  **Server Authentication:** The server sends its public Host Key. The client mathematically verifies this against `~/.ssh/known_hosts`. If it's a new server, the user is prompted to accept the fingerprint, preventing Man-In-The-Middle attacks.
3.  **Key Exchange (Diffie-Hellman):** They perform a Diffie-Hellman key exchange to securely generate a shared symmetric session key. All subsequent traffic is now encrypted.
4.  **User Authentication:** The client requests the `ssh-userauth` service. It attempts to authenticate the user using public keys (proving possession of the private key via cryptographic signing), falling back to password or keyboard-interactive (MFA/TOTP) challenges.
5.  **Connection Multiplexing:** Once authenticated, the client requests the `ssh-connection` service. It opens one or more "Channels" within the encrypted tunnel. A single SSH TCP connection can multiplex a PTY (Interactive Shell) channel, a Local Port Forwarding channel, and an SFTP channel simultaneously.

## Performance Notes

- **Multiplexing (ControlMaster):** Negotiating an SSH handshake is slow (often taking 500ms+). If writing a script that issues 10 distinct `ssh` commands to the same server, enable connection multiplexing in `~/.ssh/config` (`ControlMaster auto`, `ControlPath`). The first `ssh` command establishes the heavy TCP/crypto tunnel; subsequent commands piggyback instantly over a local Unix domain socket, reducing connection time to ~10ms.

## Security Notes

- **Disable Password Authentication:** Passwords are vulnerable to brute-force dictionaries. Always configure the remote `sshd_config` with `PasswordAuthentication no` and enforce strict Public Key (RSA/Ed25519) authentication.
- **Forwarding the SSH Agent (`-A`):** The `-A` flag enables agent forwarding, allowing you to use your local SSH keys on a remote jump host to hop to a third server. This is highly dangerous. If the jump host is compromised by an attacker (or a malicious root admin), they can hijack your active agent socket and authenticate to other machines as you. Modern environments should strictly use the `-J` (Jump) feature, which tunnels _through_ the bastion cryptographically without exposing the local agent to it.

## Common Mistakes

- **Failing to use `~/.ssh/config`**
  - _Mistake:_ Memorizing and typing `ssh -i ~/.ssh/dev_key.pem -p 2222 ec2-user@34.20.10.15` every single day.
  - _Why:_ The SSH configuration file allows you to create aliases. By adding a block for `Host dev-server`, defining the `Hostname`, `User`, `Port`, and `IdentityFile`, you can reduce that massive command to simply `ssh dev-server`.
- **Running complex quotes in remote execution**
  - _Mistake:_ `ssh host "awk '{print $1}' /var/log/syslog"`
  - _Why:_ The local bash shell attempts to evaluate `$1` before sending the string over the network. Because `$1` is likely empty locally, the remote server receives `awk '{print }'`, breaking the command. You must aggressively escape variables intended for the remote machine: `ssh host "awk '{print \$1}' /var/log/syslog"`.

## Best Practices

- **Adopt Ed25519 Keys:** Legacy RSA keys require massive bit lengths (4096) to remain secure, leading to slower handshakes and larger files. Ed25519 relies on elliptic curve cryptography, offering significantly higher security with microscopic, fast-computing key sizes.
- **Use `Escape Characters` for Frozen Sessions:** If an SSH session freezes due to a dropped VPN or Wi-Fi disconnection, do not close your entire terminal window. Type `Enter`, then `~`, then `.` (tilde dot). This is the OpenSSH escape sequence that forcibly tears down the broken socket and returns you to your local shell gracefully.

## Interview Questions

**Q: You need to access an internal web application running on port 8080 of a private server `10.0.1.50`. You only have SSH access to a Bastion host (`bastion.corp.com`). Explain the exact SSH command you would use on your laptop to view this web application in your local browser.**
**A:** You would use Local Port Forwarding combined with the Jump host feature: `ssh -J user@bastion.corp.com -L 8080:10.0.1.50:8080 user@10.0.1.50`. This creates a secure tunnel. When you open `http://localhost:8080` in your local browser, SSH encrypts the HTTP request, tunnels it through the Bastion proxy, decrypts it on the target server, and delivers it to the internal application, returning the HTML to your browser securely.

**Q: In an SSH configuration, what is the critical security difference between using Agent Forwarding (`ssh -A`) versus using a Jump Host (`ssh -J`) when connecting to a secure backend server via a bastion?**
**A:** Agent Forwarding (`-A`) mounts a Unix domain socket on the bastion host that connects back to your laptop's ssh-agent. If the bastion host is compromised, a root attacker can hijack this socket and use your keys to authenticate to other servers. The Jump Host (`-J` or `ProxyJump`) establishes a TCP tunnel _through_ the bastion. The cryptographic handshake occurs directly between your laptop and the backend server. The bastion only sees encrypted ciphertext and never gains access to your agent or keys, making it vastly more secure.

## Practice Problems

**Problem:** You are writing an automation script to fetch the kernel version from a remote server `prod-db`. You do not want the command to allocate an interactive terminal, and you want to extract the information and disconnect immediately. Write the command.
**Hint:** Append the remote execution command directly as an argument to the SSH invocation.
**Solution:**

```bash
ssh admin@prod-db "uname -r"
```

**Problem:** You want to configure a reverse tunnel. A service running on your local laptop on port `3000` needs to be accessible from the public internet. You have a cloud VPS at `public-vps.com`. Write the command to bind port `80` on the remote VPS and pipe all traffic backwards to your laptop's port `3000`, pushing the SSH process cleanly into the background.
**Hint:** Combine the Reverse forward flag, the No-command flag, and the background execution flag.
**Solution:**

```bash
ssh -R 80:localhost:3000 -N -f root@public-vps.com
```

## References

- [ssh(1) - Linux man page](https://linux.die.net/man/1/ssh)
- [ssh_config(5) - OpenSSH client configuration files](https://linux.die.net/man/5/ssh_config)
