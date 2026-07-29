---
slug: commit
name: commit
category: git
difficulty: beginner
supportedOS: [linux, macos]
status: published
---

## What is it?

`commit` records a snapshot of the index to the repository's history.

## Why does it exist?

Version control requires a mechanism to checkpoint work. `git commit` is that mechanism.

## Syntax

```bash
git commit -m "message"
```

## Flags

| Flag      | Description                    | Example                    |
| --------- | ------------------------------ | -------------------------- |
| `-m`      | Set the commit message inline  | `git commit -m "fix typo"` |
| `--amend` | Replace the most recent commit | `git commit --amend`       |

## Examples

```bash
git commit -m "feat: add user authentication"
```

> Commits all staged changes with the given message.

## Real-World Scenarios

Use `git commit` after staging changes with `git add`. In a team workflow, each commit should represent one logical, reviewable unit of work.

## When should it NOT be used?

Do not commit directly to `main` in a shared repository. Use feature branches and pull requests instead.

## Alternatives

No direct alternative to committing — it is the fundamental operation of Git.

## How it works internally

Git creates a commit object pointing to the current tree (index snapshot), the parent commit(s), and metadata (author, timestamp, message).

## Performance Notes

Commits are O(1) in repository size — they do not copy the working tree, only reference the current index state.

## Security Notes

Commit messages and author metadata are permanently part of the Git history. Do not include secrets, passwords, or sensitive data in commit messages.

## Common Mistakes

Forgetting to `git add` before committing results in an empty commit. Use `git status` before committing to confirm what is staged.

## Best Practices

Write commit messages in the imperative mood ("Add feature", not "Added feature"). Keep the subject line under 72 characters.

## Interview Questions

**Q:** What is the difference between `git commit` and `git push`?
**A:** `git commit` records a snapshot in the local repository. `git push` uploads local commits to a remote repository.

## Practice Problems

**Problem:** Create a commit that amends the most recent commit message without changing any files.
**Hint:** Use the `--amend` flag with `-m`.
**Solution:** `git commit --amend -m "corrected message"`

## References

- [git-commit documentation](https://git-scm.com/docs/git-commit)
