---
slug: git-init
name: git init
aliases: []
category: git
tags:
  - git-init
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
  - start a new git repository
  - create git repo
  - initialize git in folder
  - turn directory into git repo
  - setup bare git server
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git init` is a foundational command used to create a new, empty Git repository or reinitialize an existing one. It establishes the hidden `.git` subdirectory, which contains the internal metadata, object database, and structural skeleton required for local version control.

## Why does it exist?

Unlike centralized version control systems (like Subversion) that require establishing a connection to a remote server to begin tracking files, Git is distributed. `git init` exists to bootstrap this hermetic tracking environment locally. It allows developers to instantly convert any arbitrary unversioned directory on their filesystem into a fully functional, isolated repository capable of committing snapshots and branching without external dependencies.

## Syntax

```bash
git init [-q | --quiet] [--bare] [--template=<template-directory>]
         [--separate-git-dir <git-dir>] [--object-format=<format>]
         [--ref-format=<format>] [-b <branch-name> | --initial-branch=<branch-name>]
         [--shared[=<permissions>]] [directory]
```

## Flags

| Flag                      | Description                                                                                                                  | Example                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `-q`, `--quiet`           | Suppresses standard output messages, displaying only errors and warnings.                                                    | `git init -q`                                    |
| `--bare`                  | Creates a repository without a working directory, typically used for centralized sharing and pushing.                        | `git init --bare`                                |
| `-b`, `--initial-branch=` | Overrides the default initial branch name (historically `master`) with the specified name.                                   | `git init -b main`                               |
| `--template=`             | Specifies a custom directory from which templates (hooks, configs, excludes) are copied to the new repo.                     | `git init --template=/opt/git-templates`         |
| `--separate-git-dir=`     | Creates the `.git` directory in a completely different filesystem location, placing a text file pointer in the working tree. | `git init --separate-git-dir=/var/repo/proj.git` |
| `--shared[=group]`        | Sets repository permissions to be group-writable, adjusting `core.sharedRepository` in the config.                           | `git init --bare --shared=group`                 |
| `--shared[=all]`          | Sets repository permissions to be globally readable and executable, but not globally writable.                               | `git init --shared=all`                          |
| `--shared=<0xxx>`         | Sets exact octal POSIX permissions for the `.git` directory and its contents.                                                | `git init --shared=0640`                         |
| `--object-format=`        | Specifies the hashing algorithm for the object database (`sha1` or `sha256`).                                                | `git init --object-format=sha256`                |
| `--ref-format=`           | Specifies the storage format for repository references (`files` or `reftable`).                                              | `git init --ref-format=reftable`                 |

## Examples

```bash
git init
```

> This transforms the current working directory into a Git repository by generating a `.git` folder containing the necessary data structures. Existing files in the directory remain untracked until explicitly added.

```bash
git init new-project
```

> This creates a new directory named `new-project` in the current path, navigates into it internally, and initializes a fresh Git repository within it.

```bash
git init -b main
```

> This initializes the repository and immediately sets the active pointer (HEAD) to a branch named `main`, overriding legacy defaults to enforce modern branch naming conventions right at inception.

```bash
git init --bare /srv/git/api.git
```

> This creates a centralized server repository. Because it lacks a working tree, files cannot be checked out or edited directly on the server, making it the required target structure for `git push` operations from developer machines.

```bash
git init --separate-git-dir=~/.dotfiles.git ~
```

> This initializes a repository for managing home directory dotfiles. The actual working tree is the home directory (`~`), but the `.git` repository metadata is cleanly tucked away into `~/.dotfiles.git` to prevent tooling from mistaking the home directory for a standard project repo.

## Real-World Scenarios

**Bootstrapping a local project**

```bash
mkdir web-app && cd web-app && git init
```

> When beginning greenfield development, an engineer creates a directory, initializes it with Git, and immediately creates a `.gitignore` file. This establishes a safe sandbox for versioning before writing the first line of application code.

**Setting up a remote deployment target**

```bash
git init --bare /var/git/production.git
```

> DevOps engineers use this to establish a remote endpoint on a VPS. Developers push code to this bare repository, which triggers a `post-receive` server-side Git hook to automatically compile and deploy the code to a live web directory.

**Standardizing corporate Git hooks**

```bash
git init --template=/etc/git-templates/enterprise
```

> Security teams use this to enforce compliance. By specifying a template directory, the new repository is initialized with pre-built `pre-commit` hooks that automatically scan for leaked secrets or enforce code formatting before allowing a commit.

## When should it NOT be used?

- **Cloning an existing project:** Running `mkdir proj && cd proj && git init && git remote add origin URL`. **Reason:** This requires manually fetching, linking tracking branches, and pulling data. **Use instead:** `git clone URL`, which automatically initializes the repo, configures remotes, and checks out the default branch in one step.
- **Inside an active Git repository:** Running `git init` in a sub-folder of a project. **Reason:** This creates a detached, nested repository that the parent repository cannot natively track or commit, resulting in a confusing "dirty submodule" state. **Use instead:** `git submodule add` to formally link nested repositories.
- **Wiping a repository's history:** Running `git init` to "reset" a broken repository. **Reason:** Reinitializing does not delete the object database or commit history; it only refreshes templates and configuration. **Use instead:** `rm -rf .git && git init` to completely destroy history and start fresh.

## Alternatives

- **`git clone`:** The primary method for bootstrapping a repository from an external source. **Tradeoff:** It requires network access and a pre-existing remote repository to copy from, whereas `init` creates an empty local instance instantly.
- **`git worktree add`:** Creating secondary environments. **Tradeoff:** It links a new working directory to an _already existing_ local `.git` repository, allowing you to check out multiple branches simultaneously without using `git init` to clone or duplicate the entire object database.

## How it works internally

When executed, `git init` performs a series of precise filesystem operations. If the target directory does not exist, it creates it. It then creates the hidden `.git` directory and populates it with a specific skeleton structure.

This skeleton includes the `objects/` directory (which stores compressed blob, tree, and commit data), the `refs/` directory (containing `heads/` for branches and `tags/` for releases), and the `HEAD` file. The `HEAD` file is a plain text pointer initialized to point to the default branch (e.g., containing the string `ref: refs/heads/main`).

It also generates a `.git/config` file containing the core repository settings (`core.repositoryformatversion`, `core.bare`, and `core.filemode`), an `info/exclude` file for local ignore patterns, and a `hooks/` directory populated with `.sample` shell scripts. If `git init` is run on an already initialized repository, it safely re-runs this process—it will not overwrite existing objects or refs, but it will copy in newly defined templates and update the configuration file if new flags (like `--shared`) are appended. The command returns an exit code of `0` upon successful creation or reinitialization.

## Performance Notes

- `git init` is an entirely local, filesystem-bound operation. It performs zero network I/O and creates only a handful of tiny directories and text files, executing in single-digit milliseconds.
- Choosing `--object-format=sha256` significantly increases the cryptographic security and collision resistance of the repository hashes, but introduces backward incompatibility; older Git clients (pre-2.29) will be unable to interact with the repository.

## Security Notes

- **Web Server Exposure:** Running `git init` inside a public-facing web root (like `/var/www/html`) creates a `.git` folder. If the web server (Nginx/Apache) is not explicitly configured to block access to hidden directories, attackers can download the entire `.git` database and extract your source code, configuration files, and hardcoded credentials.
- **Shared Permissions:** The `--shared` flag modifies POSIX permissions (using `chmod` and `chgrp` internally). Carelessly using `--shared=all` on a multi-tenant server allows any local user to manipulate the object database, potentially injecting malicious commits or hooks into your codebase.
- **Template Hook Execution:** If you run `git init` using a `--template` directory provided by an untrusted third party, you may inadvertently install malicious client-side hooks (`pre-commit`) that execute arbitrary shell scripts under your user account the moment you attempt your first commit.

## Common Mistakes

- **Pushing from a standard init to a standard init:** Setting up a remote server by running `git init`, then trying to push code to it from a local machine. **Why it's wrong:** Git actively refuses pushes to a non-bare repository if the branch being pushed to is currently checked out, as it would instantly corrupt the remote user's working tree. You must use `git init --bare` on the receiving server.
- **Forgetting to set the initial branch name:** Initializing a repository and making the first commit, only to realize the branch is named `master` instead of your organization's standard `main`. **Why it's wrong:** While easily fixable via `git branch -m`, failing to use `-b main` during initialization creates unnecessary cleanup steps before pushing to remote hosts with branch protection rules.
- **Assuming tracked files are modified:** Running `git init` inside an existing project folder and assuming Git has automatically backed up the files. **Why it's wrong:** `git init` only creates the tracking infrastructure. It does not stage or commit any data. You must manually run `git add .` and `git commit` to secure the initial snapshot.

## Best Practices

- Establish a global default branch name by running `git config --global init.defaultBranch main`. This eliminates legacy naming issues across all future local projects.
- Standardize team hooks using `--template` or modern tools like Husky to ensure consistency from repository inception.

## Interview Questions

**Q: What is the exact difference between `git init` and `git init --bare`?**
**A:** `git init` creates a repository with a working tree (checked-out files). `git init --bare` creates a repository containing only the `.git` directory structure without a working directory, designed for remote central servers to accept pushes cleanly.

**Q: If you run `git init` in a directory that already contains code, what happens to your files?**
**A:** Nothing happens to your existing files. `git init` only creates the hidden `.git` folder and initial tracking metadata; it does not modify, stage, or commit your existing files until you run `git add`.

## Practice Problems

**Problem:** Initialize a bare repository at `/srv/git/backend.git` that is group-writable for team collaboration.
**Hint:** Combine the bare flag with the shared flag.
**Solution:**

```bash
git init --bare --shared=group /srv/git/backend.git
```

## References

- [git-init Manual Page](https://git-scm.com/docs/git-init)
- [Pro Git Book: Getting a Git Repository](https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository)
