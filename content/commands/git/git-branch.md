---
slug: git-branch
name: git branch
aliases: []
category: git
tags:
  - git-branch
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
  - list all git branches
  - create a new branch
  - delete a git branch
  - rename current branch
  - show remote branches
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git branch` is a core version control command used to list, create, rename, or delete branches within a Git repository. It manages the lightweight, movable pointers that track independent lines of development, allowing developers to safely isolate feature work or bug fixes from the main project history.

## Why does it exist?

In older, centralized version control systems (like SVN), branching involved performing heavy, slow directory copies that consumed massive amounts of disk space. Git revolutionized this by treating branches not as directories, but as ephemeral 40-character SHA-1 pointers to specific commits. `git branch` exists to provide a high-level interface to manipulate these lightweight pointers natively, enabling the rapid, low-cost context switching that defines modern distributed workflows.

## Syntax

```bash
git branch [--color[=<when>] | --no-color] [--show-current]
           [-v [--abbrev=<n> | --no-abbrev]]
           [--column[=<options>] | --no-column] [--sort=<key>]
           [--merged [<commit>]] [--no-merged [<commit>]]
           [--contains [<commit>]] [--no-contains [<commit>]]
           [--points-at <object>] [--format=<format>]
           [(-r | --remotes) | (-a | --all)]
           [--list] [<pattern>...]
