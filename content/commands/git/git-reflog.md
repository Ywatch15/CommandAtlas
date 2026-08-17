---
slug: git-reflog
name: git reflog
aliases: []
category: git
tags:
  - version-control
  - history
  - recovery
  - reference-logs
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
  - view git reference logs
  - recover deleted git commits
  - undo git reset hard
  - find lost git commit hash
  - inspect head movement history
relatedCommands: [git-branch, git-checkout, git-log, git-reset]
alternatives: [git-log]
status: draft
---

## What is it?

`git reflog` is a safety utility that manages and displays the reference logs, which record every instance where the tip of a branch or the `HEAD` pointer moves in a local repository. It maintains a chronological, append-only history of local state transitions, allowing developers to trace and recover even "lost" or unreferenced commits.

## Why does it exist?

Standard `git log` traces the commit graph forward through parent-child ancestry, meaning if a commit becomes detached, squashed, or orphaned from any branch or tag pointer, standard logging mechanisms can no longer see it. `git reflog` was created to solve this permanence issue by maintaining an independent, local append-only log of every pointer movement inside the `.git/logs/` directory, acting as an infallible local safety net against catastrophic history resets, rebases, and branch deletions.

## Syntax

```bash
git reflog [<options>] [<ref>]
git reflog [show] [<log-options>] [<ref>]
git reflog list
git reflog expire [--expire=<time>] [--expire-unreachable=<time>] [--rewrite] [--updaterefs] [--stale-fix] [--dry-run | -n] [--verbose] [--all | <refs>...]
git reflog delete [--rewrite] [--updaterefs] [--dry-run | -n] [--verbose] <ref>@{<spec>}...
git reflog exists <ref>
```

## Flags

| Flag                          | Description                                                                                         | Example                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `show`                        | Displays the log of updates for the specified reference (implicit default action).                  | `git reflog show main`                       |
| `list`                        | Lists all references that have corresponding reflogs tracked in the repository.                     | `git reflog list`                            |
| `expire`                      | Prunes older or unreachable reflog entries based on configured expiration timeframes.               | `git reflog expire --expire=90days --all`    |
| `delete`                      | Deletes specific individual reflog entries matching a given selector specifier.                     | `git reflog delete refs/heads/main@{0}`      |
| `exists`                      | Checks whether a reflog tracking file exists for a given reference, exiting with status 0 or 1.     | `git reflog exists HEAD`                     |
| `--all`                       | Processes reflog entries for all references across the repository during maintenance operations.    | `git reflog expire --expire=now --all`       |
| `--expire=<time>`             | Sets the cutoff time threshold for old reflog entries during expiration pruning.                    | `git reflog expire --expire=30days`          |
| `--expire-unreachable=<time>` | Sets the cutoff time specifically for entries that are no longer reachable from any current branch. | `git reflog expire --expire-unreachable=now` |
| `-n`, `--dry-run`             | Simulates reflog expiration pruning without actually deleting or modifying log files on disk.       | `git reflog expire --dry-run --all`          |
| `--verbose`                   | Prints additional diagnostic information during reflog maintenance and expiration runs.             | `git reflog expire --verbose --all`          |
| `--updaterefs`                | Updates underlying reference pointers when rewriting reflogs during administrative operations.      | `git reflog expire --updaterefs --all`       |

## Examples

```bash
git reflog
```

> This prints the default `HEAD` reflog, showing a numbered, chronological timeline of every workspace movement, branch switch, commit, and reset executed in the local repository.

```bash
git reflog show feature-branch
```

> This inspects the specific reflog history for a non-HEAD branch pointer (`feature-branch`), allowing you to track how that exact branch evolved independently of your global checkout history.

```bash
git show HEAD@{2}
```

> This utilizes reflog selector syntax (`@{n}`) to inspect the exact file changes and commit metadata associated with the state of the repository two movements ago, without having to switch back to it immediately.

```bash
git reflog expire --expire=now --all
```

