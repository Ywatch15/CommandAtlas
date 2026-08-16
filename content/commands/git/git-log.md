---
slug: git-log
name: git log
aliases: []
category: git
tags:
  - version-control
  - history
  - inspection
  - commit-graph
  - scm
difficulty: beginner
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
  - view commit history
  - show git log
  - check past commits
  - find who changed a line
  - search git history
relatedCommands:
  - git-bisect
  - git-blame
  - git-cherry-pick
  - git-diff
  - git-reflog
  - git-shortlog
  - git-show
  - git-status
  - git-tag
alternatives:
  - git-bisect
  - git-blame
  - git-reflog
  - git-shortlog
  - git-show
status: draft
---

## What is it?

`git log` is a core version control command used to explore, filter, and inspect the chronological commit history of a repository. It traverses the commit graph backwards from a specified reference pointer, presenting metadata such as author identities, timestamps, and commit messages.

## Why does it exist?

Centralized version control systems stored changes as flat, sequential file revisions or simple database tables. Git's distributed architecture relies on a Directed Acyclic Graph (DAG) of cryptographic commit snapshots. `git log` exists to traverse this complex DAG structure safely, giving developers an interface to query time-based states, track authorship, and audit how code evolved across branches.

## Syntax

```bash
git log [<options>] [<revision-range>] [[--] <path>...]
```

## Flags

| Flag                          | Description                                                                                          | Example                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| `-n`, `--max-count=<number>`  | Limits the output to a specific maximum number of commits.                                           | `git log -n 5`                 |
| `--oneline`                   | Condenses each commit to a single line showing the abbreviated hash and subject message.             | `git log --oneline`            |
| `--graph`                     | Draws a text-based ASCII graph of the branch and merge history alongside the commit output.          | `git log --graph`              |
| `-p`, `--patch`               | Generates the unified diff (patch) representing the exact file changes introduced by each commit.    | `git log -p -n 1`              |
| `--stat`                      | Displays a diffstat summary listing modified files and insertion/deletion counts for each commit.    | `git log --stat`               |
| `--author=<pattern>`          | Filters commits to show only those whose author name or email matches the specified string or regex. | `git log --author="Alice"`     |
| `--grep=<pattern>`            | Filters commits to show only those whose commit message matches the specified regular expression.    | `git log --grep="FIXUP"`       |
| `--since=<date>`, `--after=`  | Shows commits more recent than a specific timestamp or relative date (e.g., "2 weeks ago").          | `git log --since="1 week ago"` |
| `--until=<date>`, `--before=` | Shows commits older than a specific timestamp or relative date.                                      | `git log --until="2023-01-01"` |
| `--all`                       | Forces traversal across all refs in `.git/refs/`, including local and remote branches and tags.      | `git log --all`                |
| `--no-merges`                 | Suppresses and hides all multi-parent merge commits, leaving a strictly linear commit view.          | `git log --no-merges`          |
| `-S <string>`                 | Searches the commit history for changes (additions or deletions) of a specific string of text.       | `git log -S "API_KEY"`         |

## Examples

```bash
git log
```

> This runs the default history traversal, printing a vertical list of commits starting from the current `HEAD` pointer, detailing the full 40-character SHA-1 hash, author, date, and commit message for each entry.

```bash
git log --oneline --graph --all --decorate
```

> This renders a comprehensive, ASCII-art visual map of the entire project repository. It compresses each commit onto a single line (`--oneline`), displays all branch and tag pointers (`--decorate`), maps all branches across the network (`--all`), and traces branch divergence and merges (`--graph`).

```bash
git log -p -n 1
```

> This combines the max count filter with the patch flag to display the exact line-by-line code changes introduced in the most recent commit of the current branch.

```bash
git log --author="Jane Doe" --since="2024-01-01" --oneline
```

> This queries the commit graph for all contributions made by a specific author since the start of the year, outputting the results in a clean, abbreviated format suitable for performance auditing.

```bash
git log --stat -S "DATABASE_URL"
```

