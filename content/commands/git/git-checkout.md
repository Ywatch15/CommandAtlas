---
slug: git-checkout
name: git checkout
aliases: []
category: git
tags:
  - git-checkout
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
  - switch to another branch
  - create a new git branch
  - discard local changes to a file
  - go back to a previous commit
  - resolve merge conflicts using ours or theirs
relatedCommands:
  [
    git-archive,
    git-bisect,
    git-merge,
    git-reflog,
    git-reset,
    git-restore,
    git-stash,
    git-tag,
    git-worktree,
  ]
alternatives: [git-restore]
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`git checkout` is a dual-purpose version control command used primarily to switch between different branches or to restore files in the working directory to a previous state. When operating on branches, it updates the files in your working directory to match the target branch and updates the `HEAD` pointer to track it. When operating on specific files, it replaces your local, uncommitted modifications with the version stored in the Git index or a specified commit, effectively discarding uncommitted work.

## Why does it exist?

Historically, `git checkout` was designed as Git's "Swiss Army knife" for manipulating the working tree and the `HEAD` reference. Because Git stores files as compressed blobs in an immutable object database, a mechanism was required to extract those blobs, inflate them, and write them to the physical filesystem so developers could interact with them. Over time, the command's dual mandate—switching branches (context switching) and discarding local changes (destructive file restoration)—became a frequent source of confusion. This historical design quirk directly led to the introduction of the isolated `git switch` and `git restore` commands in Git 2.23.

## Syntax

```bash
# Branch switching and creation
git checkout [options] <branch>

# File restoration
git checkout [options] [<tree-ish>] [--] <pathspec>...
```

## Flags

| Flag                          | Description                                                                                                               | Example                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `-b <new-branch>`             | Creates a new branch and immediately switches the `HEAD` pointer and working tree to it.                                  | `git checkout -b feature/auth`                         |
| `-B <new-branch>`             | Creates the branch and switches to it; if the branch already exists, it resets it to the current starting point.          | `git checkout -B main origin/main`                     |
| `-f`, `--force`               | Forces the checkout, aggressively throwing away all uncommitted local modifications in the working tree.                  | `git checkout -f main`                                 |
| `-m`, `--merge`               | Attempts a three-way merge between your local modifications, the current branch, and the target branch when switching.    | `git checkout -m feature/ui`                           |
| `--detach`                    | Checks out a commit directly rather than a branch name, deliberately putting the repository into a "detached HEAD" state. | `git checkout --detach v2.0`                           |
| `-p`, `--patch`               | Opens an interactive prompt allowing you to selectively restore specific hunks of code rather than the whole file.        | `git checkout -p HEAD -- app.js`                       |
| `--ours`                      | During a merge conflict, checks out the version of the file from the current branch, discarding the incoming changes.     | `git checkout --ours config.yml`                       |
| `--theirs`                    | During a merge conflict, checks out the version of the file from the incoming (merged) branch, discarding local changes.  | `git checkout --theirs config.yml`                     |
| `-t`, `--track`               | When creating a new branch based on a remote tracking branch, automatically sets the upstream configuration.              | `git checkout -t origin/feature`                       |
| `--orphan <new-branch>`       | Creates a completely new branch with no parent commit, initiating an entirely disconnected project history.               | `git checkout --orphan gh-pages`                       |
| `--ignore-skip-worktree-bits` | Forces the checkout of a file even if it is currently hidden by sparse-checkout rules.                                    | `git checkout --ignore-skip-worktree-bits -- file.txt` |

## Examples

```bash
git checkout develop
```

> Switches the active workspace to the `develop` branch. Git safely replaces the files in your working directory to match the commit that `develop` points to, and updates `.git/HEAD` to point to `refs/heads/develop`.

```bash
git checkout -b hotfix/db-crash
```

> Creates a new branch named `hotfix/db-crash` starting from the current `HEAD`, and instantly switches to it. This is functionally equivalent to running `git branch hotfix/db-crash` followed by `git checkout hotfix/db-crash`.

```bash
git checkout -- database.yml
```

> Discards all uncommitted changes in `database.yml`, reverting it to the state currently tracked in the Git index (the staging area). The `--` is syntactically used to separate options/branches from file paths, preventing ambiguity if you had a branch also named "database.yml".

```bash
git checkout HEAD~3 -- src/components/Button.jsx
```

> Extracts the specific version of `Button.jsx` as it existed 3 commits ago (`HEAD~3`) and overwrites the file in your working directory. This _does not_ change your current branch; it merely stages this older version of the file for a new commit.