> This forcefully prunes and clears all reflog entries across every reference in the repository immediately, destroying local history recovery paths and freeing disk space.

```bash
git reflog list
```

> This scans the repository and outputs a clean list of all internal reference paths that currently maintain active append-only reflog logs on disk.

## Real-World Scenarios

**Recovering from an Accidental Hard Reset**

```bash
git reflog && git reset --hard HEAD@{4}
```

> When an engineer accidentally runs a destructive `git reset --hard` that wipes out hours of uncommitted or unpushed work, they inspect the reflog to locate the exact state prior to the mistake and instantly restore their working directory to that point.

**Rescuing Detached HEAD Work After Experimentation**

```bash
git reflog && git checkout -b salvaged-work HEAD@{1}
```

> While testing code in a detached `HEAD` state, a developer commits experimental fixes and accidentally switches away, abandoning the commits. They use reflog to find the last recorded hash of their detached session and safely wrap it into a permanent new branch.

**Undoing a Destructive Interactive Rebase**

```bash
git reflog && git reset --hard origin/feature@{1}
```

> When an interactive rebase goes awry, squashing or dropping commits that were actually needed, the developer inspects the reflog entry immediately preceding the rebase command (`rebase -i (start)`) to roll back to the clean baseline.

## When should it NOT be used?

- **Collaboration and sharing across team servers:** Attempting to push reflogs to a remote repository (like GitHub). **Reason:** Reflogs are strictly local, machine-specific metadata files; they are never transmitted during network pushes or pulls. **Use instead:** Standard remote branches and pull requests.
- **Long-term compliance auditing:** Relying on reflog for permanent compliance or legal tracking. **Reason:** Reflogs are aggressively pruned by default garbage collection (`git gc`) after 90 days, making them temporary rather than permanent. **Use instead:** Standard tagged commits or official release logs.
- **Production security forensic investigations:** Using reflog to audit historical access control breaches. **Reason:** Reflogs can be trivially truncated or deleted locally by any user with disk access to the `.git/logs/` folder. **Use instead:** Centralized system logs or auditd.

## Alternatives

- **`git log`:** The standard commit graph traversal tool. **Tradeoff:** `git log` displays historical ancestry through parent-child links, but cannot see or recover commits that have been orphaned or detached from branch pointers, whereas `reflog` tracks every pointer shift regardless of ancestry.

## How it works internally

`git reflog` operates by reading files stored inside the `.git/logs/` directory. Whenever a local reference pointer moves—whether via commit, reset, checkout, rebase, or merge—Git appends a plain-text line to the corresponding log file (such as `.git/logs/HEAD` or `.git/logs/refs/heads/main`).

Each entry in a reflog file records the old commit hash, the new commit hash, the user identity string, a timestamp with timezone offset, and the exact command action (e.g., `commit: Added authentication`). When you execute `git reflog`, Git parses these append-only log files in reverse chronological order, assigning them relative index specifiers like `HEAD@{0}` (the current position) and `HEAD@{1}` (the immediately preceding position).

Because reflogs record raw commit hashes, pointing a reference back to an old reflog entry simply reassigns the ref file (`.git/refs/heads/...`) to that historic hash, making the orphaned commits reachable again. However, entries older than 90 days (configurable via `gc.reflogExpire`) are automatically pruned during background `git gc` operations.

## Performance Notes

- Reading reflogs is exceptionally fast because the files are stored as lightweight, append-only plain text logs located entirely within the local `.git/logs/` directory, requiring zero network overhead or complex database traversal.
- Executing deep reflog maintenance operations (`git reflog expire --all`) across repositories with massive, heavily manipulated histories can incur brief CPU overhead as Git scans and rewrites active log files.

## Security Notes

- **Local Persistence of Deleted Secrets:** Because reflog records pointer movements, if you accidentally commit a plaintext password, amend the commit, or reset past it, the secret _remains permanently stored_ in the `.git/logs/HEAD` file and object database until garbage collection fully runs and expires.
- **Manual Log Scrubbing:** If sensitive data enters the reflog, standard commands like `git reset` are insufficient; you must manually purge the logs using `git reflog expire` and run aggressive object pruning (`git gc --prune=now`) to eradicate the trace from disk.

