---
slug: ssh-copy-id
name: ssh-copy-id
aliases: []
category: ssh
tags: [ssh, networking, security, authentication, keys, provisioning]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'copy ssh key to remote server'
  - 'setup passwordless ssh login'
  - 'install public key on server'
  - 'add ssh key to authorized_keys'
  - 'automate ssh key deployment'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`ssh-copy-id` is a shell script utility provided by the OpenSSH suite that securely installs a local SSH public key onto a remote machine's `~/.ssh/authorized_keys` file. It handles the complex filesystem logistics automatically—verifying permissions, creating necessary directories, and appending the key payload—enabling immediate, password-less authentication.

## Why does it exist?

Establishing key-based authentication manually is highly error-prone. A user must SSH into the remote box, run `mkdir -p ~/.ssh`, execute `chmod 700 ~/.ssh`, paste the public key string into `~/.ssh/authorized_keys`, and run `chmod 600 ~/.ssh/authorized_keys`. If any of these strict permission boundaries fail by even a single bit, the `sshd` daemon on the remote server will silently reject the key. `ssh-copy-id` exists to eliminate this friction, automating the entire deployment chain via an encrypted payload, ensuring flawless permission alignment every single time.

## Syntax

```bash
ssh-copy-id [-f] [-n] [-i [identity_file]] [-p port] [-o ssh_option] [user@]hostname
```

## Flags

| Flag                         | Description                                                                                                    | Example                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `-i <file>`                  | Specifies the exact public key identity file to deploy. Defaults to `~/.ssh/id_rsa.pub` or similar if omitted. | `ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host` |
| `-f`                         | Force mode. Copies the keys without checking if they already exist in the remote `authorized_keys` file.       | `ssh-copy-id -f target-server`                   |
| `-n`                         | Dry-run mode. Prints the keys that _would_ be installed to the terminal, without actually copying them.        | `ssh-copy-id -n admin@10.0.0.5`                  |
| `-p <port>`                  | Specifies the target port to connect to if the remote SSH daemon is not listening on the default port 22.      | `ssh-copy-id -p 2222 user@host`                  |
| `-o <option>`                | Passes raw configuration options directly to the underlying `ssh` command executing the transfer.              | `ssh-copy-id -o StrictHostKeyChecking=no host`   |
| `-s`                         | Uses SFTP (Secure File Transfer Protocol) to append the keys, rather than executing arbitrary shell commands.  | `ssh-copy-id -s root@legacy-box`                 |
| `-h`                         | Outputs brief usage documentation and supported command-line options.                                          | `ssh-copy-id -h`                                 |
| `-V`                         | Displays the version information of the underlying OpenSSH package.                                            | `ssh-copy-id -V`                                 |
| `-o ProxyJump`               | (SSH Option) Routes the copy operation through a bastion host to reach isolated servers.                       | `ssh-copy-id -o ProxyJump=bastion user@internal` |
| `-o PubkeyAuthentication=no` | (SSH Option) Forces password authentication during the transfer to bypass broken key configurations.           | `ssh-copy-id -o PubkeyAuthentication=no host`    |

## Examples

```bash
ssh-copy-id deployer@192.168.1.100
```

> This is the default execution. The script searches the local `~/.ssh/` directory for standard public keys (e.g., `id_ed25519.pub`, `id_rsa.pub`), prompts for the `deployer` user's remote password, and securely appends all discovered keys to the target server's authorization file.

```bash
ssh-copy-id -i ~/.ssh/github_key.pub admin@production-server
```

> This explicitly dictates exactly which public key to transfer via the `-i` flag. This prevents `ssh-copy-id` from indiscriminately dumping every personal public key on your laptop onto an enterprise production server.

```bash
ssh-copy-id -p 22022 -o StrictHostKeyChecking=no root@10.0.0.5
```

> This targets a custom SSH port (`-p 22022`) and passes an explicit configuration option to the underlying SSH engine (`-o StrictHostKeyChecking=no`), completely suppressing the "Are you sure you want to continue connecting?" TOFU prompt, which is essential for automation scripts.

```bash
ssh-copy-id -f user@host
```

> Normally, `ssh-copy-id` scans the remote `authorized_keys` file and skips keys that are already present to prevent duplication. The `-f` (force) flag overrides this intelligence, blindly appending the key payload regardless of remote state.