> This executes Git's "pickaxe" search engine (`-S`), scanning every historical commit to find precisely when the string `DATABASE_URL` was added or removed, while `--stat` shows which files were touched in those specific commits.

## Real-World Scenarios

**Auditing the Introduction of a Bug**

```bash
git log -p -S "vulnerable_function"
```

> When a security vulnerability is discovered, engineers use this command to scan historical patches. It isolates every commit that introduced or modified instances of the vulnerable function, instantly revealing who wrote the insecure code and when.

**Generating Release Changelogs**

```bash
git log v1.0.0..v1.1.0 --oneline --no-merges
```

> Release managers use revision range syntax (`v1.0.0..v1.1.0`) to inspect every code change introduced between two specific tags. Filtering out merge commits yields a clean list of feature implementations and bug fixes for release notes.

**Investigating Divergence Between Branches**

```bash
git log main..feature-branch --oneline
```

> Before opening a pull request, a developer runs this range query to review all commits present in their active `feature-branch` that have not yet been merged into `main`, ensuring no extraneous work is accidentally submitted.

## When should it NOT be used?

- **Inspecting uncommitted workspace or staging changes:** Running `git log` to see your current file edits. **Reason:** `git log` only reads recorded commits from the object database; it cannot see working directory modifications or staged files. **Use instead:** `git status` or `git diff`.
- **Tracing individual line-by-line blame metadata:** Using `git log` to find out who authored a single specific line of code in a massive file. **Reason:** Reviewing a full file history log for a single line is inefficient and cluttered. **Use instead:** `git blame`, which maps every line of a file directly to its originating commit.
- **Executing real-time branch monitoring:** Leaving `git log` running in an infinite loop to track production deployments. **Reason:** `git log` is a static inspection tool, not a live event stream. **Use instead:** Tail logs or use a webhook-driven continuous deployment dashboard.

## Alternatives

- **`tig`:** A text-mode interface for Git. **Tradeoff:** `tig` provides an interactive, scrollable ncurses user interface directly inside the terminal, allowing you to browse commits, diffs, and trees much faster than scrolling through static `git log` text output, but it requires an external installation.
- **`git shortlog`:** A specialized summarization tool. **Tradeoff:** `git shortlog` aggregates commit counts and groups them by author name, making it ideal for generating team contribution metrics, but it discards individual commit message details and graph structures.

## How it works internally

When you execute `git log`, the Git engine begins at the commit object designated by `HEAD` (or whichever reference or SHA-1 you provide). It reads the target commit object from the `.git/objects` database.

A commit object contains metadata (author, committer, timestamp, message) and a pointer to a root tree object representing the file structure, alongside one or more `parent` commit hashes. `git log` uses these parent hashes to execute a graph traversal algorithm, moving backwards through the Directed Acyclic Graph (DAG).

If you specify pathspecs (e.g., `git log -- path/to/file.txt`), Git performs history simplification. It evaluates the tree objects at each commit node to determine if the specified file's blob hash actually changed between parent and child. If the file content remained identical, Git skips displaying that commit, presenting a pruned history tracking only the modifications relevant to that specific file path. The command returns an exit code of `0` upon successful traversal, or `128` if an invalid revision range or non-existent commit hash is supplied.

## Performance Notes

- Traversing massive repositories with millions of commits without a limit flag (`-n` or `--max-count`) can consume significant CPU cycles and memory as Git walks the entire DAG history.
- Using pathspec filtering (e.g., `git log -- file.c`) forces Git to inspect the tree objects of every historical commit along the traversal path, which is computationally heavier than standard graph walks.
- Running `git log` within a shallow clone (`--depth=<N>`) restricts traversal strictly to the downloaded local history horizon, speeding up execution by ignoring deep historical packfiles.

## Security Notes

- **Author Spoofing:** The author name, email, and timestamp displayed by `git log` are entirely metadata fields written by the client machine when the commit was created. They are not cryptographically verified by default, meaning a malicious user can easily spoof commits to appear as though they were authored by another team member.
- **Secret Disclosure in History:** `git log -p` dumps historical patches to standard output. If API keys, passwords, or cryptographic certificates were accidentally committed in past revisions, running log commands will print those secrets in plain text to the terminal screen or log capture files.