## Common Mistakes

- **Assuming reflogs are backed up on remote servers:** Deleting your local repository clone assuming `git reflog` history is stored on GitHub. **Why it's wrong:** Reflogs are strictly local to the local machine's `.git` folder. Cloning a repository from scratch initializes a brand-new, empty reflog starting from the cloned commit.
- **Waiting too long before attempting recovery:** Trying to rescue an orphaned commit via reflog six months after it was abandoned. **Why it's wrong:** Background garbage collection (`git gc`) purges unreferenced reflog entries older than 90 days by default. The historical entry will have been permanently deleted from disk.
- **Confusing reflog indices with commit hashes:** Typing `git reset --hard @{2}` without context and accidentally resetting to an unexpected branch state. **Why it's wrong:** Relative indices (`@{2}`) evaluate relative to the currently active reference log context, which can shift if you switch branches before executing the recovery command.

## Best Practices

- When executing dangerous history-rewriting operations like `git reset --hard` or complex `git rebase` sessions, take a quick mental note or copy the current SHA-1 hash beforehand, using `git reflog` as a secondary safety net rather than relying on it blindly.
- Understand that reflogs are completely machine-local; never instruct teammates to check their reflogs on remote servers for shared synchronization.
- If you frequently handle sensitive data or credentials, periodically purge and expire your local reflogs (`git reflog expire --expire=now --all && git gc --prune=now`) to eliminate residual secret storage.

## Interview Questions

**Q:** What is the fundamental architectural difference between what `git log` displays and what `git reflog` tracks?
**A:** `git log` traverses the commit graph forward and backward through parent-child ancestry links starting from a commit object, meaning it cannot see commits that have been detached or orphaned from all branch pointers. `git reflog` tracks an independent, local, append-only log of every movement of the `HEAD` pointer or branch references over time, recording pointer shifts regardless of whether the underlying commits are currently reachable in the commit graph.

**Q:** If you perform a destructive `git reset --hard` that orphans three uncommitted or unpushed commits, why are those commits still recoverable via `git reflog`?
**A:** When commits are created or when `HEAD` moves, Git records the old and new commit hashes in the append-only `.git/logs/HEAD` file. Even though the branch pointer moved away from those three commits—making them unreachable via standard `git log`—their object data remains safely stored in `.git/objects`, and their hashes remain recorded in the reflog, allowing you to re-point a branch to them.

**Q:** Why can't you run `git reflog` to recover a lost commit after cloning a repository from a remote server onto a brand-new laptop?
**A:** Reflogs are strictly local metadata files stored within a specific clone's `.git/logs/` directory. When you clone a repository, Git copies the commit history and branch refs, but it does not transmit local reflog histories from the source machine, meaning your new local clone starts with a fresh, empty reflog.

## Practice Problems

**Problem:** You executed a command that moved your `HEAD` pointer unexpectedly. Print the complete chronological reference log for `HEAD` to inspect your recent local history movements.
**Hint:** Invoke the reflog command without any arguments to view the default log.
**Solution:** `git reflog` (This outputs the sequential history of local `HEAD` transitions, indexed with relative specifiers like `HEAD@{0}`).

**Problem:** After identifying that the repository state four movements ago (`HEAD@{4}`) contains the correct code before an accidental reset, restore your working directory and branch pointer directly to that exact historical state.
**Hint:** Combine the reset command with the hard flag and the specific reflog time selector.
**Solution:** `git reset --hard HEAD@{4}` (This moves the active branch pointer and updates the working tree to match the exact repository state recorded at that reflog index).

## References

- [Git - git-reflog Documentation](https://git-scm.com/docs/git-reflog)
- [Pro Git Book: Git Internals - Maintenance and Data Recovery](https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery)
  === END FILE ===
