---
slug: docker-login
name: docker login
aliases: []
category: cloud-cli
tags:
  - docker
  - authentication
  - registry
  - security
  - credentials
difficulty: beginner
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - authenticate docker hub
  - login to docker registry
  - connect to private container registry
  - docker authenticate ecr gcr
  - store docker credentials
relatedCommands:
  - docker-pull
  - docker-push
alternatives: []
status: draft
---

## What is it?

`docker login` is a command-line utility used to authenticate the local Docker daemon against a container registry (such as Docker Hub, AWS ECR, Google Artifact Registry, or a self-hosted Nexus/Harbor instance). It establishes authorized sessions required to pull private images or push local builds to remote repositories.

## Why does it exist?

While public base images can be pulled anonymously, enterprise software and proprietary code must be secured inside private repositories. Registries enforce access controls requiring identity verification before granting read or write operations. `docker login` exists to capture user credentials (or short-lived IAM tokens), validate them against the target registry, and securely store an authentication artifact locally so subsequent `docker pull` and `docker push` commands execute seamlessly without re-prompting for passwords.

## Syntax

```bash
docker login [OPTIONS] [SERVER]
```

## Flags

| Flag               | Description                                                                                      | Example                               |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `-u`, `--username` | Specifies the username used to authenticate against the registry.                                | `docker login -u myuser`              |
| `-p`, `--password` | Specifies the password or access token directly on the command line (insecure).                  | `docker login -u myuser -p Secret123` |
| `--password-stdin` | Reads the password or access token securely from standard input, preventing shell history leaks. | `echo $TOKEN                          | docker login -u admin --password-stdin` |
| `SERVER`           | (Argument) The URL of the target container registry (defaults to Docker Hub).                    | `docker login registry.gitlab.com`    |
| `--help`           | Outputs brief usage documentation and supported command-line options.                            | `docker login --help`                 |

## Examples

```bash
docker login
```

> Without arguments, this command interactively prompts for a username and password, attempting to authenticate against the default public Docker Hub registry (`https://index.docker.io/v1/`).

```bash
docker login ghcr.io
```

> This targets the GitHub Container Registry (`ghcr.io`), prompting interactively for your GitHub username and a Personal Access Token (PAT) required to pull or push private packages.

```bash
echo $AWS_ECR_TOKEN | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
```

> This is standard for AWS deployments. It pipes a securely retrieved, short-lived AWS IAM authentication token via standard input into `docker login`, authenticating against a specific private Elastic Container Registry.

```bash
cat /run/secrets/registry_token | docker login harbor.corp.net -u service-account --password-stdin
```

> This reads a secure token from a CI/CD secret mount file and pipes it into the login command to authenticate against an internal enterprise Harbor registry safely.

## Real-World Scenarios

**Automated CI/CD Pipeline Authentication**

```bash
echo $DOCKER_HUB_PAT | docker login -u $DOCKER_USER --password-stdin
docker push $DOCKER_USER/my-app:v1
```

> Continuous Integration platforms (like Jenkins or GitHub Actions) export secret credentials into environment variables, securely piping them into `docker login` so the automated runner gains authorization to push compiled artifacts to the registry.

**Cloud Provider IAM Integration**

```bash
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
```

> Infrastructure engineers dynamically generate temporary (12-hour) authentication passwords using cloud-native CLI tools (like AWS CLI or GCP `gcloud`) and pipe them directly into Docker to facilitate secure, token-based image management.

## When should it NOT be used?

- **Pulling popular open-source images:** **Reason:** Images like `ubuntu`, `nginx`, or `alpine` on Docker Hub are publicly accessible. Authentication is strictly necessary only for pushing images, pulling private images, or bypassing anonymous API rate limits.
- **Passing plaintext passwords via `-p`:** **Reason:** Using the `-p` flag leaves your plaintext password sitting openly in your shell's `.bash_history` file and visible to any user running `ps aux`. **Use instead:** `--password-stdin` or interactive prompts.

## Alternatives

- **Credential Helpers:** (`docker-credential-ecr-login`, `docker-credential-gcr`). **Tradeoff:** These binaries intercept Docker authentication requests and fetch IAM credentials on-the-fly entirely bypassing the need to run manual `docker login` commands.
- **Podman Login:** Daemonless alternative. **Tradeoff:** `podman login` manages registry authentication identically but stores credentials in isolated user-specific JSON files without requiring a root daemon.

## How it works internally

When you execute `docker login`, the CLI initiates a TLS connection to the target registry's `v2/` API endpoint.

It submits the provided credentials (usually via HTTP Basic Authentication) to verify identity. If the registry responds with a `200 OK` or issues an OAuth bearer token, authentication is successful.

