---
slug: ssh-keygen
name: ssh-keygen
aliases: []
category: ssh
tags: [ssh, cryptography, security, keys, authentication, pki]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'generate ssh key pair'
  - 'create ed25519 key'
  - 'remove host from known_hosts'
  - 'change ssh key password'
  - 'find public key fingerprint'
relatedCommands: []
alternatives: []
status: draft
---

## What is it?

`ssh-keygen` is a versatile cryptographic command-line tool bundled with OpenSSH. It is primarily used to generate, manage, and convert authentication key pairs (public and private keys) for secure shell (SSH) connections. Beyond simple generation, it acts as a robust PKI utility for modifying passphrases, hashing `known_hosts` files, and issuing or verifying SSH Certificates.

## Why does it exist?

Secure network communication requires robust asymmetric cryptography to eliminate the reliance on brittle, guessable passwords. The OpenSSH protocol requires highly specific key formats, header structures, and entropy standards. `ssh-keygen` exists to abstract the immense mathematical complexity of cryptographic libraries (like OpenSSL or LibreSSL) into a simple, standardized CLI. It guarantees that keys are securely generated utilizing system entropy (`/dev/urandom`), correctly formatted (e.g., PEM, RFC4716, or OpenSSH format), and safely serialized to the disk.

## Syntax

```bash
ssh-keygen -t type [-b bits] [-C comment] [-f output_keyfile] [options]
ssh-keygen -R hostname [options]
ssh-keygen -l [-f input_keyfile] [options]
```

## Flags

| Flag              | Description                                                                                  | Example                                    |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `-t <type>`       | Specifies the cryptographic algorithm to use (`rsa`, `ed25519`, `ecdsa`, `dsa`).             | `ssh-keygen -t ed25519`                    |
| `-b <bits>`       | Specifies the key size in bits (critical for `rsa`, usually ignored by `ed25519`).           | `ssh-keygen -t rsa -b 4096`                |
| `-C <comment>`    | Embeds a plaintext comment (often an email address) into the public key for identification.  | `ssh-keygen -C "user@corp.com"`            |
| `-f <file>`       | Explicitly sets the output filename for the generated key (bypassing interactive prompts).   | `ssh-keygen -f ~/.ssh/gitlab_key`          |
| `-N <passphrase>` | Provides the new passphrase non-interactively (use `""` for no passphrase).                  | `ssh-keygen -N "" -f my_key`               |
| `-p`              | Requests changing the passphrase of an existing private key file.                            | `ssh-keygen -p -f ~/.ssh/id_rsa`           |
| `-y`              | Reads a private OpenSSH format file and outputs the corresponding public key to stdout.      | `ssh-keygen -y -f ~/.ssh/id_rsa`           |
| `-R <hostname>`   | Removes all keys belonging to a specific hostname or IP from the `known_hosts` file.         | `ssh-keygen -R 192.168.1.5`                |
| `-l`              | Prints the cryptographic fingerprint of a specified public key file.                         | `ssh-keygen -l -f ~/.ssh/id_rsa.pub`       |
| `-a <rounds>`     | Specifies the number of Key Derivation Function (KDF) rounds for encrypting the private key. | `ssh-keygen -a 100 -t ed25519`             |
| `-s <ca_key>`     | Instructs the tool to act as a Certificate Authority, signing a user or host public key.     | `ssh-keygen -s ca_key -I cert_id user.pub` |

## Examples

```bash
ssh-keygen -t ed25519 -C "admin@production"
```

