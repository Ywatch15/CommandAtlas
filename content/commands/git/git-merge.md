---
slug: git-merge
name: git merge
aliases: []
category: git
tags: [version-control, merge, branching, integration, scm]
difficulty: intermediate
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'merge branches'
  - 'combine git branches'
  - 'join development histories'
  - 'incorporate feature branch'
  - 'resolve merge conflicts'
relatedCommands: [git-branch, git-checkout, git-cherry-pick, git-rebase, git-switch]
alternatives: [git-rebase]
status: draft
---

## What is it?

`git merge` is a core version control command used to join two or more development histories together into a single branch. It integrates changes from a target commit or branch into your current working branch, automatically synthesizing separate lines of code through a sophisticated 3-way merge algorithm.

## Why does it exist?

In collaborative software development, engineers routinely work on isolated feature branches to prevent breaking the production codebase. However, these isolated timelines must eventually be unified. `git merge` exists to reconcile divergent commit graphs. It provides an automated, historically traceable mechanism to combine modifications, preserve the chronological context of both parent branches via merge commits, and flag overlapping edits for manual resolution.

## Syntax

```bash
git merge [-n] [--stat] [--no-commit] [--edit] [--no-ff] [--ff-only]
          [--squash] [-s <strategy>] [-X <strategy-option>]
          [-m <msg>] [--into-name <branch>] [<commit>...]
git merge (--continue | --abort | --quit)
```

## Flags

| Flag                          | Description                                                                                                              | Example                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `--no-ff`                     | Creates a merge commit even if the merge could be resolved as a fast-forward, preserving branch history context.         | `git merge --no-ff feature-branch`      |
| `--ff-only`                   | Refuses to merge unless the current branch is an ancestor of the target, preventing any non-fast-forward merge commits.  | `git merge --ff-only origin/main`       |
| `--squash`                    | Combines all changes from the target branch into a single staging-area delta without creating an immediate merge commit. | `git merge --squash feature-auth`       |
| `-m`, `--msg`                 | Specifies the commit message to be used for the generated merge commit.                                                  | `git merge -m "Merge login feature"`    |
| `--no-commit`                 | Performs the merge integration but stops right before writing the commit, allowing manual inspection or file edits.      | `git merge --no-commit feature-ui`      |
| `-s`, `--strategy=`           | Selects a specific merging strategy (e.g., `ort`, `recursive`, `octopus`, `ours`, `theirs`).                             | `git merge -s recursive -X patience`    |
| `-X`, `--strategy-option=`    | Passes a strategy-specific option (like `ours` or `theirs` conflict resolution) to the chosen merge strategy.            | `git merge -X theirs feature-api`       |
| `--stat`                      | Displays a diffstat summary (files changed, insertions, deletions) at the end of the merge operation.                    | `git merge --stat feature-docs`         |
| `--abort`                     | Aborts the current merge process, resets the index, and restores the working tree to the pre-merge state.                | `git merge --abort`                     |
| `--continue`                  | Resumes a paused merge operation after the user has manually resolved conflicts and staged the affected files.           | `git merge --continue`                  |
| `--allow-unrelated-histories` | Forces Git to merge two projects that share no common commit ancestor (useful when joining independent repositories).    | `git merge --allow-unrelated-histories` |

## Examples

```bash
git merge feature-login
```

> This merges the commits from the `feature-login` branch into your currently checked-out branch. If your current branch has not advanced since the feature branch was branched, Git performs a fast-forward merge by simply sliding the branch pointer forward.

```bash
git merge --no-ff feature-payment
```

> This forces Git to generate a formal merge commit even if a fast-forward merge was mathematically possible. This is commonly used in professional workflows to ensure the permanent graphical preservation of feature branch boundaries in the commit history graph.

```bash
git merge --squash feature-experimental
```

> This collapses all individual, messy commits from the `feature-experimental` branch into a single uncommitted set of file modifications staged in your working directory, allowing you to craft one clean, atomic commit.

```bash
git merge -X theirs hotfix-db
```

> This initiates a merge while instructing Git's internal strategy engine to automatically favor changes from the incoming branch (`hotfix-db`) whenever an overlapping file conflict occurs, bypassing manual file edits.

```bash
git merge --abort
```

> If a merge operation encounters complex conflicts and you become overwhelmed or wish to abandon the integration attempt entirely, this command instantly resets your working tree and index back to the exact clean state before the merge began.

