---
slug: ssh-keyscan
name: ssh-keyscan
aliases: []
category: ssh
tags: [ssh, networking, security, known-hosts, automation, discovery]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'grab ssh host key'
  - 'add server to known_hosts automatically'
  - 'bypass ssh yes/no prompt'
  - 'scan network for ssh keys'
  - 'fetch remote public key ssh'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`ssh-keyscan` is a highly specialized networking utility bundled with OpenSSH used to gather the public SSH host keys of remote servers. It establishes an asynchronous, non-blocking TCP connection to multiple target hosts, negotiates the initial SSH protocol handshake to request their cryptographic identity keys, and outputs those keys in a format perfectly structured for direct inclusion into the `~/.ssh/known_hosts` file.

## Why does it exist?

The SSH protocol enforces "Trust On First Use" (TOFU). When connecting to a new server, the SSH client loudly halts execution and prompts the user: `Are you sure you want to continue connecting (yes/no)?`. In automated CI/CD environments, deployment scripts (like Ansible or rsync) cannot interactively type "yes," causing pipelines to hang and fail instantly. While turning off `StrictHostKeyChecking` bypasses this, it opens the system to catastrophic Man-in-the-Middle (MitM) attacks. `ssh-keyscan` exists to solve this by providing a mechanism to pre-populate the `known_hosts` file with the server's identity _before_ the automated script runs, satisfying the security check cleanly.

## Syntax

```bash
ssh-keyscan [-46cHv] [-f file] [-p port] [-T timeout] [-t type] [host | addrlist namelist]
```

## Flags

| Flag           | Description                                                                                          | Example                             |
| -------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `-t <type>`    | Specifies the exact type of host key to fetch (`rsa`, `ecdsa`, `ed25519`).                           | `ssh-keyscan -t ed25519 github.com` |
| `-p <port>`    | Connects to a custom SSH port rather than the default TCP port 22.                                   | `ssh-keyscan -p 2222 10.0.0.5`      |
| `-H`           | Hashes all hostnames and addresses in the output, preventing reconnaissance of the known_hosts file. | `ssh-keyscan -H server.corp.com`    |
| `-f <file>`    | Reads a list of target hostnames or IP addresses from a specified text file.                         | `ssh-keyscan -f inventory.txt`      |
| `-T <timeout>` | Sets the timeout (in seconds) for connection attempts (default is 5 seconds).                        | `ssh-keyscan -T 10 flaky-server`    |
| `-c`           | Requests certificates from the remote host instead of standard plain keys.                           | `ssh-keyscan -c bastion.net`        |
| `-v`           | Verbose mode. Prints diagnostic messages to standard error detailing the connection handshake.       | `ssh-keyscan -v 192.168.1.1`        |
| `-4` / `-6`    | Forces `ssh-keyscan` to use IPv4 (`-4`) or IPv6 (`-6`) exclusively.                                  | `ssh-keyscan -6 ipv6-host.local`    |

## Examples

```bash
ssh-keyscan github.com >> ~/.ssh/known_hosts
```

> This is the most ubiquitous usage. It connects to GitHub, retrieves its public host keys (RSA, ECDSA, Ed25519), and appends them directly to the local `known_hosts` file. Subsequent `git push` or `git clone` operations over SSH will bypass the strict host checking prompt entirely.

```bash
ssh-keyscan -H 10.0.5.50 >> ~/.ssh/known_hosts
```

> This retrieves the host keys but explicitly utilizes the `-H` flag. Instead of writing `10.0.5.50 ssh-ed25519 AAAAC3...`, it mathematically hashes the IP address (e.g., `|1|Hq...`). If the user's laptop is compromised, the attacker cannot trivially read the `known_hosts` file to discover the internal IPs the user connects to.

```bash
ssh-keyscan -t ed25519 -p 22022 server1 server2 server3
```

> This connects to three different servers simultaneously on a custom port (`22022`). To reduce noise and enforce modern cryptography, it restricts the query (`-t ed25519`) to request only the highly secure Ed25519 host keys, ignoring legacy RSA or ECDSA responses.

```bash
ssh-keyscan -f hosts.txt > cluster_keys.txt
```

> This instructs the utility to read a newline-separated list of target IPs or domain names from the `hosts.txt` file (`-f`). It heavily parallelizes the network connections, gathering hundreds of host keys in seconds, and outputs the aggregated matrix to a single file.

## Real-World Scenarios

**Pre-Warming CI/CD Deployment Runners**

```bash
mkdir -p ~/.ssh
ssh-keyscan -t ed25519 gitlab.com >> ~/.ssh/known_hosts
ssh-keyscan -t ed25519 $TARGET_PROD_IP >> ~/.ssh/known_hosts
```

