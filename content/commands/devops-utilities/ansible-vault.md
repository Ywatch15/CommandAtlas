---
slug: ansible-vault
name: ansible-vault
aliases: []
category: devops-utilities
tags: [ansible, vault, security, encryption, secrets, credentials]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'encrypt ansible secret files'
  - 'decrypt sensitive yaml data'
  - 'view encrypted vault file'
  - 'edit ansible vault password'
  - 'encrypt string for playbook'
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`ansible-vault` is a cryptographic utility built into Ansible used to encrypt sensitive data—such as passwords, API keys, and certificates—so they can be safely stored alongside playbooks in version control systems. It provides symmetric AES-256 encryption for YAML files and individual strings.

## Why does it exist?

Infrastructure automation code must frequently handle sensitive secrets (like database master passwords and cloud credentials). Storing these secrets in plaintext inside Git repositories represents a catastrophic security vulnerability. `ansible-vault` exists to bridge this operational gap, allowing teams to encrypt confidential variable files securely while enabling Ansible to decrypt them transparently at runtime during playbook execution.

## Syntax

```bash
ansible-vault <command> [options] <file>
ansible-vault encrypt <file.yml>
ansible-vault decrypt <file.yml>
ansible-vault edit <file.yml>
ansible-vault view <file.yml>
```

## Flags

| Flag                               | Description                                                                               | Example                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `--vault-password-file <path>`     | Specifies a file containing the vault decryption password, bypassing interactive prompts. | `ansible-vault encrypt secret.yml --vault-password-file .pass`      |
| `--new-vault-password-file <path>` | Specifies a new password file when rekeying or changing an encrypted file's password.     | `ansible-vault rekey secret.yml --new-vault-password-file .newpass` |
| `--encrypt-vault-id <id>`          | Specifies a particular vault ID when managing multiple encryption keys.                   | `ansible-vault encrypt secret.yml --encrypt-vault-id prod`          |
| `--ask-vault-pass`                 | Prompts interactively for the vault decryption password on the command line.              | `ansible-vault view secret.yml --ask-vault-pass`                    |
| `-v`, `--verbose`                  | Increases output verbosity for debugging cryptographic operations.                        | `ansible-vault encrypt secret.yml -v`                               |
| `--help`                           | Outputs brief usage documentation and supported command options.                          | `ansible-vault --help`                                              |
| `--version`                        | Displays version information and cryptographic library details.                           | `ansible-vault --version`                                           |
| `--output <path>`                  | Writes the encrypted or decrypted output to a specified destination file path.            | `ansible-vault encrypt secret.yml --output enc_secret.yml`          |
| `--unversioned`                    | Omits the header version tag when encrypting raw non-YAML binary files.                   | `ansible-vault encrypt key.pem --unversioned`                       |

## Examples

```bash
ansible-vault encrypt group_vars/production/vault.yml
```

> This interactively prompts you for a secure password and encrypts the target YAML file in-place using AES-256 encryption, replacing plaintext contents with ciphertext headers.

```bash
ansible-vault view group_vars/production/vault.yml --ask-vault-pass
```

> This decrypts and prints the contents of an encrypted vault file directly to your terminal screen for temporary inspection without permanently altering the file on disk.

```bash
ansible-vault edit group_vars/production/vault.yml
```

> This opens the encrypted vault file inside your default terminal text editor ($EDITOR), automatically decrypting it into a temporary buffer and re-encrypting it upon save.

```bash
ansible-vault decrypt group_vars/production/vault.yml
```

> This permanently removes encryption from the target file, reverting it back to standard plaintext YAML (use with caution).

```bash
ansible-vault encrypt_string 'SuperSecretPassword123' --name 'db_password'
```

> This generates an inline encrypted string block representing the secret value, which can be copied and pasted directly into regular, unencrypted playbook variable files.

## Real-World Scenarios

**Securing Production Database Credentials in Git Repositories**

```bash
ansible-vault encrypt vars/production.yml --vault-password-file ~/.vault_pass
```

> DevOps engineers encrypt sensitive environment configuration files containing production API keys and database tokens, allowing the encrypted files to be safely committed to shared Git repositories.

**Inline Secret Management for Shared Playbooks**

```bash
ansible-vault encrypt_string 'MySecretAPIKey' --name 'api_token'
```

> Developers embedding occasional secrets into otherwise public playbooks use `encrypt_string` to generate secure ciphertext blobs, avoiding the overhead of creating separate dedicated vault files.

**Collaborative Team Secret Management via Password Files**

```bash
ansible-playbook site.yml --vault-password-file .vault_pass
```

> Development teams share a common encrypted password file or integrate vault password files into secure CI/CD secret stores (like GitHub Actions Secrets) to automate unattended playbook runs.

## When should it NOT be used?

- **Enterprise dynamic secrets management requiring automatic rotation:** **Reason:** Ansible Vault uses static symmetric keys stored in files or environment variables; it lacks native dynamic lease generation and automatic secret rotation capabilities. **Use instead:** HashiCorp Vault or AWS Secrets Manager.
- **Storing massive multi-gigabyte binary datasets:** **Reason:** Vault is engineered for encrypting lightweight configuration files and strings; encrypting huge binaries degrades performance and bloats Git history. **Use instead:** Git LFS or encrypted cloud storage buckets.

## Alternatives