## Real-World Scenarios

**Integrating completed feature branches into main**

```bash
git checkout main && git merge --no-ff feature/user-profile
```

> When a pull request is approved, the maintainer checks out the primary production branch and merges the feature branch using `--no-ff`. This guarantees that a distinct merge node appears in the project graph, explicitly marking the integration lifecycle of that specific feature.

**Unifying divergent local and remote timelines**

```bash
git merge origin/main
```

> When working collaboratively without rebasing, an engineer checks out their local branch and merges the newly fetched remote tracking branch. This combines upstream changes into their local workspace, generating a merge commit if both timelines have progressed independently.

**Joining two historically independent open-source repositories**

```bash
git merge upstream/main --allow-unrelated-histories
```

> When an organization acquires another project or merges an independent code repository into a monorepo, the commit histories do not share an origin root. Using `--allow-unrelated-histories` bypasses safety checks, forcing Git to calculate a valid merge across completely disjoint graphs.

## When should it NOT be used?

- **Maintaining a strictly linear, noise-free commit history:** Using default fast-forward or merging across long-lived branches without `--no-ff`. **Reason:** Uncontrolled merging creates a messy web of intersecting commit lines that make `git log` difficult to audit. **Use instead:** `git rebase` or strict pull-request rebase-and-merge workflows.
- **Integrating incomplete, messy work-in-progress:** Merging a feature branch filled with hundreds of broken "fix typo" or "test" commits directly into production. **Reason:** It pollutes the production timeline with uninformative historical debris. **Use instead:** Interactive rebase (`git rebase -i`) to squash commits before executing the merge.
- **Attempting to resolve unknown merge conflicts blindly:** Forcing a merge when you do not understand the architectural divergence. **Reason:** Blindly accepting `--strategy-option theirs` can silently overwrite critical production logic with outdated code. **Use instead:** Careful manual resolution or aborting via `git merge --abort`.

## Alternatives

- **`git rebase`:** The primary alternative workflow integration tool. **Tradeoff:** `rebase` rewrites local history by replaying your commits on top of another branch tip, producing a clean, perfectly linear history without merge commits. However, it rewrites commit hashes, making it dangerous to use on public, shared branches because it desynchronizes team timelines.
- **`git pull`:** A macro command that combines `git fetch` and `git merge` (or `git rebase`). **Tradeoff:** `git pull` is convenient for syncing with a remote server in one step, but abstracts away the explicit control you have when executing `git fetch` followed by a deliberate, inspected `git merge`.

## How it works internally

When you execute `git merge`, Git begins by locating the common ancestor of the two branches you are attempting to combine. This specialized ancestor commit is known as the **merge base**. Git calculates this by analyzing the commit DAG (Directed Acyclic Graph) to find the latest point in history where the two branch pointers shared an identical lineage.

Once the merge base is established, Git performs a **3-way merge algorithm** (powered by the default `ort` strategy engine, which replaced the legacy `recursive` strategy). It compares three distinct file states:

1. The state of the files at the **merge base**.
2. The state of the files at the tip of the **current branch** (`HEAD`).
3. The state of the files at the tip of the **incoming branch** being merged.

If a file was modified in both branches since the merge base in conflicting ways (e.g., the exact same line was altered differently), Git cannot mathematically resolve the delta. It halts the process, writes standard conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) directly into the affected files in the working directory, updates the index with three distinct stages for those files, and exits with a non-zero status code (`1`).

If no conflicts are found, Git automatically generates a new tree object representing the merged filesystem state, writes a new commit object containing two parent pointers (the current `HEAD` and the incoming branch tip), updates the branch reference pointer to this new commit, and refreshes the working tree.

## Performance Notes

- Merging massive repositories with hundreds of thousands of tracked files requires the 3-way merge algorithm to compute extensive tree diffs, which can take several seconds of intensive CPU processing and memory allocation.
- Using specialized strategy options like `-X patience` or `-X histogram` invokes advanced longest-common-subsequence algorithms to resolve tricky code rearrangements, which consume slightly more CPU cycles than the default Myers diff algorithm but yield significantly cleaner merge results.

## Security Notes

