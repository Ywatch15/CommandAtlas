---
slug: git-worktree
name: git worktree
aliases: []
category: git
tags:
  - version-control
  - worktree
  - multiple-branches
  - repository
  - scm
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - powershell
  - sh
intentPhrases:
  - manage multiple git working directories
  - checkout multiple branches at once
  - create git worktree
  - work on two branches simultaneously
  - list active worktrees
relatedCommands:
  - git-branch
  - git-checkout
  - git-clone
  - git-switch
alternatives:
  - git-clone
status: draft
---

## What is it?

`git worktree` is a built-in version control utility that allows a single local repository database to manage multiple, simultaneous working directories attached to different branches or commits. It enables developers to check out and work on multiple branches concurrently across distinct filesystem paths without duplicating the underlying object history.

## Why does it exist?

Traditionally, a Git repository mapped strictly to a single checked-out working tree, forcing developers to constantly use `git stash`, `git commit`, or `git switch` to context-switch between branches, which often invalidated heavy build caches (like `node_modules` or compiled binaries). While cloning a repository twice solved this, it wasted gigabytes of disk space duplicating `.git` object databases. `git worktree` was introduced to bridge this gap, allowing multiple independent working directories to share a single central object repository safely and efficiently.

## Syntax

```bash
git worktree add [<options>] <path> [<commit-ish>]
git worktree list [<options>]
git worktree lock [<options>] <path>
git worktree move <worktree> <new-path>
git worktree prune [<options>]
git worktree remove [<options>] <worktree>
git worktree repair [<path>...]
```

## Flags

| Flag                      | Description                                                                                                       | Example                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `-b`, `--branch <branch>` | Creates a new branch starting at the specified commit-ish and checks it out in the new worktree.                  | `git worktree add -b feature ../feat-dir`          |
| `-B <branch>`             | Creates or resets a branch, forcing it to point to the start point, and checks it out in the worktree.            | `git worktree add -B main ../main-dir`             |
| `--detach`                | Checks out the target commit in a detached `HEAD` state within the newly created worktree.                        | `git worktree add --detach ../debug-dir v1.0.0`    |
| `--force`                 | Forces creation or removal, allowing a worktree to be added even if the branch is already checked out elsewhere.  | `git worktree add --force ../other main`           |
| `--lock`                  | Locks the newly created worktree so it cannot be automatically pruned or deleted by background maintenance tasks. | `git worktree add --lock --reason "CI job" ../ci`  |
| `--no-checkout`           | Skips checking out files into the new working directory after creating the worktree administrative structure.     | `git worktree add --no-checkout ../empty-dir`      |
| `--expire <time>`         | Specifies the cutoff threshold when pruning stale or deleted worktree records.                                    | `git worktree prune --expire=2weeks`               |
| `--reason <string>`       | Provides a descriptive message explaining why a worktree is locked.                                               | `git worktree lock --reason "Active test" ../work` |
| `-q`, `--quiet`           | Suppresses standard output reporting during worktree creation or deletion operations.                             | `git worktree add -q ../temp`                      |
| `-v`, `--verbose`         | Outputs detailed diagnostic messages during worktree maintenance and pruning operations.                          | `git worktree prune -v`                            |
| `--dry-run`               | Simulates prune or repair operations without actually modifying filesystem files or records.                      | `git worktree prune --dry-run`                     |

## Examples

```bash
git worktree add ../hotfix-patch hotfix
```

> This creates a new sibling directory named `hotfix-patch` linked to your repository, checking out the existing `hotfix` branch there. You can now build and test the hotfix without touching your primary working directory.

```bash
git worktree add -b feature/auth ./builds/auth-branch
```

> This creates a brand-new branch named `feature/auth` and simultaneously checks it out in a newly generated subdirectory `./builds/auth-branch`, streamlining feature initialization.

```bash
git worktree list
```

> This inspects and prints a formatted list of all active worktrees linked to the repository, displaying their absolute file paths, active commit hashes, and checked-out branch names.