git branch [--track[=(direct|inherit)] | --no-track] [-f | --force] <branchname> [<start-point>]
git branch (-m | -M) [<oldbranch>] <newbranch>
git branch (-c | -C) [<oldbranch>] <newbranch>
git branch (-d | -D) [-r] <branchname>...
git branch --edit-description [<branchname>]
```

## Flags

| Flag                | Description                                                                                                   | Example                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `-a`, `--all`       | Lists both local and remote-tracking branches in the repository.                                              | `git branch -a`                            |
| `-r`, `--remotes`   | Lists only the remote-tracking branches (e.g., branches under `refs/remotes/`).                               | `git branch -r`                            |
| `-d`, `--delete`    | Deletes the specified branch safely, aborting if its changes have not been merged upstream.                   | `git branch -d feature-branch`             |
| `-D`                | Force-deletes the specified branch, destroying its unique commits even if they are unmerged.                  | `git branch -D abandoned-experiment`       |
| `-m`, `--move`      | Renames the current branch (or a specified branch) to a new name.                                             | `git branch -m main`                       |
| `-M`                | Force-renames a branch, even if the target name already exists (overwriting it).                              | `git branch -M old-main main`              |
| `-v`, `--verbose`   | When in list mode, shows the SHA-1 and commit subject line for each branch head.                              | `git branch -v`                            |
| `-vv`               | Appends the upstream tracking branch name and ahead/behind commit counts to the verbose output.               | `git branch -vv`                           |
| `--merged`          | Filters the list to show only branches whose commits are fully reachable from the specified commit (or HEAD). | `git branch --merged`                      |
| `--no-merged`       | Filters the list to show only branches that contain commits not yet merged into the specified commit.         | `git branch --no-merged main`              |
| `--show-current`    | Prints the exact name of the currently checked-out branch, outputting nothing in detached HEAD state.         | `git branch --show-current`                |
| `--set-upstream-to` | Configures the current branch to track the specified remote branch for future pulls/pushes.                   | `git branch --set-upstream-to=origin/main` |

## Examples

```bash
git branch feature-auth
```

> This creates a new pointer named `feature-auth` exactly at the commit currently referenced by `HEAD`. It does _not_ switch your working directory to the new branch; you must still run `git checkout feature-auth` to begin working on it.

```bash
git branch -a -v
```

> This outputs a comprehensive list of every branch known to the local repository—both local branches and cached remote-tracking branches (`origin/...`)—along with the specific commit hash and commit message they currently point to.

```bash
git branch -d patch-1
```

> This instructs Git to delete the `patch-1` branch pointer. Before deleting, Git actively checks if the commits exclusively referenced by `patch-1` have been merged into the current branch or its upstream. If they haven't, it throws an error to prevent accidental code loss.

```bash
git branch -m old-name new-name
```

> This renames the local branch `old-name` to `new-name`. This only updates the local filesystem pointer in `.git/refs/heads/`; it does not automatically rename or delete any associated remote branch on GitHub or GitLab.

```bash
git branch --merged main
```

> This queries the commit graph and lists all branches that have been completely incorporated into the `main` branch. It is highly useful for identifying stale feature branches that are safe to delete.

## Real-World Scenarios

**Cleaning up stale local branches**

```bash
git branch --merged | grep -v "\*" | xargs -n 1 git branch -d
```

> Developers routinely accumulate dozens of local tracking branches after pull requests are merged remotely. This pipeline asks Git for all fully merged branches, filters out the active branch (marked with `*`), and passes the rest to `xargs` for safe bulk deletion, keeping the local environment clean.

**Fixing a detached HEAD state**

```bash
git branch rescue-branch HEAD
```

> If an administrator checks out a specific commit hash (entering detached HEAD state) and makes several commits, those commits will be lost to garbage collection upon checking out another branch. Running this creates a permanent branch pointer (`rescue-branch`) pointing to those vulnerable commits, securing the work.

**Auditing unpushed work before a machine wipe**

```bash
git branch -vv | grep ": ahead"
```

> Before wiping a laptop or deleting a repository clone, a developer runs this command. It compares local branches to their configured upstream remotes and isolates any branch that has local commits that have not yet been successfully pushed to the central server.

## When should it NOT be used?

- **Switching the active working directory:** Running `git branch feature`. **Reason:** `git branch` only creates the pointer; it leaves your working tree entirely unchanged. If you start editing files, you are still modifying the original branch. **Use instead:** `git checkout -b feature` or `git switch -c feature` to create and switch in one atomic step.
- **Deleting a remote branch:** Running `git branch -d origin/feature`. **Reason:** This command attempts to delete the local cache of the remote tracking branch in `.git/refs/remotes/`, but does absolutely nothing to the actual branch on the central server. **Use instead:** `git push origin --delete feature`.
- **Querying exact file changes:** Running `git branch -v` expecting to see what code was modified. **Reason:** The verbose flag only shows the commit message subject line, not the content diff. **Use instead:** `git log -p` or `git diff`.

## Alternatives

- **`git checkout -b`:** Creates and immediately switches to a new branch. **Tradeoff:** This is the preferred, safer macro for daily development, eliminating the risk of creating a branch but forgetting to switch to it, though it lacks the bulk-listing capabilities of `git branch`.
- **`git switch -c`:** The modern replacement for `checkout -b`. **Tradeoff:** Introduced in Git 2.23, it provides cleaner semantics explicitly dedicated to branch switching, separating it from `checkout`'s confusing dual-role of restoring individual files.
- **`git for-each-ref`:** A low-level plumbing command. **Tradeoff:** It lacks user-friendly formatting, but provides infinitely customizable, machine-parseable output (like filtering by author or exact date) across all refs, which is vastly superior for complex bash scripting.

## How it works internally

A Git branch is fundamentally nothing more than a 41-byte text file located in the `.git/refs/heads/` directory. When you run `git branch feature-x`, Git does not copy any files or create any new commits. It simply creates a plain text file at `.git/refs/heads/feature-x` and writes the 40-character SHA-1 hash of the commit currently referenced by `HEAD` into that file, followed by a newline.

When you delete a branch (`git branch -d feature-x`), Git performs a graph traversal using reachability analysis. It checks if the commit hash inside the branch file is an ancestor of the current `HEAD` or its designated upstream branch. If it is unreachable (meaning deleting the pointer would orphan the commits, making them inaccessible and subject to deletion by `git gc`), the command aborts. If you force delete (`-D`), Git skips the safety check and simply unlinks (deletes) the text file from the filesystem.

The listing operations (`git branch -a`) read the directory structures of `.git/refs/heads/` (local) and `.git/refs/remotes/` (remote-tracking) and cross-reference them with `.git/config` to determine tracking relationships (`-vv`). Because branch creation and deletion are strictly local, atomic file operations, they are instantaneous and require zero network I/O.

## Performance Notes

- Creating, listing, or deleting local branches is an `O(1)` or strictly filesystem-bound operation that executes in milliseconds, regardless of repository size.
- Using flags like `--merged` or `--no-merged` on massive, decades-old repositories (like the Linux kernel) requires Git to traverse the commit graph. While highly optimized, this traversal can introduce noticeable latency compared to a simple list operation.

## Security Notes

- **Local-Only Operations:** All standard `git branch` creations, renames, and deletions occur strictly on the local filesystem. Deleting a branch locally does not revoke access or delete the branch on a remote server like GitHub or GitLab.
- **Orphaned Commits:** Force-deleting a branch (`-D`) with unmerged changes removes the only human-readable pointer to those commits. While the commits temporarily remain in the object database (accessible via `git reflog`), they are marked for deletion and will be permanently destroyed when Git automatically runs its garbage collection daemon.

## Common Mistakes

- **Renaming a branch while checked out elsewhere:** Running `git branch -m old new` when you are currently checked out on `main`. **Why it's wrong:** The `-m` flag operates on the _current_ branch if only one argument is provided. It will rename `main` to `old new`, completely breaking your local repository tracking. Always provide both arguments (`git branch -m old new`) if not checked out on the target branch.
- **Assuming branch renames propagate upstream:** Running `git branch -m new-name` and assuming colleagues will see the change. **Why it's wrong:** The local rename severs the tracking relationship with the remote. You must explicitly push the new branch to the remote (`git push origin -u new-name`) and manually delete the old remote branch (`git push origin --delete old-name`).
- **Creating a branch from a stale state:** Typing `git branch hotfix` before running `git pull`. **Why it's wrong:** The new `hotfix` pointer is created exactly at your outdated local `HEAD`. When you push, you will inevitably face complex merge conflicts with the changes your team already merged upstream.

## Best Practices

- Never use `git branch` alone to start work. Build the muscle memory to use `git switch -c <name>` (or `checkout -b`) to ensure your working tree immediately aligns with the new pointer.
- Adopt consistent organizational naming conventions using forward slashes (e.g., `feature/auth-login`, `bugfix/issue-42`). Git translates these slashes into actual directory structures inside `.git/refs/heads/`, keeping branch listings natively organized in graphical tools.
- Run `git branch --merged` routinely to prune local branches that have already been integrated via Pull Requests. A cluttered local branch list increases the risk of accidentally pushing outdated code to the wrong remote target.

## Interview Questions

**Q:** Explain technically what a branch actually is within the Git architecture, and how it differs from a branch in Subversion (SVN).
**A:** In Git, a branch is merely a lightweight, 41-byte text file containing the SHA-1 hash of a specific commit. It is a movable pointer. In SVN, a branch is an actual directory copy on the central server, replicating the entire file tree. Git's approach makes branching nearly instantaneous and locally isolated.

**Q:** What is the technical mechanism that prevents `git branch -d` from deleting a branch, and how do you override it?
**A:** Git performs reachability analysis on the commit graph. If the commit pointed to by the branch is not an ancestor of the current `HEAD` (meaning the commits are unique and unmerged), Git aborts to prevent data loss. You override this safety check by using the capital `-D` flag.

**Q:** If you use `git branch -d` to successfully delete a branch, are the commits associated with that branch immediately deleted from your hard drive?
**A:** No. The commits remain in the `.git/objects` database. Deleting the branch only deletes the pointer file. The commits become "orphaned" or "unreachable," and will remain on disk until Git's garbage collection (`git gc`) eventually prunes them (usually after 30 days).

## Practice Problems

**Problem:** You are currently checked out on the `main` branch. Write a single command that creates a new branch named `experiment-12`, but ensures you remain checked out on `main` so you can continue your current work.
**Hint:** Use the command in its simplest form with a single positional argument.
**Solution:** `git branch experiment-12` (This drops the new pointer at `HEAD` without altering your working tree).

**Problem:** You want to clean up your local repository. Write a command that lists every local branch along with its upstream tracking information and ahead/behind commit counts, so you can safely identify which branches are fully synchronized.
**Hint:** Combine the flag for listing local branches with the double-verbose flag.
**Solution:** `git branch -vv` (This outputs the branch list, showing `[origin/branch: ahead 1, behind 2]` contextual data).

## References

- [Git - git-branch Documentation](https://git-scm.com/docs/git-branch)
- [Pro Git Book: Git Branching - Branches in a Nutshell](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell)
  === END FILE ===