> In ephemeral Docker containers executing deployment pipelines, the environment starts completely blank. The pipeline script must first run `ssh-keyscan` against the code repository and the target production servers. This pre-populates the trust boundary, ensuring tools like `rsync` or `ansible-playbook` do not hang indefinitely waiting for interactive terminal verification.

**Validating Fleet Host Key Upgrades**

```bash
ssh-keyscan -f inventory.txt | grep "ssh-rsa"
```

> Security administrators enforcing deprecation of weak RSA host keys across a 500-node cluster run a mass scan using a host inventory file. They pipe the output to `grep` to instantly identify any rogue or legacy servers still broadcasting `ssh-rsa` keys instead of the mandated `ssh-ed25519`.

## When should it NOT be used?

- **As a mechanism for absolute security verification:** **Reason:** `ssh-keyscan` blindly trusts the key handed to it over the network. If a Man-in-the-Middle (MitM) attacker intercepts the connection _during_ the scan, `ssh-keyscan` will happily record the attacker's key, cementing the compromise. **Use instead:** Secure out-of-band key verification (e.g., pulling keys securely via cloud APIs or configuration management tools).
- **For broad network port scanning:** **Reason:** While it can find listening SSH daemons, it is highly conspicuous, slow for massive subnets, and explicitly identifies itself in logs. **Use instead:** `nmap -p 22 10.0.0.0/24`.

## Alternatives

- **SSH Certificates:** The enterprise standard. **Tradeoff:** Instead of managing `known_hosts` files globally, you configure `ssh` to trust a single Certificate Authority (CA) public key. The servers present a certificate signed by that CA. This entirely eliminates the need for `ssh-keyscan` or TOFU, but requires deploying complex PKI infrastructure.
- **`ssh -o StrictHostKeyChecking=accept-new`:** Automated TOFU. **Tradeoff:** This modern SSH flag automatically accepts the key on the first connection without hanging the script. However, it still leaves the connection vulnerable to a Day-1 MitM attack, exactly like `ssh-keyscan`.
- **`nmap --script ssh-hostkey`:** Deep reconnaissance. **Tradeoff:** Nmap can extract the host keys and format them, but it is vastly heavier and requires installing the entire Nmap suite, whereas `ssh-keyscan` is natively available on any system with OpenSSH.

## How it works internally

Unlike the standard `ssh` client, `ssh-keyscan` does _not_ attempt to authenticate or open an interactive terminal session.

When executed, it opens raw, non-blocking TCP sockets to port 22 (or the requested port) on the target hosts. Because it uses asynchronous I/O, it can efficiently manage connections to dozens of hosts in parallel within a single thread.

Once the TCP handshake completes, `ssh-keyscan` initiates the standard SSH Protocol version exchange (e.g., `SSH-2.0-OpenSSH_8.9p1`). It then enters the Key Exchange (KEX) phase. During this phase, it explicitly transmits a payload requesting the host key algorithms specified by the `-t` flag (or defaults).

The remote `sshd` daemon responds with the `SSH_MSG_KEXINIT` payload containing the server's public cryptographic keys. The exact millisecond `ssh-keyscan` receives and parses the raw key string, it abruptly drops the TCP connection without completing the cryptographic key exchange, bypassing authentication entirely. It then formats the raw base64 key payload alongside the IP/Hostname into the standard `known_hosts` text format and flushes it to standard output.

## Performance Notes

- `ssh-keyscan` is phenomenally fast. Due to its asynchronous, non-blocking architecture, it can comfortably query and retrieve keys from an inventory file of 1,000 servers in mere seconds, far faster than wrapping `ssh` commands in a bash `for` loop.
- Connections subject to extreme network latency or aggressive firewall packet-dropping will stall until the `-T` (timeout) threshold is reached. If scanning across WAN links, reducing `-T 2` can aggressively speed up mass sweeps by abandoning dead IPs faster.

## Security Notes

- **The Inherent MitM Risk:** Using `ssh-keyscan` is functionally identical to blindly typing "yes" to the SSH connection prompt. It offers zero cryptographic assurance that the remote server is actually who it claims to be. It is merely an automation bypass tool. Keys retrieved via `ssh-keyscan` _must_ be mathematically verified against a trusted out-of-band source (like AWS EC2 console logs or a secure CMDB) if true Zero Trust security is required.
- **The Hashing Mandate (`-H`):** Storing plaintext IPs and hostnames in `known_hosts` provides attackers with a perfect, pre-compiled roadmap of your internal network infrastructure if your machine is compromised. Always utilize the `-H` flag to obfuscate the targets.

## Common Mistakes