```bash
git checkout -p
```

> Enters an interactive patch mode for the entire working directory. Git will present each modified block of code and ask if you want to discard it (restore the index version) or keep your local change. Highly useful for surgical reverting.

## Real-World Scenarios

**Resolving Massive Merge Conflicts**

```bash
git checkout --theirs package-lock.json
git add package-lock.json
```

> When rebasing or merging, autogenerated files like `package-lock.json` or `yarn.lock` often throw massive, unreadable conflicts. Instead of manually editing the file, developers use `--theirs` to entirely accept the incoming branch's lockfile, completely bypassing the manual conflict resolution phase.

**Historical Auditing (Detached HEAD)**

```bash
git checkout v1.4.2
# Compile, run tests, debug...
git checkout main
```

> If a critical bug is reported in an older software version, a developer can checkout the exact release tag. This drops Git into a "detached HEAD" state, decoupling the working directory from active branch development. They can compile and debug the exact code shipped in `v1.4.2` without permanently altering the repository history, returning to `main` when finished.

**Scaffolding Unrelated Subprojects**

```bash
git checkout --orphan gh-pages
git rm -rf .
```

> To host documentation via GitHub Pages from the same repository as the source code, engineers create an "orphan" branch. This creates a completely disconnected branch history with no parent. Running `git rm -rf .` afterward provides a completely clean slate to start committing HTML files without inheriting the software's commit history.

## When should it NOT be used?

- **Modern Workflows:** **Do not use `git checkout` if you are on Git 2.23 or newer.** It is considered best practice to adopt `git switch` for changing branches and `git restore` for reverting file changes. The explicit syntax eliminates the risk of accidentally discarding uncommitted work when a branch name and a file name collide.
- **Unstaging Files:** **Do not use `git checkout` to remove a file from the staging area.** `git checkout` overwrites the working tree. To unstage a file (move it from the index back to the working directory) while keeping your physical modifications intact, use `git restore --staged <file>` or `git reset HEAD <file>`.
- **Moving Branch Pointers:** **Do not use `git checkout` to forcefully move an existing branch to a new commit without switching.** If you want to repoint `feature-A` to `main` without checking it out, use `git branch -f feature-A main`.

## Alternatives

- **`git switch`:** **Best for branch navigation.** Introduced to split the overloaded checkout command, `switch` strictly handles changing branches or creating new ones. It will violently reject attempts to modify specific file paths, preventing accidental data loss.
- **`git restore`:** **Best for file manipulation.** Strictly handles restoring files in the working tree or index to a specified state, making commands like `git restore --staged` vastly more intuitive than legacy `checkout`/`reset` combinations.
- **`git reset`:** **Best for manipulating commit history.** While `checkout -- file` modifies the working tree directly, `git reset` modifies the staging area (index) and the commit graph, only touching the working tree if the dangerous `--hard` flag is applied.

## How it works internally

When executing a branch switch (e.g., `git checkout main`), Git performs a complex series of state checks and I/O operations. It compares the current `HEAD` commit, the index (staging area), and the target branch (`main`). It runs a two-way merge algorithm in memory to ensure that any local modifications in your working tree that do not conflict with the target branch are carried over safely. If a conflict exists, Git aborts the checkout to prevent data loss (unless `-f` is supplied).

If the operation is deemed safe, Git reads the tree object associated with the target commit. It pulls the corresponding zlib-compressed blobs from the `.git/objects` directory, inflates them, and updates the file inodes on the disk. Finally, it modifies the `.git/HEAD` file, replacing its contents (e.g., `ref: refs/heads/feature`) with the new pointer (`ref: refs/heads/main`).

When checking out a specific file (e.g., `git checkout -- file.txt`), the process is completely different. Git does not update `.git/HEAD`. Instead, it reads the blob hash for `file.txt` directly from the index (or the provided tree-ish, like `HEAD~1`), extracts the blob from the object database, and overwrites the file on disk. This completely bypasses the two-way safety merge, making file checkout an inherently destructive operation for uncommitted local changes.

## Performance Notes

- **I/O Bottlenecks:** Switching branches in a massive repository with hundreds of thousands of files requires Git to delete, modify, and rewrite thousands of inodes on the filesystem. This makes `git checkout` heavily disk I/O bound.
- **Sparse Checkouts:** In massive monorepos, performance is drastically improved by configuring sparse-checkouts (`git sparse-checkout`). This instructs the checkout mechanism to only populate specific directories (e.g., `/backend`) in the working tree, ignoring the extraction of blobs for unrelated project structures.

