---
slug: git-clone
name: git clone
aliases: []
category: git
tags:
  - git-clone
difficulty: beginner
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
  - download git repository
  - copy repo from github
  - get source code
  - initialize local repository from remote
  - clone git branch
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git clone` is a foundational Git command used to target an existing repository and create a fully functional local copy (a clone) of it. By default, it retrieves all files, historical commits, branches, and tags from the remote source. It automatically configures a remote tracking connection (usually named `origin`), pointing back to the original repository, which enables seamless subsequent operations like fetching, pulling, and pushing.

## Why does it exist?

Unlike centralized version control systems (like SVN) that require constant network connectivity to check out a single snapshot of a working directory, Git is a distributed system. Every developer needs a complete, self-contained history of the project locally to perform operations like branching, committing, and logging without network latency. `git clone` exists to orchestrate the complex sequence of creating a new `.git` directory, fetching the entire packfile of objects from a remote server, and checking out the default branch into the working tree in a single, atomic command.

## Syntax

```bash
git clone [options] [--] <repository> [<directory>]
```

## Flags

| Flag                     | Description                                                                                                                          | Example                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `--bare`                 | Creates a bare Git repository. It copies the version control history but omits the working directory. Used for centralized servers.  | `git clone --bare <url>`                    |
| `--mirror`               | Sets up a mirror of the source repository. Implies `--bare` but also maps all remote branches and tags directly to local references. | `git clone --mirror <url>`                  |
| `-b`, `--branch <name>`  | Instead of pointing the newly created HEAD to the default branch, points it to the specified branch or tag.                          | `git clone -b v2.0 <url>`                   |
| `--single-branch`        | Clones only the history leading to the tip of a single branch, either the default or the one specified by `-b`.                      | `git clone --single-branch <url>`           |
| `--depth <depth>`        | Creates a "shallow clone" with a history truncated to the specified number of commits. Implies `--single-branch`.                    | `git clone --depth 1 <url>`                 |
| `--shallow-since=<date>` | Creates a shallow clone containing only commits made after the specified time.                                                       | `git clone --shallow-since="1 year" <url>`  |
| `--recurse-submodules`   | After the clone is created, automatically initializes and clones submodules within based on the repository's `.gitmodules`.          | `git clone --recurse-submodules <url>`      |
| `-j`, `--jobs <n>`       | Specifies the number of submodules to fetch simultaneously. Requires `--recurse-submodules`.                                         | `git clone --recurse-submodules -j 8 <url>` |
| `--filter=<filter-spec>` | Uses partial cloning to request that the server sends only a subset of reachable objects (e.g., omitting large blobs).               | `git clone --filter=blob:none <url>`        |
| `--sparse`               | Initializes a sparse-checkout file so the working directory starts with only the files in the root of the repository.                | `git clone --sparse <url>`                  |
| `-o`, `--origin <name>`  | Instead of using the default remote name `origin` to keep track of the upstream repository, uses the provided `<name>`.              | `git clone -o upstream <url>`               |

## Examples

```bash
git clone [https://github.com/torvalds/linux.git](https://github.com/torvalds/linux.git)
```

> Performs a standard clone of the Linux kernel repository. This creates a directory named `linux` in the current working directory, initializes a `.git` folder inside it, downloads the entire project history, and checks out the default branch (usually `master` or `main`).

```bash
git clone git@github.com:torvalds/linux.git linux-source
```

> Clones the repository using the SSH protocol (which utilizes local SSH keys for authentication) and explicitly specifies `linux-source` as the name of the destination directory instead of defaulting to `linux`.

```bash
git clone --depth 1 [https://github.com/kubernetes/kubernetes.git](https://github.com/kubernetes/kubernetes.git)
```

> Performs a shallow clone, fetching only the absolute latest commit of the default branch. This skips downloading years of history, turning a multi-gigabyte download into a fast, megabyte-sized fetch. Ideal for CI/CD environments.

```bash
git clone -b release-1.4 --single-branch [https://github.com/org/repo.git](https://github.com/org/repo.git)
```

> Instructs Git to only download the history relevant to the `release-1.4` branch. Without `--single-branch`, Git would download the commit history for _all_ branches, even though it checks out `release-1.4` at the end.

```bash
git clone --recurse-submodules -j 4 [https://github.com/neovim/neovim.git](https://github.com/neovim/neovim.git)
```

> Clones the main repository and immediately parses the `.gitmodules` file to clone all nested dependencies (submodules). The `-j 4` flag parallelizes this process across 4 threads, drastically speeding up the download for complex projects.

## Real-World Scenarios

**CI/CD Pipeline Optimization**

```bash
git clone --depth 1 --branch main [https://github.com/company/app.git](https://github.com/company/app.git) workspace
```

> In automated build environments like Jenkins or GitHub Actions, full project history is rarely needed. DevOps engineers use shallow clones to pull only the latest commit. This reduces bandwidth consumption, speeds up the build step, and minimizes disk usage on ephemeral build runners.

**Handling Massive Monorepos (Partial Clone)**

```bash
git clone --filter=blob:none [https://github.com/company/monorepo.git](https://github.com/company/monorepo.git)
```

> When working with repositories containing gigabytes of historical assets, developers use partial clones (`blob:none`). Git downloads the commit graph and tree structure, but defers downloading the actual file contents (blobs) until the moment a specific file is checked out or needed. This makes cloning massive repositories nearly instantaneous.

**Repository Migration / Backup**

```bash
git clone --mirror git@gitlab.com:old-org/legacy-app.git
```

> When migrating a repository from GitLab to GitHub, an administrator uses a mirror clone. This creates a bare repository that maps all remote branches, tags, and refs identically. The admin can then `git push --mirror` to the new GitHub remote, guaranteeing a perfect 1:1 copy.

## When should it NOT be used?

- **Updating an existing local repository:** **Do not use `git clone` if you already have the repository locally.** `git clone` will fail if the destination directory already exists and is not empty. Use `git fetch` or `git pull` to sync an existing local repository with its remote counterpart.
- **Downloading a single file:** **Do not clone an entire repository to get one script.** Fetching a 2GB history just to read a `README.md` or a `docker-compose.yml` is highly inefficient. Use raw HTTP endpoints (like GitHub's "Raw" button) via `curl` or `wget` instead.
- **Starting a completely new project:** **Do not use `git clone` if you are writing new code from scratch.** If there is no existing repository to copy from, you should use `git init` in your project directory to establish a fresh, empty Git repository.

## Alternatives

- **`git init` + `git remote add` + `git fetch`:** **Best for advanced repository setup.** `git clone` is essentially a wrapper around these three commands. Doing this manually is required if you need to configure specific remote fetch settings or apply sparse-checkout rules _before_ Git downloads any objects from the server.
- **`wget` / `curl` (Source Tarballs):** **Best for pure execution/compilation.** If a user only wants to compile or run the software without contributing back or tracking version history, downloading a `.tar.gz` or `.zip` release archive is faster and requires no Git installation.
- **`svn checkout`:** **Subversion's equivalent.** It fetches only a specific directory at a specific revision, inherently relying on a centralized architecture rather than downloading the entire repository graph.

## How it works internally

When `git clone` is executed, it first creates a new directory and initializes a `.git` structure inside it. It then adds the target URL as a remote named `origin` (updating `.git/config`).

Next, Git initiates a connection to the remote server using the specified transport protocol (SSH, HTTP(S), or git://). The local client and remote server engage in a "packfile negotiation" process. The server calculates the directed acyclic graph (DAG) of commits, trees, and blobs required by the client, compresses them into a single binary file called a packfile, and streams it over the network.

Once the packfile is received and indexed locally into `.git/objects/pack`, Git creates remote-tracking branches (e.g., `refs/remotes/origin/main`) to reflect the server's state. Finally, Git resolves the active branch (usually `HEAD` from the remote) and performs a checkout, extracting the blobs (file contents) from the compressed objects and writing them to the file system as your working directory.

## Performance Notes

- **Shallow Clones Decrease I/O:** Using `--depth 1` drastically cuts down on the packfile size generated by the server and downloaded by the client. However, be aware that subsequent `git fetch` or `git push` operations from a shallow clone can be computationally expensive for the server, as it must calculate complex deltas.
- **Submodule Concurrency:** By default, submodules are cloned sequentially. Appending `-j 8` (or another number representing CPU cores/network streams) parallelizes the fetching of submodule packfiles, drastically reducing the total clone time for projects with numerous dependencies.

## Security Notes

- **Credential Exposure in URLs:** Avoid embedding passwords directly in HTTP/HTTPS URLs (e.g., `git clone https://user:password@github.com/...`). These URLs are stored locally in `.git/config` in plaintext and can easily be exposed via screen sharing or accidental backups. Use SSH keys or a credential manager (like Git Credential Manager) instead.
- **Malicious Git Hooks:** While a standard `git clone` does not automatically copy server-side hooks to the local `.git/hooks/` directory, cloning a repository from an untrusted source can still be dangerous if the repository exploits a CVE in Git's checkout phase. Always ensure your Git client is updated to patch known vulnerabilities.
- **Path Traversal Vulnerabilities:** Historically, older Git clients were vulnerable to arbitrary file overwrite attacks during the checkout phase of a clone if the remote repository crafted malicious tree objects (e.g., using symlinks or `../` paths).

## Common Mistakes

- **Cloning inside an existing Git repository**
  - _Mistake:_ Running `git clone` inside a directory that is already tracked by Git.
  - _Why:_ This creates a nested repository. The outer repository will track the folder as a Git submodule (often improperly) or as an untracked directory, leading to severe confusion when trying to stage or commit files.
- **Forgetting to clone submodules**
  - _Mistake:_ Cloning a complex project with a basic `git clone <url>` and wondering why build scripts fail complaining about empty directories.
  - _Why:_ Git does not automatically clone submodules. You must pass `--recurse-submodules` during the initial clone, or run `git submodule update --init --recursive` afterward to fetch the missing code.
- **Trying to "push" to a read-only HTTP clone**
  - _Mistake:_ Cloning via `https://github.com/user/repo.git` instead of `git@github.com:user/repo.git` and getting authentication errors when trying to push later.
  - _Why:_ While HTTPS supports pushing, it requires generating Personal Access Tokens (PATs) on most modern Git hosts. SSH is generally preferred for seamless, key-based developer authentication.

## Best Practices

- **Use SSH for Write-Access Repositories:** Always prefer the `git@...` (SSH) URL format over HTTPS if you intend to push commits back to the repository. It integrates smoothly with `ssh-agent` and avoids repeated credential prompts.
- **Leverage Single Branch for Hotfixes:** If you only need to hotfix an old release on a massive repository, use `git clone --single-branch --branch v2.1.0 <url>` to avoid downloading thousands of commits from unrelated, active development branches.
- **Avoid Bare Clones for Development:** Never use `git clone --bare` unless you are explicitly setting up a Git server or writing a mirroring script. You cannot perform regular file edits or commits in a bare repository because it strictly lacks a working directory.

## Interview Questions

**Q: What is the difference between `git clone` and `git pull`?**
**A:** `git clone` is used to create a completely new local repository from a remote source, establishing the `.git` directory, configuration, and working tree from scratch. `git pull` is used within an _existing_ local repository to fetch new commits from a remote and automatically merge or rebase them into the current active branch.

**Q: Describe what a "bare" clone is and when you would use it.**
**A:** A bare clone (`--bare`) copies the repository's version control data (the contents of the `.git` directory) but does not create a working tree (the actual files you can edit). It is used exclusively for setting up central, remote Git servers that act as a hub for developers to push to and pull from, as pushing to a non-bare repository can corrupt its active checkout.

**Q: How do you clone an exceptionally large repository if you only need the most recent files to run a build?**
**A:** You should execute a shallow clone using the `--depth 1` flag. This instructs Git to only fetch the snapshot of the latest commit for the default branch, ignoring the entire historical graph of previous commits, thereby saving significant time, disk space, and network bandwidth.

## Practice Problems

**Problem:** You need to clone a repository named `api-service` from GitHub, but you want the local folder to be named `backend-api` instead of the default repository name.
**Hint:** The `git clone` command accepts an optional directory parameter at the very end of the command string.
**Solution:**

```bash
git clone [https://github.com/org/api-service.git](https://github.com/org/api-service.git) backend-api
```

**Problem:** You want to clone a repository, but you only care about the code on the `release-v2` branch. You don't want to download the history for `main` or any other branches in order to save time.
**Hint:** Use a combination of a flag to specify the branch and another flag to restrict the fetch to only that specific branch.
**Solution:**

```bash
git clone -b release-v2 --single-branch [https://github.com/org/repo.git](https://github.com/org/repo.git)
```

## References

- [git-clone(1) Manual Page](https://git-scm.com/docs/git-clone)
- [Pro Git Book: Getting a Git Repository](https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository)
- [GitHub Blog: Get up to speed with partial clone and shallow clone](https://github.blog/2020-12-21-get-up-to-speed-with-partial-clone-and-shallow-clone/)