- **Using `>` instead of `>>`:** Running `ssh-keyscan host > ~/.ssh/known_hosts`. **Why it's wrong:** The single redirect `>` completely destroys and overwrites the entire existing `known_hosts` file, wiping out trust for all previously connected servers. You must always use the append operator `>>`.
- **Scanning through Load Balancers:** Running `ssh-keyscan lb.company.com`. **Why it's wrong:** A load balancer routes TCP traffic round-robin to backend servers. Each scan will likely hit a different backend worker, returning a completely different host key every time. You must scan the specific backend IPs, or configure the servers to share a unified host key.
- **Ignoring the `ssh-rsa` deprecation:** Not specifying `-t` and accumulating legacy `ssh-rsa` host keys. Modern OpenSSH 8.8+ clients completely refuse to connect using `ssh-rsa` signatures. Relying on default keyscans often captures these deprecated keys, leading to sudden automation failures. Force `-t ed25519`.

## Best Practices

- When provisioning immutable cloud infrastructure (Terraform/Packer), heavily utilize the host's cloud API to inject pre-generated Ed25519 host keys during `cloud-init`. This allows you to construct a perfectly trusted `known_hosts` file centrally, completely eliminating the dangerous need for `ssh-keyscan` TOFU dynamics.
- If you must use `ssh-keyscan` in a pipeline, combine it with strict formatting: `ssh-keyscan -H -t ed25519 $TARGET_IP >> ~/.ssh/known_hosts`. This minimizes output bloat, enforces modern cryptography, and prevents reconnaissance mapping.

## Interview Questions

**Q:** A CI/CD deployment pipeline utilizes `rsync` over SSH to copy code to a staging server. The pipeline suddenly hangs indefinitely on the `rsync` step without throwing an error. What is the standard SSH security mechanism causing this hang, and how does `ssh-keyscan` resolve it?
**A:** The `rsync` command relies on the underlying `ssh` client. When the SSH client encounters a server IP it has never seen before, it invokes "Trust On First Use" (TOFU) and interactively prompts the terminal with "Are you sure you want to continue connecting?". Because the CI/CD pipeline is non-interactive, there is no human to type "yes", so the process hangs forever waiting for input. Placing `ssh-keyscan target-server >> ~/.ssh/known_hosts` before the `rsync` step fetches the key and satisfies the security check, allowing the pipeline to proceed silently.
**Q:** Why is it considered a severe security risk to blindly run `ssh-keyscan server_ip >> ~/.ssh/known_hosts` on a public or untrusted network (like a coffee shop Wi-Fi)?
**A:** `ssh-keyscan` accepts whatever public key is handed to it over the network. If an attacker is performing an ARP spoofing or DNS hijacking Man-in-the-Middle (MitM) attack on the untrusted Wi-Fi, they will intercept the `ssh-keyscan` request and provide their own malicious public key. The developer has now permanently baked the attacker's key into their trusted `known_hosts` file, allowing the attacker to silently intercept and decrypt all future SSH connections to that server.
**Q:** What is the functional security purpose of injecting the `-H` flag into an `ssh-keyscan` command?
**A:** The `-H` flag hashes the hostname and IP address entries before writing them to the terminal. If written in plaintext, the `known_hosts` file acts as a golden map for an attacker who breaches the workstation, revealing the exact internal network topology and highly valuable server IPs. Hashing the entries prevents this reconnaissance while still allowing the SSH client to verify connections securely.

## Practice Problems

**Problem:** Your automation script needs to trust a new server at `192.168.50.25`. Fetch the host key for this server, but explicitly restrict the request to the modern `ed25519` cryptographic algorithm, and securely append the hashed result directly to your local trust store.
**Hint:** Combine the hash flag, the specific algorithm type flag, the target IP, and the bash append redirection operator targeting the specific file.
**Solution:** `ssh-keyscan -H -t ed25519 192.168.50.25 >> ~/.ssh/known_hosts` (This performs a highly secure, modern trust population).
**Problem:** You have a text file named `server_list.txt` containing 50 hostnames. Write a command to scan all 50 hosts efficiently for their host keys, suppressing standard connection diagnostic noise, and redirecting the gathered keys into a file named `fleet_keys.txt`.
**Hint:** Utilize the specific flag for file-based input processing, and redirect standard output to the target file.
**Solution:** `ssh-keyscan -f server_list.txt > fleet_keys.txt` (This utilizes asynchronous I/O to rip through the entire inventory list in seconds).

## References

- [OpenSSH Manual Pages - ssh-keyscan](https://man.openbsd.org/ssh-keyscan.1)
- [GitLab CI/CD - Using SSH keys](https://docs.gitlab.com/ee/ci/ssh_keys/)