```bash
git worktree lock --reason "Active build running" ../staging-env
```

> This locks the specified worktree directory, preventing Git's administrative prune routines from accidentally garbage-collecting or invalidating its metadata if the directory is temporarily unmounted or moved.

```bash
git worktree remove ../staging-env
```

> This safely removes an active worktree directory from disk, deleting its workspace files and unlinking its administrative metadata from the primary repository database.

## Real-World Scenarios

**Simultaneous Hotfixing During Long Compilations**

```bash
git worktree add ../hotfix main && cd ../hotfix
```

> When a developer is running a heavy 20-minute compilation on a feature branch, a production emergency occurs. Using `git worktree`, they instantly spin up a clean `main` directory side-by-side, write the hotfix, push it, and return to their compiling feature branch without losing workspace state or build caches.

**Running Parallel Automated Tests Across Branches**

```bash
git worktree add ../test-v1 v1.0 && git worktree add ../test-v2 v2.0
```

> QA engineers and automated test suites use worktrees to check out multiple release versions simultaneously into isolated directories, allowing them to execute regression benchmarks against different codebase iterations concurrently on a single machine.

**Side-by-Side Documentation and Code Review**

```bash
git worktree add ../docs-review docs-branch
```

> Technical writers or lead developers can spin up a dedicated worktree for reviewing documentation branches or cross-referencing implementation details without disrupting their primary development workspace.

## When should it NOT be used?

- **For simple, rapid context-switching when workspaces can be shared:** Do not use `git worktree` if you just want to check a quick file on another branch and return immediately. **Reason:** Creating and managing multiple directories on disk introduces unnecessary filesystem clutter and overhead. **Use instead:** `git stash` or `git switch`.
- **When storage space is severely constrained across massive repos:** **Reason:** While the `.git` database is shared, every worktree still duplicates the working tree files on disk. If files are massive, multiple worktrees will consume substantial storage. **Use instead:** A single worktree with standard branch switching.
- **In automated CI environments without proper pruning cleanup:** **Reason:** If build scripts crash or fail to unregister worktrees properly, orphaned metadata files accumulate in `.git/worktrees/`, causing future git operations to fail or become sluggish. **Use instead:** Clean container boundaries or explicit `git worktree prune` routines.

## Alternatives

- **`git clone`:** Creating an entirely independent copy of the repository. **Tradeoff:** Cloning gives you a fully isolated repository with its own independent history, but it duplicates the entire `.git` object database, wasting gigabytes of disk space compared to the lightweight shared database of `git worktree`.
- **`git stash` / `git switch`:** The traditional switching workflow. **Tradeoff:** This requires zero extra disk space and keeps a single directory, but forces you to overwrite files and rebuild/recompile your project assets every time you switch branches.

## How it works internally

Unlike a standard repository where the `.git` folder is a self-contained subdirectory within the working tree, a repository using `git worktree` utilizes a split architectural model. The core object database and reference store reside in a central `.git` directory (or a bare repo structure).

When you run `git worktree add <path> <branch>`, Git creates a new directory at `<path>` and populates it with a special `.git` **file** (not a directory) containing a pointer path (e.g., `gitdir: /path/to/main-repo/.git/worktrees/branch-name`). Simultaneously, Git creates a corresponding administrative folder inside the main repository's `.git/worktrees/<branch-name>` directory.

This administrative subfolder holds the worktree-specific state, including its own `HEAD` pointer, index file (`index`), staging locks, and unshared reference namespaces. This isolation ensures that each worktree maintains its own independent staging area and working tree files while sharing the exact same underlying commit object database. When a worktree directory is deleted from disk manually, the administrative folder remains in `.git/worktrees/` until pruned via `git worktree prune`.

## Performance Notes

- Worktree creation is exceptionally fast because Git does not duplicate object databases or packfiles; it merely writes a few administrative configuration files and checks out the requested tree files into the new path.
- Because each worktree maintains its own independent index (`.git/worktrees/<name>/index`), status checks and staging operations run isolated and do not conflict across different directories.