- `sops` (Mozilla): Encrypts files with AWS KMS, GCP KMS, or PGP. **Tradeoff:** `sops` supports granular multi-user key management and cloud KMS integration, whereas `ansible-vault` relies on simple shared symmetric passwords or password files.
- `git-crypt`: Transparent file encryption inside Git. **Tradeoff:** `git-crypt` encrypts files transparently upon commit, but lacks Ansible-specific features like inline string encryption (`encrypt_string`).

## How it works internally

`ansible-vault` utilizes the Python cryptography library to apply **AES-256 (Advanced Encryption Standard)** symmetric encryption in CBC mode with PKCS7 padding.

When you encrypt a file, `ansible-vault` derives a cryptographic key from your master password using PBKDF2 (Password-Based Key Derivation Function 2) combined with a cryptographically secure random salt. It prepends a structured header containing the cipher identification (`$ANSIBLE_VAULT;1.1;AES256`), the salt, and initialization vectors to the cipher text block.

When `ansible-playbook` executes against an encrypted vault file, it reads the header, prompts for or loads the password, reconstructs the PBKDF2 key, decrypts the ciphertext payload back into memory as a temporary JSON/YAML data structure during runtime, and discards the decrypted plaintext from memory immediately after task execution.

## Performance Notes

- Cryptographic derivation and decryption overhead is negligible during playbook execution, adding only a few milliseconds of initialization latency per encrypted variable file.
- Committing encrypted vault files to Git instead of plaintext prevents storage bloating and allows efficient delta compression of minor configuration changes.

## Security Notes

- **Password File Protection:** Storing the plaintext vault password inside a file (`.vault_pass`) on a shared or compromised server completely defeats the security of the encryption. Ensure strict file permissions (`chmod 600`) on all password files.
- **Memory Footprint Leaks:** While plaintext secrets are discarded from memory after task execution, verbose debugging flags (`-vvvv`) can inadvertently dump decrypted variables into local terminal logs or CI console outputs.

## Common Mistakes

- **Committing plaintext vault passwords to Git:** Storing `.vault_pass` inside the root of the repository without adding it to `.gitignore`. **Why it's wrong:** Anyone who clones the repository can instantly decrypt all your vault files, rendering the encryption entirely useless.
- **Forgetting to lock down file permissions:** Leaving encrypted password files world-readable. **Why it's wrong:** Other local system users can harvest the decryption key and compromise all production secrets.
- **Editing vault files with standard tools without decryption:** Opening an encrypted file directly in Vim or Nano without using `ansible-vault edit`. **Why it's wrong:** You will see raw ciphertext headers and binary garbage; saving changes directly will corrupt the vault structure.

## Best Practices

- Always add your local vault password files (e.g., `.vault_pass`) to your project's `.gitignore` file immediately to prevent accidental public exposure.
- Enforce strict file permissions (`chmod 600`) on all sensitive password files and keys used for cryptographic decryption.
- Prefer inline encrypted strings (`ansible-vault encrypt_string`) for isolated secrets within public playbooks, keeping global configuration files clean.

## Interview Questions

- _Query:_ What cryptographic algorithm and derivation function does `ansible-vault` use under the hood to secure data files?
  - _A:_ `ansible-vault` uses **AES-256** symmetric encryption in CBC mode to secure file payloads, paired with **PBKDF2** (Password-Based Key Derivation Function 2) with a secure random salt to derive cryptographic keys safely from user-supplied passwords.
- _Query:_ What is the functional difference between using `ansible-vault edit` versus opening an encrypted vault file with a standard text editor like Vim?
  - _A:_ `ansible-vault edit` automatically decrypts the file into a temporary secure buffer, opens your designated `$EDITOR`, and re-encrypts the file back to ciphertext upon save. Opening an encrypted file directly with Vim displays raw ciphertext headers and unreadable binary blocks, which will corrupt the file if edited and saved directly.
- _Query:_ Why is storing the plaintext vault password file inside an unencrypted Git repository a critical security anti-pattern?
  - _A:_ The security of Ansible Vault encryption relies entirely on keeping the decryption password secret. If the password file is committed to Git, any user who clones the repository obtains both the encrypted vault files and the key to decrypt them, completely negating the security protection.

## Practice Problems

- _Problem:_ Encrypt a sensitive configuration file named `secrets.yml` using `ansible-vault` with an interactive password prompt.
  - _Hint:_ Use the encrypt subcommand followed by the target file path.
  - _Solution:_ `ansible-vault encrypt secrets.yml` (This prompts for a password and transforms the plaintext YAML file into secure AES-256 ciphertext in-place).
- _Problem:_ Generate an inline encrypted string for the database password `P@ssw0rd99` tagged with the variable name `db_pass`.
  - _Hint:_ Use the encrypt-string subcommand combined with the variable name flag.
  - _Solution:_ `ansible-vault encrypt_string 'P@ssw0rd99' --name 'db_pass'` (This outputs a secure ciphertext block that can be safely pasted directly into unencrypted playbook variable files).

## References

- [Ansible Documentation - Protecting Sensitive Data with Ansible Vault](https://docs.ansible.com/ansible/latest/user_guide/vault.html)
- [Ansible Documentation - Encrypting Content with Ansible Vault](https://docs.ansible.com/ansible/latest/vault_guide/index.html)
