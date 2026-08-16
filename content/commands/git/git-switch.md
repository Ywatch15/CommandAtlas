---
slug: git-switch
name: git switch
aliases: []
category: git
tags:
  - git-switch
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
  - switch branches
  - create and switch to new branch
  - change active git branch
  - checkout branch safely
  - go to previous branch
relatedCommands:
  - git-merge
  - git-restore
  - git-stash
  - git-worktree
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git switch` is a modern Git command used exclusively to change the currently active branch in a repository and update the working directory to match the state of that branch. It safely transitions the `HEAD` pointer and the filesystem files without modifying the repository's commit history.

## Why does it exist?

Introduced in Git 2.23 (August 2019), `git switch` was created to resolve the historical and dangerous overloading of the `git checkout` command. For over a decade, `git checkout` handled two fundamentally different operations: switching branches and reverting modified files. This dual-purpose design was notoriously confusing for beginners and error-prone for experts, as a typo could accidentally wipe out local file changes instead of switching branches. `git switch` (paired with `git restore`) isolates the branch-switching responsibility into a dedicated, semantically explicit utility.

## Syntax

```bash
git switch [<options>] [--no-guess] <branch>
git switch [<options>] --detach [<commit-ish>]
git switch [<options>] -c <new-branch> [<start-point>]
```

## Flags

| Flag                       | Description                                                                                                                                   | Example                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-c`, `--create`           | Creates a new branch starting at the current `HEAD` and immediately switches to it.                                                           | `git switch -c feature-auth`                 |
| `-C`, `--force-create`     | Creates a new branch and switches to it; if the branch already exists, it forcefully resets it to the start point.                            | `git switch -C feature-auth HEAD~3`          |
| `-d`, `--detach`           | Switches to a specific commit or tag instead of a branch, placing the repository in a detached `HEAD` state.                                  | `git switch -d v1.2.0`                       |
| `-m`, `--merge`            | Attempts a three-way merge between the current branch, the target branch, and your uncommitted local changes if a conflict blocks the switch. | `git switch -m main`                         |
| `--discard-changes`        | Forcefully discards local, uncommitted changes in the working tree and index if they conflict with the target branch.                         | `git switch --discard-changes main`          |
| `--guess`                  | Automatically creates a local tracking branch if the requested branch name only exists on exactly one remote (enabled by default).            | `git switch staging`                         |
| `--no-guess`               | Explicitly disables the automatic remote-tracking branch creation fallback.                                                                   | `git switch --no-guess staging`              |
| `--track`                  | When creating a new branch, explicitly configures it to track the remote upstream branch used as the starting point.                          | `git switch -c bugfix --track origin/bugfix` |
| `--orphan`                 | Creates a new branch with absolutely no commit history, useful for publishing isolated documentation branches.                                | `git switch --orphan gh-pages`               |
| `-q`, `--quiet`            | Suppresses standard output messages, displaying only critical errors during the switch.                                                       | `git switch -q main`                         |
| `--ignore-other-worktrees` | Permits switching to a branch that is already checked out in another linked Git worktree (dangerous).                                         | `git switch --ignore-other-worktrees dev`    |

## Examples

```bash
git switch main
```

> This cleanly transitions your working directory to the state of the `main` branch. It updates the `.git/HEAD` file to point to `refs/heads/main` and replaces the files in your filesystem to match the commit at the tip of `main`.

```bash
git switch -c ticket-104 origin/main
```

> This creates a new local branch named `ticket-104` based exactly on the current state of the remote `origin/main` tracking branch, and immediately switches your active workspace to it.

```bash
git switch -
```

> Similar to `cd -` in Bash, this acts as a toggle. It switches your repository back to the previously checked-out branch. Running it twice simply bounces you back and forth between two branches.

```bash
git switch -d HEAD~5
```

> The `--detach` flag explicitly warns Git that you intend to leave the branch timeline. This checks out the repository exactly as it was 5 commits ago, allowing you to compile, test, or inspect historical code safely without moving any actual branch pointers.

```bash
git switch --orphan empty-start
```