- **Malicious Merge Drivers:** Advanced Git configurations allow users to define custom external merge drivers in `.gitconfig`. If a repository contains a compromised or untrusted `.gitattributes` file that forces the execution of a malicious custom merge driver upon running `git merge`, it can lead to arbitrary code execution on your local machine.
- **Unverified Code Ingestion:** Executing `git merge` blindly incorporates foreign code into your active working directory and index. If an attacker pushes a malicious commit to a feature branch that you merge without code review, those vulnerabilities are immediately integrated into your local build environment.

## Common Mistakes

- **Merging into the wrong branch:** Running `git merge feature-branch` while still checked out on `main` when you meant to merge `main` into `feature-branch`. **Why it's wrong:** This applies the feature changes directly to production `main` prematurely. You must immediately undo this by resetting the branch pointer (`git reset --hard HEAD~1` if committed) or aborting.
- **Committing conflict markers directly:** Seeing conflict markers in a file, editing the code, but forgetting to delete the `<<<<<<<` lines before committing. **Why it's wrong:** Git does not automatically check if conflict markers remain; it commits them as literal text, breaking compilation and syntax parsers. Always verify files are clean before running `git commit`.
- **Forgetting to stage resolved conflict files:** Editing conflicted files during a merge pause, and immediately typing `git commit` without running `git add`. **Why it's wrong:** Git keeps conflicted files in a special unmerged index state. You must explicitly run `git add` on the resolved files to clear the conflict flags before Git will allow you to complete the merge.

## Best Practices

- Always ensure your working directory and staging area are completely clean (via `git status`) before initiating a merge. A clean workspace prevents your uncommitted local edits from tangling with incoming merge changes.
- When merging untrusted or massive feature branches, run the merge with `--no-commit` or `--no-ff`. This grants you a manual inspection window to run your local test suite and audit the file changes before the merge commit is permanently written to history.
- Establish a team standard regarding merge strategies. Decide whether your organization uses fast-forwards, explicit merge commits (`--no-ff`), or rebasing, and enforce it via repository rules to prevent a fragmented, chaotic commit graph.

## Interview Questions

**Q:** What is a "merge base," and why is it critical to the operation of `git merge`?
**A:** A merge base is the most recent common ancestor commit shared by the current branch and the branch being merged, found by analyzing the commit DAG. It is critical because Git's 3-way merge algorithm compares the state of the files at the merge base against the tips of both branches to isolate what changed independently on each side, allowing it to merge changes automatically without human intervention.

**Q:** What is the technical difference between a fast-forward merge and a true 3-way merge?
**A:** A fast-forward merge occurs when the current branch pointer is an direct ancestor of the branch being merged; Git simply slides the branch pointer forward to the target commit without creating a new commit object. A 3-way merge occurs when the two branches have diverged (both have unique commits since their common ancestor); Git must synthesize a new merge commit containing two parent pointers to reconcile the two timelines.

**Q:** When Git halts a merge due to conflicts, what happens inside the `.git/index` (staging area), and how does Git track that a file is conflicted?
**A:** During a conflict, Git stores up to three different versions of the conflicted file in the index simultaneously, corresponding to different stage numbers: stage 1 (the common ancestor/merge base), stage 2 (the current branch version, `OURS`), and stage 3 (the incoming branch version, `THEIRS`). Resolving the conflict via `git add` overwrites these stages with a single normal file entry, clearing the conflict state.

## Practice Problems

**Problem:** You are merging a branch named `feature-cart` into your current branch. You want to ensure that Git _always_ creates a visible merge node in the history graph, even if the branch could technically be fast-forwarded.
**Hint:** Use the flag that explicitly prohibits fast-forward integrations.
**Solution:** `git merge --no-ff feature-cart` (This forces Git to synthesize a formal merge commit, preserving the structural boundaries of the feature branch).

**Problem:** You initiated a merge, encountered a series of complex file conflicts, and decided you want to completely cancel the entire operation and return your repository to the exact pristine state it was in before you typed `git merge`.
**Hint:** Look for the dedicated abort flag designed to reset index and working tree states during a failed merge.
**Solution:** `git merge --abort` (This terminates the merge state machine, clears unmerged index entries, and rolls back the working directory).

## References

- [Git - git-merge Documentation](https://git-scm.com/docs/git-merge)
- [Pro Git Book: Git Branching - Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [Git Internals - Merge Strategies](https://git-scm.com/docs/git-merge#_merge_strategies)
  === END FILE ===