## Security Notes

- **Smudge Filter Execution:** When checking out files, Git parses `.gitattributes` and processes files through configured "smudge" filters (scripts designed to alter file contents upon checkout, like decrypting secrets or changing line endings). A malicious repository can execute arbitrary shell code on your machine simply by you running `git checkout`.
- **Executable Permissions:** Git tracks the executable bit (`chmod +x`). When checking out a repository, Git will automatically apply executable permissions to files as dictated by the commit. Ensure you trust the repository before blindly executing shell scripts that were just checked out.

## Common Mistakes

- **Losing Commits in Detached HEAD**
  - _Mistake:_ Running `git checkout <commit-hash>`, making changes, running `git commit`, and then typing `git checkout main`.
  - _Why:_ Because you were not on a branch, your new commit was not attached to any named reference. When you switched back to `main`, the commit became orphaned. You must use `git reflog` to find its hash and attach a branch to it to recover it.
- **Path and Branch Ambiguity**
  - _Mistake:_ Having a branch named `config` and a directory named `config`, and typing `git checkout config`.
  - _Why:_ Git will default to switching to the branch. If your intention was to discard local changes in the `config` directory, you must disambiguate using the double-dash: `git checkout -- config`.
- **Force Checkout Devastation**
  - _Mistake:_ Hitting an error about local changes preventing a branch switch, and blindly appending `-f` (`git checkout -f new-branch`).
  - _Why:_ The `-f` flag tells the underlying `git-read-tree` operation to aggressively wipe out any uncommitted modifications. Unlike committed code, discarded local changes cannot be recovered via `reflog`.

## Best Practices

- **Stash Before Switching:** If you have half-finished work and need to switch branches to address an urgent PR review, do not rely on Git's automatic state-carrying. Run `git stash`, then `git checkout <branch>`. This guarantees your working tree is clean and avoids unexpected cross-branch contamination.
- **Adopt `--` Separators:** Train yourself to always use `--` when checking out files (e.g., `git checkout HEAD -- src/`). It instantly communicates intent to other developers (and to Git itself) that this is a destructive file operation, not a context switch.
- **Use `switch` and `restore`:** If your team uses Git 2.23 or newer, actively alias or transition your muscle memory to `git switch` and `git restore`. Their singular, explicit behaviors dramatically reduce the cognitive load and error rates for junior engineers.

## Interview Questions

**Q: What exactly is a "detached HEAD" state, and what happens if you commit in this state?**
**A:** A detached HEAD state means the `.git/HEAD` file points directly to a raw commit hash rather than a branch reference (like `refs/heads/main`). You can author commits in this state, but because no branch pointer is automatically moving forward to track them, those commits will become "orphaned" and effectively invisible as soon as you checkout a different branch.

**Q: Explain the difference between `git checkout -b branch_name` and `git branch branch_name`.**
**A:** `git branch branch_name` creates a new branch pointer at the current commit, but leaves your working directory and `HEAD` untouched (you remain on your original branch). `git checkout -b branch_name` performs that creation step and immediately executes a branch switch, updating `HEAD` and your working tree to the newly created branch.

**Q: You want to discard all local modifications in your current directory, but leave newly created (untracked) files alone. Which command do you use?**
**A:** You use `git checkout -- .`. This command reads the index and overwrites the modified files in the working directory. Because newly created, untracked files do not exist in the index, `git checkout` ignores them completely.

## Practice Problems

**Problem:** You are working on the `main` branch, but realize your current uncommitted changes belong in a new feature branch. Write the command to create a new branch called `feature-login` and switch to it, carrying your uncommitted changes with you.
**Hint:** There is a single-letter flag that combines branch creation and switching.
**Solution:**

```bash
git checkout -b feature-login
```

**Problem:** You modified a file at `src/utils/math.js` but made a horrible mistake. Write the command to completely discard your local changes to this specific file, reverting it to the state of your last commit, while ensuring Git doesn't confuse the filename with a branch name.
**Hint:** Use the separator that explicitly tells Git the following argument is a pathspec, not a branch reference.
**Solution:**

```bash
git checkout -- src/utils/math.js
```

## References

- [git-checkout(1) Manual Page](https://git-scm.com/docs/git-checkout)
- [Pro Git Book: Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [GitHub Blog: Highlights from Git 2.23 (Switch and Restore)](https://github.blog/2019-08-16-highlights-from-git-2-23/)