```bash
ssh-copy-id -i ~/.ssh/id_rsa.pub -o ProxyJump=bastion_user@bastion_host internal_user@internal_host
```

> This utilizes advanced SSH routing. The command transparently jumps through an external-facing bastion host and drops the public key securely onto an internal, un-routable database server.

## Real-World Scenarios

**Bootstrapping Ansible Control Nodes**

```bash
for ip in $(cat servers.txt); do
  ssh-copy-id -i ~/.ssh/ansible_ed25519.pub -o StrictHostKeyChecking=no ansible@$ip
done
```

> Infrastructure administrators provisioning a new fleet of raw Linux instances use a bash loop wrapped around `ssh-copy-id` to rapidly deploy the master Ansible public key to every node, permanently establishing the password-less SSH trust required for subsequent declarative configuration management.

**Key Rotation and Recovery**

```bash
ssh-copy-id -i ~/.ssh/new_key.pub -o PubkeyAuthentication=no user@host
```

> When a user suspects an old private key is compromised, they generate a new one. By forcing `PubkeyAuthentication=no`, `ssh-copy-id` ignores the old compromised key and relies strictly on a password login to authorize the injection of the newly generated key.

## When should it NOT be used?

- **Massive Cloud-Native Deployments (AWS/GCP/Azure):** **Reason:** Relying on interactive `ssh-copy-id` to provision 500 auto-scaled instances is physically impossible. **Use instead:** Inject public keys natively via Cloud-Init `user-data` scripts or Terraform instance metadata during the boot process.
- **Enterprise Identity Management:** **Reason:** Distributing hundreds of static public keys to thousands of servers creates an unauditable management nightmare. **Use instead:** OpenSSH Certificate Authorities (SSH CA). You sign the user's key once, and the server implicitly trusts the CA signature, eliminating the need to copy keys entirely.

## Alternatives

- **Manual SSH Piping:** `cat ~/.ssh/id_rsa.pub | ssh user@host "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"`. **Tradeoff:** This is the manual equivalent of what `ssh-copy-id` does, but lacks the safety checks for duplicate keys, correct `chmod` permission assertions, and SELinux context restoration.
- **Ansible (`ansible.posix.authorized_key`):** Declarative key management. **Tradeoff:** Ansible enforces the exact desired state of the `authorized_keys` file (even removing unauthorized keys), whereas `ssh-copy-id` is strictly an imperative append-only tool.

## How it works internally

`ssh-copy-id` is not a compiled C binary; it is a POSIX shell script shipped with the OpenSSH client package.

When executed, it first determines which keys to use (either via `-i` or by scanning `~/.ssh/`). It then attempts an initial, silent SSH connection to the remote host utilizing those keys. If the remote host accepts the connection without asking for a password, `ssh-copy-id` assumes the keys are already installed and exits cleanly.

If the keys are rejected, the script packages a highly sophisticated remote command string. It establishes an interactive SSH session (prompting you for the password). Over this connection, it executes `sh -c` on the remote server, executing a payload that:

1. Creates the `~/.ssh` directory if missing (`mkdir -p`).
2. Applies strict permissions (`chmod 700 ~/.ssh`).
3. Evaluates the existing `authorized_keys` file.
4. Appends the new keys (bypassing duplicates unless `-f` is used).
5. Applies strict file permissions (`chmod 600 ~/.ssh/authorized_keys`).
6. Attempts to restore SELinux contexts (`restorecon`) if SELinux is actively enforcing policies on the remote box.

## Performance Notes

- Execution is bottlenecked entirely by network latency and interactive password typing.
- If the target host is experiencing extreme SSH latency (e.g., DNS resolution delays on the SSH daemon), the script will hang synchronously during the payload transfer phase.

## Security Notes

- **Trust On First Use (TOFU) Vulnerability:** If you run `ssh-copy-id` against a brand-new server and blindly type "yes" to the host key verification prompt without verifying the fingerprint out-of-band, you are susceptible to a Man-in-the-Middle (MitM) attack. An attacker could intercept your password and capture your public key.
- **Identity File Precedence:** If you omit `-i`, `ssh-copy-id` might push your `id_rsa`, `id_ecdsa`, and `id_ed25519` keys all at once. This pollutes remote servers with excessive authorized keys and expands your cryptographic attack surface. Always specify explicitly using `-i`.

## Common Mistakes

