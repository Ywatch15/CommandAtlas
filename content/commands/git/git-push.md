---
slug: git-push
name: git push
aliases: []
category: git
tags:
  - git-push
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
  - upload local commits to github
  - push branch to remote repository
  - sync local changes with server
  - force push over remote branch
  - publish local git repository
relatedCommands: [git-rebase, git-remote]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git push` is the primary command used to upload local repository content—specifically commits, branches, and tags—to a remote repository. It transfers the necessary objects and updates the remote references to point to the newly uploaded commits. By synchronizing local state with a shared server (like GitHub, GitLab, or Bitbucket), it serves as the fundamental mechanism for publishing work and collaborating in a distributed version control environment.

## Why does it exist?

In Git's distributed architecture, all commits happen entirely offline in a local database, unlike centralized systems (e.g., SVN) where every commit is immediately broadcasted to a server. This design enables fast, network-free history manipulation. `git push` exists to bridge the gap between this isolated local environment and the shared upstream server. It provides a deliberate, manually triggered synchronization step, allowing developers to curate, rebase, and squash their local history before securely publishing the finalized DAG (Directed Acyclic Graph) to the rest of the team.

## Syntax

```bash
git push [options] [<repository> [<refspec>...]]
```

## Flags

| Flag                        | Description                                                                                                 | Example                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `-u`, `--set-upstream`      | Adds an upstream (tracking) reference used by argument-less `git pull` and `git push`.                      | `git push -u origin feature-branch` |
| `-f`, `--force`             | Forcibly overwrites the remote branch with the local branch, bypassing the fast-forward safety check.       | `git push -f origin main`           |
| `--force-with-lease`        | A safer force-push that only overwrites the remote if no one else has pushed commits since your last fetch. | `git push --force-with-lease`       |
| `-d`, `--delete`            | Deletes the specified branch or tag from the remote repository.                                             | `git push -d origin old-branch`     |
| `--tags`                    | Pushes all local tags to the remote repository that are not already present there.                          | `git push --tags`                   |
| `--all`                     | Pushes all local branches to the specified remote repository at once.                                       | `git push --all origin`             |
| `--dry-run`                 | Simulates the push operation, showing what would be transferred without actually mutating the remote.       | `git push --dry-run`                |
| `--atomic`                  | Ensures all refs are either pushed successfully or none are, preventing partial updates during failures.    | `git push --atomic origin b1 b2`    |
| `-o`, `--push-option=<str>` | Transmits a string to the server, which can be read by pre-receive hooks (e.g., triggering CI).             | `git push -o ci.skip`               |
| `--mirror`                  | Mirrors all refs (branches, tags, notes) to the remote, effectively overwriting the target completely.      | `git push --mirror target-repo`     |
| `--porcelain`               | Produces machine-readable output, useful for scripts parsing the results of a push operation.               | `git push --porcelain`              |

## Examples

```bash
git push origin main
```

> Standard push of the local `main` branch to the remote named `origin`. The command analyzes the local commits, bundles the missing objects, and advances the remote's `main` pointer to match the local tip.

```bash
git push -u origin feature-auth
```

> Pushes a newly created local branch (`feature-auth`) to the remote and simultaneously configures the local branch to track `origin/feature-auth`. Future pushes on this branch will only require typing `git push`.

```bash
git push --force-with-lease origin feature-auth
```

> Safely overwrites the remote `feature-auth` branch after a local interactive rebase. It verifies that the remote pointer matches your local tracking pointer (`origin/feature-auth`) before executing, preventing accidental deletion of a coworker's unseen commits.

```bash
git push origin --delete stale-experiment
```

> Instructs the remote repository to permanently delete the branch named `stale-experiment`. This cleans up the remote server but does not delete the branch from your local machine.

```bash
git push origin v2.1.4
```

> Pushes a specific, newly created tag (`v2.1.4`) to the remote repository. By default, `git push` only pushes branch references, so tags must be pushed explicitly or via the `--tags` flag.

## Real-World Scenarios

**Publishing a Rewritten History**

```bash
git push --force-with-lease origin my-pr-branch
```

> After executing an interactive rebase (`git rebase -i`) to squash ten messy "WIP" commits into a single clean commit, a standard push is rejected because the local and remote histories have diverged. Developers use `--force-with-lease` to overwrite the remote Pull Request branch securely, ensuring they don't crush a teammate's intervening commit.

**Triggering CI/CD Pipelines with Options**

```bash
git push -o ci.skip origin docs-update
```

> When pushing a simple typo fix in a README file, triggering a heavy, 45-minute continuous integration test suite is a massive waste of cloud resources. Passing a push option (`ci.skip`) signals the server-side GitLab or GitHub webhook to bypass the build runner for this specific push.

**Repository Migration and Backup**

```bash
git push --mirror git@gitlab.com:new-org/migrated-repo.git
```

> When transitioning a codebase from Bitbucket to GitLab, infrastructure engineers perform a mirror clone of the old repository, and then use `git push --mirror` to perfectly replicate every branch, tag, and hidden ref to the new host in a single, comprehensive command.

## When should it NOT be used?

- **Overwriting shared main branches:** **Do not use `git push -f` on collaborative branches like `main` or `develop`.** This destroys the commit history that other developers have already based their work on, causing catastrophic merge conflicts across the team. Use `git revert` to undo mistakes forward instead.
- **Syncing local environments automatically:** **Do not put `git push` in a cron job to backup a directory.** Git is not Dropbox. Blindly committing and pushing automated snapshots without logical checkpoints pollutes the repository history and circumvents the purpose of version control. Use `rsync` or cloud storage for raw backups.
- **Pushing large binary files:** **Do not push gigabytes of compiled assets or database dumps.** `git push` transfers these into the remote's permanent history, permanently bloating the clone size for everyone. Track binaries with Git LFS (Large File Storage) or external artifact repositories (like S3) before pushing.

## Alternatives

- **`git send-email`:** **Best for mailing list workflows.** Used predominantly in Linux kernel development, this command formats local commits as standard email patches and sends them to maintainers, bypassing the need for a shared hosted remote entirely.
- **`git request-pull`:** **Best for decentralized trust models.** Generates a summary of pending changes and a URL, asking an upstream maintainer to pull the changes directly from the developer's publicly hosted repository, rather than pushing into the maintainer's repository.
- **`git bundle`:** **Best for air-gapped networks.** Packages the entire git repository, including objects and refs, into a single `.bundle` file that can be transferred via USB drive to a disconnected network, where it can be cloned or fetched from as if it were a live remote server.

## How it works internally

When `git push` is invoked, Git first evaluates the given `refspec` to determine which local references (e.g., `refs/heads/main`) map to which remote references. It then establishes a connection to the remote repository's `git-receive-pack` process over SSH, HTTP(S), or the Git protocol.

The client and server engage in a packfile negotiation phase. The local Git client inspects the remote's current commit pointers (advertised by the server) and compares them to its local pointers to determine exactly which objects (commits, trees, blobs) the remote is missing.

If the local branch is not a direct descendant of the remote branch (a non-fast-forward state), the server rejects the push to prevent history loss, unless overridden by a `--force` flag.

Once the missing objects are identified, the local Git client compresses them into a highly optimized binary "packfile" using delta encoding and zlib. This packfile is streamed over the network to the server. Upon receiving the packfile, the server unpacks and verifies the objects against their expected SHA-1 hashes. If verification passes and all pre-receive hooks (like permission checks or branch protections) succeed, the server updates its refs to point to the new commits and acknowledges the successful push to the client.

## Performance Notes

- **Packfile Compression Overhead:** Pushing a massive amount of new, uncompressed data (like adding thousands of images in a single commit) will severely spike CPU and memory usage locally. Git must aggressively compress these objects into a packfile before network transmission can begin.
- **HTTPS vs. SSH Connection Speeds:** For very large repositories or high-latency connections, SSH is generally faster and more reliable than HTTPS for pushing, as it bypasses the HTTP request overhead and chunked transfer encoding limitations.

## Security Notes

- **Credential Caching Risks:** Using HTTPS for pushing often prompts for a password or Personal Access Token (PAT). If stored improperly via `git config credential.helper store`, these plaintext tokens are saved on disk and can be stolen by malware. Use an OS-level keychain helper or SSH keys instead.
- **Accidental Secret Pushes:** Because `git push` acts on local commits, if a developer accidentally commits an AWS key, pushing it immediately publishes the secret to the remote server, where it can be scraped by bots in seconds. Pre-commit hooks (like `trufflehog` or `git-secrets`) must be utilized to block the commit _before_ the push occurs.
- **Bypassing Branch Protections:** A `--force` push, if not strictly restricted on the server side (e.g., via GitHub or GitLab branch protection rules), allows a single compromised developer account to maliciously overwrite or delete the entire production history of a repository.

## Common Mistakes

- **Forcing a push without lease**
  - _Mistake:_ Running `git push -f` after an interactive rebase, unintentionally wiping out commits a coworker just pushed to the same feature branch 5 minutes prior.
  - _Why:_ Plain `--force` blindly overwrites the remote pointer with your local state. Always use `--force-with-lease`, which checks if the remote branch matches your local tracking branch before overwriting, acting as a crucial safety valve.
- **Pushing to a detached HEAD**
  - _Mistake:_ Checking out a specific commit hash, making changes, committing them, and typing `git push`, resulting in a `fatal: You are not currently on a branch` error.
  - _Why:_ `git push` needs to know which remote branch to update. If you are in a detached HEAD state, your commits do not belong to any local branch. You must create a branch (`git checkout -b new-fix`) and then push it.
- **Forgetting to push tags**
  - _Mistake:_ Creating a release tag `v2.0.0` locally, running `git push`, and wondering why the CI pipeline didn't build the release on GitHub.
  - _Why:_ A standard `git push` only pushes branch references. Tags exist in a completely separate namespace. You must explicitly run `git push origin v2.0.0` or `git push --tags` to upload them.

## Best Practices

- **Configure Default Push Behavior:** Ensure your global config is set to `git config --global push.default simple` (the default in Git 2.0+). This ensures that running a naked `git push` only pushes the current branch to its corresponding upstream branch, preventing accidental pushes of unrelated local experiment branches.
- **Always Set Upstream:** When creating a new branch, push it the first time using `git push -u origin <branch-name>`. This establishes the tracking relationship, allowing all subsequent syncs on that branch to be performed by simply typing `git push` or `git pull`.
- **Atomic Pushes for Multi-Branch Updates:** If your deployment strategy requires updating `main` and a `release` branch simultaneously, use `git push --atomic origin main release`. This guarantees that if one branch fails (e.g., due to a remote hook rejection), the other branch will not be pushed, maintaining repository consistency.

## Interview Questions

**Q: What is the exact difference between a "fast-forward" push and a "non-fast-forward" push?**
**A:** A fast-forward push occurs when the local branch contains all the commits of the remote branch, plus new ones. The remote pointer simply slides forward in time. A non-fast-forward push happens when the remote branch has new commits that the local branch lacks (diverged history). Git rejects non-fast-forward pushes by default to prevent data loss, requiring the developer to pull and merge/rebase before pushing.

**Q: How does `git push --force-with-lease` fundamentally differ from `git push --force`?**
**A:** `--force` blindly overwrites the remote branch with the local state, destroying any intervening commits made by others. `--force-with-lease` checks the remote branch's current state against your local tracking ref (e.g., `origin/main`). If someone else has pushed new commits since your last fetch, the lease fails, and the push is safely aborted.

**Q: If you accidentally commit and push a large 500MB binary file to a remote, does deleting it in the next commit and pushing again remove it from the server?**
**A:** No. Git is an immutable ledger. While the file will disappear from the latest working directory snapshot, the 500MB blob remains permanently stored in the repository's history and will be downloaded by anyone who clones the repo. You must rewrite history using tools like `git filter-repo` or BFG, and then force-push to actually prune the object from the remote.

## Practice Problems

**Problem:** You just created a local branch named `bugfix-login`. Write the command to push this new branch to the remote named `origin` and configure your local branch to track the remote one automatically for future pushes.
**Hint:** You need the flag that sets the upstream tracking reference during the push.
**Solution:**

```bash
git push -u origin bugfix-login
```

**Problem:** You want to permanently delete a stale branch named `old-experiment` from the `origin` remote.
**Hint:** Use the push command with the specific flag designed for deletion, passing the remote and branch name.
**Solution:**

```bash
git push -d origin old-experiment
```

_(Alternatively: `git push origin --delete old-experiment`)_

## References

- [git-push(1) Manual Page](https://git-scm.com/docs/git-push)
- [Pro Git Book: Working with Remotes](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes)
- [Atlassian Git Tutorial: Git Push](https://www.atlassian.com/git/tutorials/syncing/git-push)