## Common Mistakes

- **Forgetting to exit the pager:** Running `git log` on a large repository and attempting to type the next command immediately. **Why it's wrong:** `git log` automatically pipes output into a text pager (like `less`). The terminal is locked waiting for input; you must press `q` to quit the pager and return to the prompt.
- **Missing the pathspec separator (`--`):** Typing `git log main file.txt` instead of `git log main -- file.txt`. **Why it's wrong:** If a branch or tag happens to share the exact name of a file in your repository, Git becomes ambiguous and throws a "ambiguous argument" error. The double-dash separator `--` explicitly tells Git that everything following it is a file path, not a revision reference.
- **Misinterpreting commit ranges:** Using `git log branchA branchB` and expecting a diff. **Why it's wrong:** Listing two branches without a dot separator tells Git to show the logs reachable from _either_ branch (a union), rather than the commits unique to `branchB` that are missing from `branchA` (`branchA..branchB`).

## Best Practices

- Define a permanent global alias for your preferred visual log format to save keystrokes and standardize readability across your team (e.g., `git config --global alias.lg "log --oneline --graph --all --decorate"`).
- Always use the double-dash pathspec separator (`--`) when querying history for specific files or directories to prevent argument collision with branch or tag names.
- When auditing sensitive repositories, pair `git log` with regex search flags (`-S` or `-G`) to systematically hunt for leaked credentials or obsolete configurations hidden deep within historical branches.

## Interview Questions

**Q:** Explain how Git's data structure allows `git log` to traverse history, and what role parent pointers play in this process.
**A:** Git stores history as a Directed Acyclic Graph (DAG) of commit objects. Each commit object contains cryptographic hashes pointing to one or more parent commits. When `git log` runs, it starts at a given reference (like `HEAD`), reads the commit object, extracts its parent hashes, and walks backward along those cryptographic links to reconstruct the chronological sequence of changes.

**Q:** What is the technical difference between `git log branchA..branchB` and `git log branchA ^branchB`?
**A:** The two-dot range syntax (`branchA..branchB`) is shorthand for "commits reachable from `branchB` that are _not_ reachable from `branchA`" (essentially showing what is new in `branchB`). The caret syntax (`^branchB`) is an exclusion operator; placing a caret before a ref excludes all commits reachable from that ref, allowing for complex multi-ref inclusion and exclusion queries.

**Q:** When you run `git log --follow <file>`, how does Git track a file's history even if the file was renamed in the past?
**A:** The `--follow` flag instructs Git to trace rename events by analyzing the tree object deltas across commit parents. When Git detects that a file was deleted in one path and a file with identical or highly similar content appeared in another path within the same commit, it follows that cryptographic continuity across the rename boundary.

## Practice Problems

**Problem:** You need to find all commits made by the author "DevOps Bot" within the last 30 days, displaying only their abbreviated hashes and subject lines in a single line per commit.
**Hint:** Combine the author filter, the time boundary filter, and the single-line formatting flag.
**Solution:** `git log --author="DevOps Bot" --since="30 days ago" --oneline` (This isolates the author, scopes the timeframe, and condenses the output format).

**Problem:** You want to find out which commit introduced a specific configuration string (`MAX_CONNECTIONS=500`) into your codebase, across all branches and tags.
**Hint:** Use the global traversal flag alongside Git's internal string-search engine flag.
**Solution:** `git log --all -S "MAX_CONNECTIONS=500"` (The `--all` flag ensures the search scans every branch reference, and `-S` executes the pickaxe engine to find when that string was added or removed).

## References

- [Git - git-log Documentation](https://git-scm.com/docs/git-log)
- [Pro Git Book: Git Basics - Viewing the Commit History](https://git-scm.com/book/en/v2/Git-Basics-Viewing-the-Commit-History)
  === END FILE ===