Crucially, Docker then must store these credentials for future use. If a **Credential Helper** (like macOS Keychain, Windows Credential Manager, or `pass`) is configured in `~/.docker/config.json`, the CLI encrypts and delegates the credential storage to that secure OS-level vault. If no helper is configured, Docker falls back to storing the authorization artifact (the username and password joined by a colon and Base64 encoded) directly in plaintext inside `~/.docker/config.json`. Subsequent `pull` or `push` commands automatically read this file to inject authorization headers into their API requests.

## Performance Notes

- `docker login` executes instantly, bounded only by the network latency of the HTTP TLS handshake with the remote registry authentication server.
- Large `config.json` files containing dozens of stale registry logins can trivially slow down authentication lookups during multi-registry pull operations.

## Security Notes

- **The Base64 Plaintext Danger:** By default on standard Linux installations without a credential helper, Docker stores your password in `~/.docker/config.json` encoded purely in Base64 (which is _not_ encryption). Anyone with read access to this file can trivially decode and steal your registry password.
- **Personal Access Tokens (PATs):** Never use your actual account password for `docker login`. Always generate a scoped Personal Access Token (PAT) from your registry provider that only possesses read/write permissions for specific repositories and can be revoked independently.

## Common Mistakes

- **Using `-p` in shell scripts:** Writing `docker login -u user -p myP@ssword`. **Why it's wrong:** The password is saved in `~/.bash_history` and is visible in the process table. Use `echo "myP@ssword" | docker login -u user --password-stdin`.
- **Assuming login applies globally across users:** Running `sudo docker login` and then trying to push as a standard user. **Why it's wrong:** The `config.json` auth file is stored in the home directory of the user executing the command. `sudo` stores it in `/root/.docker/`, leaving the standard user unauthenticated.
- **Forgetting the registry URL for custom registries:** Running `docker login -u user` when trying to log into GitLab. **Why it's wrong:** Docker defaults to Docker Hub. You must specify the custom registry URL (e.g., `docker login registry.gitlab.com`).

## Best Practices

- Always configure a secure credential helper (`pass`, `secretservice`, or OS native keystores) in `~/.docker/config.json` to prevent the CLI from storing credentials in reversible Base64 format on disk.
- Use `docker logout <server>` to explicitly destroy stored credentials when finishing administrative tasks on shared workstations to prevent credential hijacking.
- Integrate cloud-native credential helpers (like `amazon-ecr-credential-helper`) on production servers to completely eliminate the need for static, long-lived authentication tokens.

## Interview Questions

- _Query:_ If you run `docker login` without a credential helper on a standard Linux machine, how and where does Docker store your credentials?
  - _A:_ Docker stores the credentials in a JSON file located at `~/.docker/config.json`. The username and password are concatenated and encoded in Base64 (stored under the `auth` key). This is highly insecure as Base64 is not encryption and is trivially decoded.
- _Query:_ Why is `--password-stdin` heavily enforced in CI/CD environments instead of using the `-p` flag?
  - _A:_ The `-p` flag passes the password as a command-line argument, meaning it is exposed in plaintext to the operating system's process table (visible via `ps` or `top`) and logged in terminal history. `--password-stdin` streams the password securely via standard input, keeping it entirely out of process arguments and shell logs.
- _Query:_ If you authenticate to an AWS ECR registry using an IAM-generated token via `docker login`, why might a deployment fail if executed 14 hours later?
  - _A:_ AWS ECR authentication tokens generated via `aws ecr get-login-password` are temporary and expire after 12 hours. The stored token in Docker's configuration file becomes invalid, requiring a fresh token generation and a new `docker login` execution.

## Practice Problems

- _Problem:_ Authenticate against the GitHub Container Registry (`ghcr.io`) using the username `dev-bot` while securely passing a token stored in the environment variable `$GH_TOKEN`.
  - _Hint:_ Use `echo` to pipe the variable into the command and utilize the stdin password flag.
  - _Solution:_ `echo $GH_TOKEN | docker login ghcr.io -u dev-bot --password-stdin` (This securely authenticates against a non-default registry without exposing the token in process tables).
- _Problem:_ Connect interactively to a private corporate registry hosted at `harbor.internal.net`.
  - _Hint:_ Invoke the login command with the target server URL without explicit credential flags.
  - _Solution:_ `docker login harbor.internal.net` (This will interactively prompt your terminal for the required username and password to authenticate against the Harbor instance).

## References

- [Docker CLI Reference - docker login](https://docs.docker.com/engine/reference/commandline/login/)
- [Docker Documentation - Credential Store Configuration](https://docs.docker.com/engine/reference/commandline/login/#credentials-store)