> This creates a branch completely disconnected from the current commit graph. The first commit made on this new branch will have no parents, making it the root of an entirely independent timeline within the same repository.

## Real-World Scenarios

**Safely navigating away from dirty workspaces**

```bash
git switch -m urgent-hotfix
```

> A developer is halfway through coding a feature when a critical bug is reported. They need to switch to `urgent-hotfix`, but have uncommitted local changes. Instead of committing half-finished work or stashing, `-m` executes a rapid 3-way merge, carrying the uncommitted changes seamlessly into the hotfix branch context.

**Tapping into remote team contributions**

```bash
git switch api-refactor
```

> A colleague pushes a new branch named `api-refactor` to GitHub. After running `git fetch`, a developer types this command. Because the branch doesn't exist locally, `--guess` (active by default) automatically creates a local `api-refactor` branch, sets it to track `origin/api-refactor`, and checks it out in one fluid motion.

**Resetting a botched local branch**

```bash
git switch -C feature-x origin/feature-x
```

> A developer heavily rebases or messes up their local `feature-x` branch. To start completely fresh, they use the capital `-C` flag. This forcefully rips the local `feature-x` pointer away from its current commit, pins it exactly to the remote tracking branch, and overwrites the local filesystem.

## When should it NOT be used?

- **Reverting changes to a specific file:** Running `git switch filename.txt`. **Reason:** The `switch` command explicitly rejects file paths to prevent the exact confusion `git checkout` caused. **Use instead:** `git restore filename.txt` to discard unstaged changes in a file.
- **Checking out files from another branch:** Running `git switch main -- config.json`. **Reason:** `git switch` is strictly for moving the `HEAD` pointer, not for copying individual blobs across branches. **Use instead:** `git restore --source=main config.json`.
- **Working on older enterprise servers:** Running `git switch` in a CI/CD pipeline on RHEL 7. **Reason:** If the environment uses a Git version older than 2.23 (August 2019), the command literally does not exist. **Use instead:** The legacy `git checkout` command.

## Alternatives

- **`git checkout`:** The legacy, monolithic command. **Tradeoff:** It is universally available on all historical Git installations, but its syntax is dangerous because it seamlessly flips between branch switching and file destruction depending on whether you accidentally type a branch name or a file name.
- **`git worktree add`:** The parallel workspace tool. **Tradeoff:** Instead of constantly switching branches in a single directory (which requires recompiling binaries and swapping `node_modules`), `worktree` checks out the branch into an entirely separate physical folder on your hard drive, allowing simultaneous side-by-side development.

## How it works internally

When you execute `git switch`, Git initiates a multi-step safeguard and transition process. First, it performs a strict capability check: it compares the current index (staging area) and working directory against the target branch's tree. If switching would overwrite uncommitted local changes that aren't identical in the target branch, Git immediately aborts the operation to prevent data loss.

Once the safety check passes, Git reads the root tree object of the target branch's tip commit. It uses this tree to rewrite the binary `.git/index` file, aligning the staging area with the target branch. Next, it modifies the actual files on your hard drive to match the index—deleting files that don't exist in the new branch, updating modified ones, and leaving untracked files completely alone.

Finally, Git updates the symbolic reference. It modifies the plaintext `.git/HEAD` file. If switching to `main`, it writes `ref: refs/heads/main` into the `HEAD` file. If switching using `--detach`, it writes the raw 40-character SHA-1 commit hash into the `HEAD` file instead. The entire operation is generally an `O(N)` process bound by filesystem I/O, where N is the number of files that differ between the two branches.

## Performance Notes

- Switching between highly divergent branches requires Git to physically delete, create, and rewrite thousands of files on disk. On large monolithic repositories, this filesystem I/O can take several seconds and frequently triggers massive recompilations in build tools like Webpack or Make.
- Switching between branches that point to the exact same commit (or very similar commits) is virtually instantaneous, as Git's internal index validation bypasses touching the filesystem entirely.

## Security Notes