- **Providing the Private Key path:** Running `ssh-copy-id -i ~/.ssh/id_rsa user@host`. **Why it's wrong:** While the script is smart enough to usually append `.pub` and find the public counterpart, explicitly pointing to the private key can cause confusion or errors if the `.pub` file is missing. Always target the `.pub` file explicitly.
- **Assuming it deletes old keys:** **Why it's wrong:** `ssh-copy-id` is strictly an _append_ operation. If a developer leaves your team, running `ssh-copy-id` for a new developer does absolutely nothing to remove the departed developer's access. You must manually edit the remote file to revoke access.
- **Targeting the wrong user:** Running `ssh-copy-id ubuntu@host` but wanting root access. **Why it's wrong:** The keys are injected strictly into the home directory of the user specified (`/home/ubuntu/.ssh/`). It grants zero access to the `root` user context.

## Best Practices

- Always utilize the `-n` (dry-run) flag before executing against production servers to visually verify exactly which cryptographic strings are about to be authorized.
- Never use standard RSA keys if modern alternatives are available. Generate keys using `ssh-keygen -t ed25519` and explicitly target that `.pub` file with `ssh-copy-id -i` to ensure maximal cryptographic strength.
- If deploying to a highly restricted environment where standard shell execution is blocked (e.g., restricted bash or specific network appliances), append the `-s` flag to force the script to use the SFTP subsystem to transfer the payload.

## Interview Questions

**Q:** You run `ssh-copy-id -i mykey.pub user@server`. The command succeeds, but when you type `ssh user@server`, it still prompts for a password. What strict security requirement of the remote `sshd` daemon is likely causing this failure, even though the key is in the file?
**A:** The OpenSSH daemon enforces "Strict Modes" by default. If the remote user's home directory (`/home/user/`), the `.ssh` directory, or the `authorized_keys` file are writable by anyone other than the exact user (e.g., `chmod 777`), the `sshd` daemon will silently ignore the `authorized_keys` file entirely to prevent privilege escalation. The permissions must be `755` or `700` for directories, and `600` for the key file.
**Q:** What is the functional difference between executing `ssh-copy-id user@host` and forcefully overriding the process by running `cat ~/.ssh/id_rsa.pub | ssh user@host "cat >> ~/.ssh/authorized_keys"`?
**A:** The manual `cat` piping method is crude and dangerous. It blindly appends the key, resulting in duplicates if run multiple times. Crucially, if the `.ssh` directory does not exist, or possesses the wrong permissions, the manual command will fail or result in a silent rejection by the SSH daemon. `ssh-copy-id` intelligently checks for existing duplicate keys, creates missing directories, and mathematically enforces the correct `chmod 700` and `600` permissions required for success.
**Q:** A security policy mandates that administrators cannot use standard shell commands over SSH. How can you still use `ssh-copy-id` to transfer public keys to the remote host?
**A:** You must utilize the `-s` flag (`ssh-copy-id -s user@host`). This forces the underlying transport mechanism to bypass executing standard shell commands (like `mkdir` and `cat`) over the SSH TTY, and instead utilizes the SFTP (Secure File Transfer Protocol) subsystem to place the payload directly.

## Practice Problems

**Problem:** Securely install the specific public key located at `~/.ssh/deploy_ed25519.pub` onto a remote server at `10.0.5.50` for the user `appadmin`, listening on custom port `2222`.
**Hint:** Combine the identity file flag with the custom port flag and the connection string.
**Solution:** `ssh-copy-id -i ~/.ssh/deploy_ed25519.pub -p 2222 appadmin@10.0.5.50` (This surgically targets the non-standard environment with the explicit key).
**Problem:** You need to script the deployment of an SSH key to a newly booted server, but the command keeps failing because the server prompts "Are you sure you want to continue connecting (yes/no)?". How do you bypass this?
**Hint:** You must pass raw SSH configuration options to disable strict host key checking natively through the copy utility.
**Solution:** `ssh-copy-id -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa.pub root@target-server` (This injects the ssh option directly, suppressing the TOFU prompt for automated execution).

## References

- [OpenSSH Manual Pages - ssh-copy-id](https://man.openbsd.org/ssh-copy-id.1)
- [DigitalOcean - How to Set Up SSH Keys](https://www.digitalocean.com/community/tutorials/how-to-set-up-ssh-keys-on-ubuntu-20-04)
