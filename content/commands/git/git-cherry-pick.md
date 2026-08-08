---
slug: git-cherry-pick
name: git cherry-pick
aliases: []
category: git
tags: [version-control, commit-graph, integration, cherry-pick, scm]
difficulty: intermediate
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'apply single commit to branch'
  - 'cherry pick git commit'
  - 'copy commit from another branch'
  - 'port fix to release branch'
  - 'select specific commit to merge'
relatedCommands: [git-commit, git-log, git-merge, git-rebase, git-revert]
alternatives: [git-rebase]
status: draft
---

## What is it?

`git cherry-pick` is a version control command used to take the introduction of changes from a specific commit on one branch and apply it as a new commit onto your currently checked-out branch. It isolates individual commit patches without requiring a full branch merge.

## Why does it exist?

Merging an entire branch brings over every commit, including unrelated experimental or broken code. Historically, developers needed a way to selectively backport critical bug fixes or specific features to older release or stable branches without cross-contaminating histories. `git cherry-pick` was built to extract an isolated commit delta and replay it onto a completely different timeline.

## Syntax

```bash
git cherry-pick [--edit] [-n] [-m parent-number] [-s] [-x] [--ff]
                [-S[<keyid>]] <commit>...
git cherry-pick (--continue | --skip | --abort | --quit)
```

## Flags

| Flag                               | Description                                                                                        | Example                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `-e`, `--edit`                     | Edits the commit message before applying the picked change.                                        | `git cherry-pick -e <commit>`         |
| `-n`, `--no-commit`                | Applies the changes to the working tree and index without creating the final commit.               | `git cherry-pick -n <commit>`         |
| `-x`                               | Appends a "cherry picked from commit ..." trail to the generated commit message for attribution.   | `git cherry-pick -x <commit>`         |
| `-s`, `--signoff`                  | Adds a Signed-off-by trailer by the committer at the end of the commit message.                    | `git cherry-pick -s <commit>`         |
| `-m`, `--mainline <parent-number>` | Specifies the parent number when cherry-picking a merge commit.                                    | `git cherry-pick -m 1 <merge-commit>` |
| `--ff`                             | Performs a fast-forward if the current HEAD is an ancestor of the commit being picked.             | `git cherry-pick --ff <commit>`       |
| `--abort`                          | Aborts the cherry-pick operation, resetting the index and working tree to pre-pick state.          | `git cherry-pick --abort`             |
| `--continue`                       | Resumes the cherry-pick process after resolving manual merge conflicts.                            | `git cherry-pick --continue`          |
| `--skip`                           | Skips the current commit and proceeds with the rest of the sequence when picking multiple commits. | `git cherry-pick --skip`              |
| `-S`, `--gpg-sign[=<keyid>]`       | GPG-signs the newly generated commit.                                                              | `git cherry-pick -S <commit>`         |
| `-X`, `--strategy-option=<option>` | Passes merge strategy options like `ours` or `theirs` to resolve conflicts automatically.          | `git cherry-pick -X theirs <commit>`  |

## Examples

```bash
git cherry-pick a1b2c3d
```

> This extracts the patch introduced by commit `a1b2c3d` and applies it as a brand-new commit on your current branch, utilizing the original commit message.

```bash
git cherry-pick -n e4f5g6h
```

> This applies the changes from commit `e4f5g6h` directly to your working directory and staging area without committing them, allowing you to review or combine the patch with other edits.

```bash
git cherry-pick -x b7c8d9e
```

> This picks the specified commit while automatically appending a reference note to the commit message indicating the original commit hash, which helps maintain audit trails across divergent branches.

```bash
git cherry-pick commitA commitC
```

> This applies a sequence of specific non-contiguous commits onto your active branch one after another, creating two new sequential commits on your timeline.

```bash
git cherry-pick -m 1 9f8e7d6
```

> This picks a merge commit (`9f8e7d6`), using the `-m 1` flag to inform Git which parent branch timeline (`1` for mainline) it should use as the baseline to calculate the diff.

## Real-World Scenarios

**Backporting a critical security patch to a production release branch**

```bash
git checkout release-v1.0 && git cherry-pick -x abc1234
```

> When a severe vulnerability is patched on the `main` development branch, engineers use `cherry-pick` to extract only that specific security fix commit and apply it directly to the active production release branch without pulling over unstable feature code.

**Rescuing an isolated commit from a deleted branch**

```bash
git switch main && git cherry-pick 7f8a9b0
```

> If a developer pushes a useful utility function on a feature branch that is subsequently abandoned or deleted, they can use `git reflog` to find the commit hash and cherry-pick it directly onto `main` to save the work.

**Applying a single fix across multiple parallel versions**

```bash
git switch v2-branch && git cherry-pick -s 4d5e6f7
```

> Maintenance teams managing multiple active software versions use `cherry-pick` with the sign-off flag (`-s`) to port a verified bug fix across several version branches efficiently.

## When should it NOT be used?

- **Integrating an entire long-lived feature branch:** Running `git cherry-pick` for dozens of sequential commits from a massive feature branch. **Reason:** It duplicates every commit with new SHA-1 hashes, divorcing the history graphs and making future merges between those branches catastrophic. **Use instead:** `git merge` or `git rebase`.
- **Backporting changes with massive architectural divergence:** Attempting to cherry-pick a commit onto a branch whose codebase has structurally shifted completely. **Reason:** It results in unmanageable, overlapping merge conflicts across nearly every file. **Use instead:** Manually rewriting the fix or rebasing the underlying feature branch.

## Alternatives