> This generates a modern, highly secure Ed25519 elliptic curve key pair. It embeds the comment "admin@production" into the public key, making it easy to identify when pasted alongside hundreds of other keys in a remote `authorized_keys` file.

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/legacy_server_key -N ""
```

> This is a standard automation pattern. It generates a 4096-bit RSA key (necessary for legacy servers lacking modern curve support), writes it to an explicit file path (`-f`), and forces the passphrase to be completely empty (`-N ""`), requiring zero human interaction.

```bash
ssh-keygen -R github.com
```

> When GitHub rotates their host keys, connections instantly fail with a terrifying "REMOTE HOST IDENTIFICATION HAS CHANGED" warning. This surgical command scrubs all existing, cached fingerprints for `github.com` from your `~/.ssh/known_hosts` file, allowing you to accept the new key cleanly.

```bash
ssh-keygen -y -f ~/.ssh/id_ed25519 > ~/.ssh/id_ed25519.pub
```

> If you accidentally delete your public key file (`.pub`), this recovery command reads the cryptographic material from the private key and mathematically derives and reconstructs the OpenSSH-formatted public key string, saving it back to the disk.

```bash
ssh-keygen -p -f ~/.ssh/id_rsa
```

> This initiates an interactive prompt to change the passphrase of an existing private key. It decrypts the key with the old passphrase and re-encrypts it with the new one entirely in memory, without generating a new cryptographic identity.

## Real-World Scenarios

**Hardening KDF Resistance to Brute Force**

```bash
ssh-keygen -o -a 100 -t ed25519 -f ~/.ssh/hardened_key
```

> Security-conscious engineers generate keys using the newer OpenSSH format (`-o`, now default) and explicitly increase the `bcrypt` Key Derivation Function (KDF) rounds to 100 (`-a 100`). If their laptop is stolen, this forces an attacker attempting to brute-force the passphrase to consume massive CPU time per guess, effectively neutralizing offline dictionary attacks.

**Auditing Public Key Strength**

```bash
ssh-keygen -l -f ~/.ssh/authorized_keys
```

> System administrators assessing server security run the fingerprinting flag (`-l`) directly against the server's `authorized_keys` file. `ssh-keygen` iterates through every public key in the file and prints its bit-length and algorithm (e.g., `2048 RSA`, `256 ED25519`), making it trivially easy to spot weak, legacy keys violating compliance policies.

**Issuing Ephemeral SSH Certificates**

```bash
ssh-keygen -s ca_user_key -I "temp-admin" -V +4h -z 1 user_key.pub
```

> In advanced Zero-Trust enterprise architectures, engineers completely abandon `authorized_keys` files. Instead, they use a centralized Certificate Authority key to sign a developer's public key (`-s`), issuing a signed SSH Certificate strictly valid for exactly 4 hours (`-V +4h`). The target servers natively trust the CA, granting access without distributing static public keys.

## When should it NOT be used?

- **Generating SSL/TLS Web Certificates:** **Reason:** `ssh-keygen` manages SSH protocol keys. While it can interact with X.509 formats to some extent, it is completely inappropriate for generating CSRs, self-signed x509 web certificates, or managing PKI chains. **Use instead:** `openssl req` or `certbot`.
- **Symmetric File Encryption:** **Reason:** Private keys are designed for asymmetric authentication. While theoretically possible to abuse for file encryption, it lacks the proper padding schemas and chunking required for payload security. **Use instead:** `age`, `gpg`, or `openssl enc`.

## Alternatives

- **`openssl genpkey`:** The foundational crypto library. **Tradeoff:** Extremely powerful and supports virtually every cryptographic algorithm in existence, but requires vastly more complex syntax and manual formatting to convert the output into a string the OpenSSH daemon can actually understand.
- **`PuTTYgen`:** Windows legacy tool. **Tradeoff:** Designed specifically for generating `.ppk` files used by the Windows PuTTY client. Modern Windows includes native OpenSSH, making `ssh-keygen` the preferred universal standard over proprietary PuTTY formats.

## How it works internally

When you execute `ssh-keygen`, the utility interfaces heavily with the system's cryptographic provider (typically OpenSSL or LibreSSL).

First, it seeds its internal random number generator by reading high-quality entropy directly from the OS kernel via `/dev/urandom` or the `getrandom()` syscall.

If instructed to generate an RSA key (`-t rsa`), it executes rigorous prime number generation, selecting two massive random primes ($p$ and $q$) and computing the modulus $n = pq$. It then establishes the public and private exponents mathematically. If generating Ed25519 (`-t ed25519`), it operates on the twisted Edwards curve, which involves significantly simpler, faster scalar multiplication without the need to hunt for massive primes.

Once the raw mathematical key material is computed, `ssh-keygen` serializes the data into standard formats. It formats the public key as a single-line Base64 string prepended with the algorithm identifier (e.g., `ssh-ed25519 AAAAC3...`). For the private key, it utilizes the `bcrypt` KDF to derive a symmetric encryption key from your supplied passphrase, encrypts the raw private key material using AES or ChaCha20, and writes it to disk wrapped in ASCII armor (`-----BEGIN OPENSSH PRIVATE KEY-----`).

## Performance Notes

- Generating high-bit RSA keys (e.g., `4096` or `8192` bits) is heavily CPU-bound and relies on gathering sufficient system entropy. On headless VMs with low entropy pools, this process can stall or take several seconds.
- Generating Ed25519 keys is computationally trivial and executes in fractions of a millisecond, making it the definitive choice for dynamic, ephemeral key generation in automation scripts.

## Security Notes

- **The RSA-SHA1 Deprecation:** Traditional RSA keys default to using the SHA-1 hashing algorithm for signatures. OpenSSH 8.8+ completely disabled support for RSA-SHA1 signatures due to cryptographic vulnerabilities. To fix connectivity issues, you must upgrade to Ed25519 or force the client to use RSA-SHA2 (via `PubkeyAcceptedKeyTypes`).
- **Passphrase Importance:** Generating a key with no passphrase (`-N ""`) stores the private key on the disk in pure plaintext. If malware, an unauthorized user, or an exposed CI/CD artifact exposes that file, the attacker instantly possesses the identity with zero cryptographic barriers. Always encrypt keys unless they are bound to headless, strict automation runners.
- **File Permissions:** `ssh-keygen` automatically sets the private key file permissions to `0600` (read/write by owner only). If you manually transfer these keys and alter the permissions to be group or globally readable (`0644`), the `ssh` client will vehemently reject the key as "too open" and refuse to authenticate.

## Common Mistakes

- **Overwriting existing keys accidentally:** Running `ssh-keygen` and wildly hitting "Enter" through the prompts. **Why it's wrong:** The tool defaults to saving the file to `~/.ssh/id_rsa`. If you already have a key there, hitting Enter will violently overwrite your existing private key, permanently destroying your access to all remote servers tied to that identity.
- **Confusing the private and public keys:** Sending the private key (`id_rsa`) to a remote administrator. **Why it's wrong:** The private key must _never_ leave your machine. You only ever distribute the `.pub` file (the public key). Exposing the private key compromises the entire identity permanently.
- **Using DSA or ECDSA:** Generating keys with `-t dsa`. **Why it's wrong:** The DSA algorithm is completely broken and deprecated globally. ECDSA (Elliptic Curve DSA) relies on NIST curves with heavily debated, questionable cryptographic origins. The industry consensus is to strictly use Ed25519 or RSA-4096.

## Best Practices

- Universally default to Ed25519 keys (`ssh-keygen -t ed25519`). They are smaller, inherently resistant to side-channel attacks, execute mathematical signatures faster, and avoid the prime-generation vulnerabilities associated with RSA.
- When managing massive fleets, stop distributing `authorized_keys`. Utilize `ssh-keygen -s` to implement an SSH Certificate Authority. It provides granular time-based expiration, strict principal limitations, and eliminates the nightmare of tracking stale static keys when employees leave the company.
- If your `known_hosts` file complains about a mismatched key, _never_ delete the entire file or manually delete lines using a text editor. Use `ssh-keygen -R <hostname>` to safely and automatically scrub the specific corrupt entry without destroying valid cached fingerprints.

## Interview Questions

- _Query:_ A developer accidentally deletes their `id_ed25519.pub` file but still has the encrypted `id_ed25519` private key file. They request a new keypair. Is a new keypair necessary, or can the public key be recovered? How?
  - _A:_ A new keypair is entirely unnecessary. In asymmetric cryptography, the public key can always be mathematically derived directly from the private key material. The developer simply needs to run `ssh-keygen -y -f ~/.ssh/id_ed25519`. The utility will decrypt the private key (prompting for the passphrase if required) and output the perfectly reconstructed public key string to standard output, which can be safely redirected to a new `.pub` file.
- _Query:_ When examining a colleague's terminal, you see them execute `ssh-keygen -R 10.50.0.5`. What exact operational problem are they resolving, and what does this command do to the local filesystem?
  - _A:_ The colleague is resolving a "Remote Host Identification Has Changed" SSH error. This occurs when a server is rebuilt or replaced, causing the remote host's cryptographic fingerprint to mismatch the one cached on the local machine. The `-R` flag commands `ssh-keygen` to securely scan the `~/.ssh/known_hosts` file (including hashed entries) and surgically remove all lines associated with the IP `10.50.0.5`, allowing the user to cleanly accept the new host key on their next connection.
- _Query:_ What is the cryptographic advantage of creating an SSH key using the Ed25519 algorithm over the traditional RSA algorithm?
  - _A:_ Ed25519 utilizes Edwards-curve Digital Signature Algorithm. Cryptographically, it is vastly superior to RSA because it is fundamentally immune to timing side-channel attacks, offers higher security margins with vastly smaller key sizes (256-bit Ed25519 is roughly equivalent to 3000-bit RSA), and mathematical signature generation and verification execute exponentially faster than RSA's prime factorization math.

## Practice Problems

- _Problem:_ Generate a new Ed25519 key pair, explicitly saving it to the path `./temp_deploy_key`, adding the comment "ci-runner", and ensuring the key possesses absolutely no passphrase for automated execution.
  - _Hint:_ Combine the type flag, file output flag, comment flag, and supply an empty string to the passphrase argument.
  - _Solution:_ `ssh-keygen -t ed25519 -f ./temp_deploy_key -C "ci-runner" -N ""` (This generates a highly secure, non-interactive authentication credential perfectly primed for CI/CD pipelines).
- _Problem:_ An external vendor provides you with an `authorized_keys` file containing hundreds of public keys. Print a diagnostic list showing the bit-length, cryptographic algorithm, and fingerprint of every single key in that file to ensure none are using deprecated algorithms like DSA.
  - _Hint:_ Utilize the fingerprint list flag and point it directly at the target file.
  - _Solution:_ `ssh-keygen -l -f authorized_keys` (This iterates through the file, interpreting the base64 data and rendering human-readable cryptographic telemetry for each entry).

## References

- [OpenSSH Manual Pages - ssh-keygen](https://man.openbsd.org/ssh-keygen.1)
- [Mozilla Infosec - OpenSSH Security Guidelines](https://infosec.mozilla.org/guidelines/openssh)