## Security Notes

- **Accidental Exposure of Shared Metadata:** Because worktrees share the primary `.git` administrative database, placing a worktree subdirectory inside an insecure or publicly accessible web path can inadvertently expose repository configuration and internal metadata if permissions are misconfigured.
- **Multi-User File Permissions:** If multiple system users share access to a machine and create worktrees in shared directories, unshared lock files or improper umask settings can lead to permission denied errors or corrupted worktree pointers.

## Common Mistakes

- **Deleting a worktree folder manually via `rm -rf`:** Running `rm -rf ../hotfix` to remove a worktree. **Why it's wrong:** While the workspace files disappear, Git's primary repository still believes the worktree is active, leaving stale metadata in `.git/worktrees/` that triggers errors during branch operations. You must use `git worktree remove` or run `git worktree prune`.
- **Checking out the same branch in multiple worktrees:** Trying to run `git worktree add ../other main` when `main` is already checked out in your primary directory. **Why it's wrong:** Git prohibits checking out the exact same branch in multiple active worktrees simultaneously to prevent conflicting index states and corruption. You must use a unique branch or pass `--detach`.
- **Confusing `git worktree remove` with `git branch -d`:** Expecting `worktree remove` to delete the branch itself. **Why it's wrong:** `git worktree remove` only deletes the working directory and unlinks the worktree metadata; the underlying branch pointer remains intact in the repository.

## Best Practices

- Always use `git worktree remove` rather than manual filesystem deletion (`rm -rf`) to keep the central repository's worktree registry clean and synchronized.
- Place your worktree directories as siblings to your primary repository directory (e.g., `../repo-feature`) to maintain clean filesystem organization and prevent nested repository confusion.
- Periodically run `git worktree prune` to clear out stale administrative metadata left behind by deleted worktree folders.

## Interview Questions

**Q:** How does `git worktree` differ architecturally from simply cloning the repository a second time on your hard drive?
**A:** A second clone creates an entirely independent copy of the `.git` object database and history, consuming duplicate disk space and requiring separate network pulls or pushes. `git worktree` shares a single central `.git` object database across multiple independent working directories, saving disk space and synchronizing commit history instantly without network overhead.

**Q:** What happens inside the `.git` directory when you create a worktree versus when you delete a worktree folder using `rm -rf`?
**A:** When you create a worktree, Git creates an administrative folder under `.git/worktrees/` and places a pointer `.git` file in the new working directory. If you delete the worktree folder manually using `rm -rf`, the workspace files vanish, but the administrative folder inside `.git/worktrees/` remains orphaned, requiring `git worktree prune` to clean it up.

**Q:** Why does Git prevent you from checking out the same branch in two different worktrees simultaneously?
**A:** Git ties a branch pointer and its working index to a specific `HEAD` state. Allowing two worktrees to check out and modify the exact same branch concurrently would cause conflicting index updates, race conditions, and corruption in the underlying staging area.

## Practice Problems

**Problem:** You want to create a new sibling worktree directory located at `../bugfix-env` that automatically creates and checks out a new branch named `fix/login-bug`. Write the exact command.
**Hint:** Use the worktree add command paired with the branch creation flag.
**Solution:** `git worktree add -b fix/login-bug ../bugfix-env` (This initializes the worktree, creates the new branch pointer, and checks it out in the target path).

**Problem:** Your repository has accumulated several orphaned metadata records because worktree directories were previously deleted using manual file deletion. Clean up these stale worktree administrative records.
**Hint:** Use the subcommand designed specifically to prune stale worktree tracking data.
**Solution:** `git worktree prune` (This scans the filesystem and purges administrative worktree entries whose corresponding directories no longer exist).

## References

- [Git - git-worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Pro Git Book: Git Branching - Worktrees](https://git-scm.com/book/en/v2/Git-Branching-Worktrees)
  === END FILE ===
