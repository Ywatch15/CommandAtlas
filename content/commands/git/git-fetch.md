---
slug: git-fetch
name: git fetch
aliases: []
category: git
tags:
  - git-fetch
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
  - download objects and refs from remote
  - sync with remote without merging
  - update remote tracking branches
  - see what others pushed
  - fetch new branches from github
relatedCommands: [git-remote, git-subtree]
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git fetch` is a foundational version control command that downloads commits, files, and branch references from a remote repository into the local repository database. Crucially, it is a strictly non-destructive, read-only operation regarding your active workspace; it updates remote-tracking branches (like `origin/main`) and the `.git` database, but it entirely ignores the local working directory and current branch. It allows developers to see what changes exist on a shared server without immediately integrating those changes into their local code.

## Why does it exist?

In a distributed version control system like Git, developers work in isolated local environments. To maintain synchronization with the team, a mechanism is required to securely pull down upstream changes without automatically disrupting a developer's current uncommitted work or forcing an immediate, potentially conflict-ridden merge. `git fetch` exists to decouple the _retrieval_ of data from the _integration_ of data. This architectural separation empowers developers to safely inspect, diff, and review remote changes before explicitly choosing to merge or rebase them.

## Syntax

```bash
git fetch [options] [<repository> [<refspec>...]]
```

## Flags

| Flag                     | Description                                                                                                    | Example                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `--all`                  | Fetches from all configured remote repositories instead of just the default (usually `origin`).                | `git fetch --all`                         |
| `-p`, `--prune`          | Deletes local remote-tracking branches if their corresponding branch has been deleted on the remote server.    | `git fetch -p`                            |
| `--tags`                 | Fetches all tags from the remote, even if they do not point to objects reachable from the fetched branches.    | `git fetch --tags`                        |
| `--no-tags`              | Explicitly disables automatic tag following, ensuring no tags are downloaded during the fetch.                 | `git fetch --no-tags`                     |
| `--depth <depth>`        | Limits the fetch to a specific number of commits from the tip of each remote branch, creating a shallow clone. | `git fetch --depth 1`                     |
| `-f`, `--force`          | Overwrites local remote-tracking branches even if the remote branch is not a fast-forward descendant.          | `git fetch -f origin main`                |
| `--dry-run`              | Connects to the remote and calculates what would be downloaded and updated, but applies no actual changes.     | `git fetch --dry-run`                     |
| `--recurse-submodules`   | Recursively fetches changes for populated submodules within the repository.                                    | `git fetch --recurse-submodules`          |
| `--shallow-since=<date>` | Deepens or shortens a shallow repository to include only commits after the specified timestamp.                | `git fetch --shallow-since="2 weeks ago"` |
| `-q`, `--quiet`          | Silences all output, including progress reports and branch update summaries.                                   | `git fetch -q`                            |
| `--prune-tags`           | Similar to `--prune`, but specifically targets and deletes local tags that no longer exist on the remote.      | `git fetch --prune-tags`                  |

## Examples

```bash
git fetch
```

> Performs a standard fetch from the default remote (usually `origin`). It downloads any missing commits and updates local remote-tracking references like `origin/main` or `origin/feature-branch`, but leaves your actual `main` branch completely untouched.

```bash
git fetch -p
```

> Fetches updates from the default remote and actively prunes the local repository. If a coworker merged and deleted a feature branch on GitHub, this command removes the stale `origin/feature-branch` pointer from your local `.git/refs/remotes/` directory.

```bash
git fetch origin main
```

> Explicitly fetches only the `main` branch from the `origin` remote. This is highly efficient for massive repositories where you only need to sync a specific branch before rebasing, rather than downloading data for thousands of active branches.

```bash
git fetch origin pull/42/head:pr-42
```

> Leverages a raw refspec to fetch a specific Pull Request (PR #42 in this case, using GitHub's ref format) directly into a new, local branch named `pr-42`. This allows you to locally test and review a PR without the author needing to push to a standard branch.

```bash
git fetch --dry-run
```

> Connects to the remote and outputs exactly which branches would be updated and which new commits would be downloaded, but terminates before writing any data to disk. Excellent for verifying network connectivity or checking for upstream activity silently.

## Real-World Scenarios

**Safe Syncing Before Rebasing**

```bash
git fetch origin
git rebase origin/main
```

> Experienced developers almost universally prefer this two-step process over `git pull --rebase`. By fetching first, they can run `git log main..origin/main` to inspect the upstream changes before initiating the rebase, ensuring they aren't rebasing onto a broken or unexpected remote state.

**Local Pull Request Review**

```bash
git fetch origin +refs/pull/*/head:refs/remotes/origin/pr/*
```

> By modifying the `.git/config` file or running this manual refspec fetch, engineers can configure their local Git client to automatically download every Pull Request created on the remote server as a remote-tracking branch. This allows instantaneous local checkout and testing of any PR (e.g., `git checkout pr/123`).

**Cleaning Up Stale Local State**

```bash
git fetch --all --prune --prune-tags
```

> Repository maintainers run this aggressive cleanup command to synchronize their local environment with all configured remotes. It fetches new data, deletes tracking branches for PRs that have been merged and deleted remotely, and removes tags that were deleted on the server, keeping the local environment pristine.

## When should it NOT be used?

- **Immediate Integration:** **Do not use `git fetch` if your immediate goal is to update your active working directory.** `git fetch` will not update your local files. If you want to download and immediately merge remote changes into your current branch, use `git pull`.
- **Initial Repository Setup:** **Do not use `git fetch` to start working on a brand new project.** While you _can_ use `git init`, add a remote, and `fetch`, it is vastly more efficient and less error-prone to simply use `git clone`, which handles the fetch, tracking setup, and initial checkout in one step.
- **Pushing Local Changes:** **Do not confuse `fetch` with sync.** `git fetch` only pulls data _down_ from the server. It does not push your local commits _up_ to the remote. You must use `git push` to share your work.

## Alternatives

- **`git pull`:** **Best for quick, combined sync-and-merge operations.** `git pull` is literally a wrapper script that executes `git fetch` followed immediately by `git merge` (or `git rebase`). It trades safety and inspection time for speed.
- **`git remote update`:** **Best for legacy compatibility.** This is an older, largely deprecated command that accomplishes the same thing as `git fetch --all`. Modern Git workflows favor `git fetch`.
- **`git ls-remote`:** **Best for ultra-lightweight inspection.** If you only want to see the SHA-1 hashes and branch names on the remote server without downloading _any_ actual commit data or packfiles, `ls-remote` queries the server directly and exits instantly.

## How it works internally

When you execute `git fetch`, Git reads `.git/config` to resolve the remote URL and the default `fetch` refspec (usually `+refs/heads/*:refs/remotes/origin/*`). It then initiates a network connection to the remote repository, typically invoking the `git-upload-pack` process on the server side and `git-fetch-pack` locally.

The two processes engage in "packfile negotiation." The local client sends the server the SHA-1 hashes of the commits it currently has. The server compares this against its own commit graph to calculate the exact set of missing commits, trees, and blobs required by the client. The server compresses these missing objects into a binary packfile (using delta compression) and streams it over the network.

Once the packfile is received, Git unpacks it and stores the objects in `.git/objects/pack/`. It then performs two critical updates:

1. It updates the remote-tracking references in `.git/refs/remotes/origin/` to point to the newly downloaded commit hashes.
2. It writes a summary of the fetched references to `.git/FETCH_HEAD`. This file acts as a temporary cache that `git merge` or `git pull` reads immediately afterward to know exactly what was just downloaded.

## Performance Notes

- **Packfile Negotiation Overhead:** In massive repositories with deep histories, the initial negotiation phase (determining which commits are missing) can take significant CPU time and memory on both the client and server.
- **Shallow Fetches:** For CI/CD environments that already have a clone but need to update it quickly, using `git fetch --depth 1` prevents Git from negotiating and downloading unnecessary historical commits, drastically reducing network I/O and execution time.

## Security Notes

- **No Arbitrary Execution:** Unlike `git clone` or `git pull`, which immediately execute a checkout (and can thus trigger malicious `.gitattributes` clean/smudge filters or execute hook scripts), `git fetch` is purely a database operation. It is generally safe to fetch from an untrusted remote, as it isolates the downloaded objects in the `.git` directory without executing them.
- **Credential Caching:** `git fetch` requires read access to the remote. If HTTPS is used, it may rely on a credential helper. Be aware that running `git fetch` frequently in automated background scripts can expose or lock credentials if the authentication token expires or the helper is misconfigured.

## Common Mistakes

- **Expecting `fetch` to update your files**
  - _Mistake:_ Running `git fetch`, looking at the code in your editor, and wondering why the bug fix your coworker pushed isn't there.
  - _Why:_ `fetch` explicitly does _not_ touch your working directory. It only updates the hidden remote-tracking branches. You must run `git merge origin/main` (or `git pull`) to apply those downloaded changes to your actual files.
- **Ignoring stale branches**
  - _Mistake:_ Never using the `-p` (prune) flag, leading to a local `.git/refs/remotes/` folder cluttered with hundreds of obsolete branches that were deleted on GitHub months ago.
  - _Why:_ By default, Git is additive. It downloads new branches but refuses to delete local pointers unless explicitly told to do so via `--prune`.
- **Misunderstanding `FETCH_HEAD`**
  - _Mistake:_ Relying on `.git/FETCH_HEAD` across multiple sequential fetches.
  - _Why:_ `FETCH_HEAD` is overwritten on _every_ invocation of `git fetch`. It only records the results of the immediately preceding fetch operation, not a cumulative history of all fetches.

## Best Practices

- **Configure Auto-Pruning:** Instead of remembering to type `-p` every time, configure Git to automatically prune during every fetch by running `git config --global fetch.prune true`. This keeps your remote-tracking branches perfectly synchronized with the server's reality.
- **Fetch Before Disconnecting:** If you are about to board a flight or enter an area with no internet, run `git fetch --all`. This downloads all recent team activity to your local database, allowing you to view logs, diffs, and switch to colleagues' branches while entirely offline.
- **Prefer Fetch over Pull:** Cultivate a habit of using `git fetch` followed by explicit merges or rebases. `git pull` obscures the integration step and can lead to messy, accidental merge commits if the local and remote branches have diverged in unexpected ways.

## Interview Questions

**Q: Explain the precise difference between `git fetch` and `git pull`.**
**A:** `git fetch` only downloads new data (commits, refs, files) from a remote repository into your local `.git` database and updates remote-tracking branches (like `origin/main`); it leaves your active working directory untouched. `git pull` is a compound command that first runs `git fetch`, and then immediately executes a `git merge` (or `git rebase`) to integrate those downloaded changes directly into your current working directory.

**Q: If you run `git fetch` and it downloads new commits, where do those commits exist locally if they aren't in your current branch?**
**A:** They exist in the local Git object database (inside `.git/objects`), and are reachable via remote-tracking branch pointers stored in `.git/refs/remotes/origin/`. You can view them by checking out that specific remote pointer (e.g., `git checkout origin/main`) or by viewing the log (`git log origin/main`).

**Q: You notice that `git branch -r` shows branches that your team deleted from GitHub weeks ago. How do you clean this up?**
**A:** You use `git fetch -p` (or `--prune`). By default, `git fetch` only adds new references and updates existing ones; it does not delete local remote-tracking references when the upstream branch disappears. The prune flag forces Git to remove these stale local pointers.

## Practice Problems

**Problem:** You want to synchronize your local repository with all configured remote repositories (e.g., `origin` and `upstream`), and you want to ensure that any branches deleted on those servers are also removed from your local tracking branches.
**Hint:** You need to combine the flag that targets multiple remotes with the flag that cleans up stale references.
**Solution:**

```bash
git fetch --all --prune
```

**Problem:** You are on a slow cellular connection and need to test a specific branch named `release-v3` from the `origin` remote. You want to download _only_ the history of that specific branch, ignoring the massive amount of data in `main` and other branches.
**Hint:** Provide the remote name and the specific branch name as positional arguments to the command.
**Solution:**

```bash
git fetch origin release-v3
```

## References

- [git-fetch(1) Manual Page](https://git-scm.com/docs/git-fetch)
- [Pro Git Book: Fetching and Pulling from Your Remotes](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes#_fetching_and_pulling)
- [Atlassian Git Tutorial: Git Fetch](https://www.atlassian.com/git/tutorials/syncing/git-fetch)