- **Untracked File Persistence:** `git switch` intentionally ignores files that are untracked by Git. If you have a sensitive untracked file (like a local `.env` with production keys), switching branches will leave it sitting in the directory. This is usually intended behavior, but can lead to accidental inclusion if the new branch's `.gitignore` differs.
- **Submodule Desync:** By default, `git switch` does not update nested submodules. If the target branch requires a different submodule commit, the submodule directory will appear "dirty" after the switch. You must run `git submodule update` manually unless configured otherwise.

## Common Mistakes

- **Typing `git switch <filename>` out of habit:** Developers accustomed to using `git checkout <filename>` to discard changes try to use `switch`. **Why it's wrong:** `git switch` enforces strict semantic boundaries. It will throw a fatal error stating "invalid reference". You must use `git restore` for files.
- **Losing uncommitted work with `--discard-changes`:** Using the discard flag because Git warned you about a conflict. **Why it's wrong:** This flag bypasses the safety check and aggressively overwrites your working directory. Your uncommitted code is permanently deleted and cannot be recovered via the reflog. Use `git stash` instead.
- **Committing in a detached HEAD state:** Using `git switch -d <tag>`, making commits, and switching away. **Why it's wrong:** Because no branch pointer is tracking the detached `HEAD`, the moment you switch away, those commits become orphaned. They are invisible to standard `git log` and will eventually be permanently deleted by garbage collection.

## Best Practices

- Completely alias or forget `git checkout` in your daily workflow. Build muscle memory for `git switch` (for branches) and `git restore` (for files) to eliminate the risk of accidental filesystem overwrites.
- Use `git switch -` frequently. It is the fastest, most ergonomic way to jump back and forth between a feature branch and the main trunk without having to type or copy-paste long branch names.
- When a switch is blocked by uncommitted changes, prefer stashing (`git stash` -> `git switch` -> `git stash pop`) over `git switch -m` if you are unsure of the target branch's architecture, as 3-way merges on uncommitted files can be highly confusing to untangle.

## Interview Questions

**Q:** Why did the Git maintainers introduce `git switch` in Git 2.23 when `git checkout` already worked perfectly well?
**A:** `git checkout` was heavily overloaded. It handled branch switching (operating on the `HEAD` pointer) and file restoration (operating on the working tree). This dual purpose was confusing to learn and dangerous in practice, as a typo in a branch name could unintentionally discard changes in a file with a similar name. `switch` and `restore` were introduced to split these operations safely.

**Q:** What happens internally to the `.git/HEAD` file when you run `git switch main` versus `git switch --detach main`?
**A:** When running `git switch main`, Git writes a symbolic reference into the `HEAD` file (e.g., `ref: refs/heads/main`). When you use `--detach`, Git resolves the commit that `main` points to and writes the raw 40-character SHA-1 hash directly into the `HEAD` file, completely disconnecting it from the branch pointer.

**Q:** If you run `git switch target-branch` and Git refuses, returning an error about "local changes to the following files would be overwritten," what are two safe ways to resolve this?
**A:** You can either commit the changes to your current branch before switching, or you can temporarily shelve the changes using `git stash`, perform the switch, and then use `git stash pop` to reapply them in the new context.

## Practice Problems

**Problem:** You are working on a local branch named `feature-a`. You want to check out the remote tracking branch `origin/staging` to test it, but it does not exist as a local branch yet. Write the exact command to create the local tracking branch and switch to it seamlessly.
**Hint:** If the branch name exactly matches the remote, you can rely on Git's default fallback behavior without specifying origin.
**Solution:** `git switch staging` (Git implicitly applies the `--guess` logic, sees `origin/staging`, creates the local branch, sets tracking, and switches).

**Problem:** You switched from `main` to `experiment` five minutes ago. You need to rapidly toggle back to `main` without typing its name.
**Hint:** Think of the equivalent Bash command for navigating to the previous directory (`cd -`).
**Solution:** `git switch -` (This uses the special hyphen argument to jump directly to the previously checked-out branch).

## References

- [Git - git-switch Documentation](https://git-scm.com/docs/git-switch)
- [GitHub Blog: Highlights from Git 2.23 (Introducing Switch/Restore)](https://github.blog/2019-08-16-highlights-from-git-2-23/)
  === END FILE ===