- **`git rebase --onto`:** A powerful history-rewriting command. **Tradeoff:** `rebase --onto` allows you to transplant an entire contiguous range of commits onto a new base in one step, whereas `cherry-pick` requires specifying explicit hashes or ranges manually, though cherry-pick is safer for isolated, non-contiguous picking.
- **`git format-patch` + `git am`:** Creating and applying patch files. **Tradeoff:** Generating a raw patch file and applying it via `git am` is exceptionally useful for offline code contributions or email-based workflows, but involves disk I/O overhead compared to native in-memory cherry-picking.

## How it works internally

When you execute `git cherry-pick <commit>`, Git treats the operation similarly to a specialized 3-way merge. First, it identifies the target commit and extracts its diff relative to its immediate parent.

Next, Git treats this diff as a patch and attempts to apply it to your current `HEAD` commit. It runs the standard `ort` merge strategy engine, comparing three tree states: the parent of the picked commit, the commit itself, and your current working branch tip. If the files have not changed significantly since the picked commit's parent, Git cleanly applies the changes, stages them, and automatically generates a brand-new commit object with a unique SHA-1 hash, updating the branch reference pointer.

If a conflict occurs, Git halts execution, leaves conflict markers in the working tree files, updates the index with unmerged entries, and exits with a status code of `1`. You must resolve the files, stage them via `git add`, and run `git cherry-pick --continue` to finalize the new commit.

## Performance Notes

- Cherry-picking a single commit with clean file states is an instantaneous operation bound only by rapid internal database object lookups and index writes.
- Picking long sequences of commits or cherry-picking across heavily diverged branches forces Git to calculate numerous 3-way merges sequentially, which can dramatically increase CPU overhead and prompt frequent conflict pauses.

## Security Notes

- **Hash Mutation and Integrity:** Because `cherry-pick` generates a brand-new commit object with a distinct SHA-1 hash and a new timestamp, it alters the cryptographic history chain. If the original commit was GPG-signed, the cherry-picked commit loses that signature unless explicitly re-signed using `-S`.
- **Injection via Conflict Resolution:** When resolving complex cherry-pick conflicts, developers may inadvertently accept insecure or vulnerable code patterns from incoming patches, bypassing standard code review and pull-request safeguards.

## Common Mistakes

- **Leaving the repository in a half-picked conflict state:** Forgetting to run `git cherry-pick --continue` or `--abort` after resolving conflicts. **Why it's wrong:** Leaving the repository in an active cherry-pick state blocks other Git operations (like pulling or switching branches). Always finalize or abort.
- **Cherry-picking an already merged commit:** Picking a commit that is already part of the current branch's history. **Why it's wrong:** This introduces duplicate changes, resulting in redundant code or unnecessary merge conflicts when the branches eventually meet.
- **Picking a merge commit without specifying a parent:** Running `git cherry-pick <merge-commit>` without `-m`. **Why it's wrong:** A merge commit has two parents, meaning Git cannot mathematically determine which baseline branch timeline you want to diff against. The command will fail until you designate a mainline parent number.

## Best Practices

- Always use the `-x` flag when cherry-picking commits in a multi-developer team environment to preserve traceability back to the original commit hash.
- Ensure your working tree and staging area are entirely clean (`git status`) before initiating a cherry-pick to prevent unintended mixing of files.
- When porting multiple sequential commits, consider using `git cherry-pick A^..B` (where `A^` is the parent of the first commit) rather than typing individual hashes manually, ensuring all intermediate steps are captured accurately.

## Interview Questions

**Q:** What is the fundamental difference between `git merge` and `git cherry-pick`?
**A:** `git merge` combines two entire branch histories by finding their common ancestor and integrating all divergent commits up to their tips. `git cherry-pick` extracts a single, isolated commit from anywhere in the commit graph and replays its exact patch onto your current branch as a brand-new commit, ignoring all other history on the source branch.

**Q:** Why does cherry-picking a merge commit require the `-m` (mainline) flag, and how does it function?
**A:** A merge commit has multiple parents (at least two), representing the branches that were joined. Because a merge commit records the _result_ of a combination rather than a single linear change, Git needs you to specify the `-m <parent-number>` flag to indicate which parent branch should be treated as the mainline baseline to calculate the diff.

**Q:** If a `git cherry-pick` halts due to merge conflicts, how do you completely cancel the operation and return your repository to its pre-pick state?
**A:** You run `git cherry-pick --abort`. This command terminates the active cherry-pick state machine, discards uncommitted index resolutions, and restores your working directory and `HEAD` pointer to the exact clean state before the command was executed.

## Practice Problems

**Problem:** You need to apply a single specific commit with the hash `c0ffee1` onto your current feature branch, but you want to review the changes in your staging area first without creating the commit automatically.
**Hint:** Use the flag that applies the patch without finalizing the commit.
**Solution:** `git cherry-pick -n c0ffee1` (This stages and applies the file deltas to your workspace, leaving you free to inspect or modify them before committing manually).

**Problem:** You are cherry-picking a sequence of three commits, but the second commit throws an unmanageable conflict and you want to abandon that specific commit entirely while continuing to process the third commit.
**Hint:** Look for the flag designed to discard the active problematic commit during a multi-commit sequence.
**Solution:** `git cherry-pick --skip` (This abandons the conflicting commit and automatically advances the cherry-pick state machine to process the next commit in the queue).

## References

- [Git - git-cherry-pick Documentation](https://git-scm.com/docs/git-cherry-pick)
- [Pro Git Book: Git Tools - Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
  === END FILE ===
