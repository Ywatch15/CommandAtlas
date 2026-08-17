---
slug: git-shortlog
name: git shortlog
aliases: []
category: git
tags:
  - version-control
  - commits
  - history
  - statistics
  - changelog
  - attribution
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
  - generate release changelog
  - summarize git commits by author
  - count commits per user
  - group git log by author
  - see who contributed the most
relatedCommands: [git-blame, git-log]
alternatives: [git-log]
status: draft
---

## What is it?

`git shortlog` is a reporting utility that summarizes `git log` output, grouping commits by their respective authors. By default, it parses the revision history, consolidates all commits authored by the same person, and outputs an alphabetized list of authors alongside the subject lines of their commits. It serves as Git's native tool for generating human-readable release notes, contributor acknowledgments, and basic repository activity metrics.

## Why does it exist?

During the early development of the Linux kernel, maintainers (specifically Linus Torvalds) needed a fast, automated way to generate release announcements that properly credited every developer who contributed to a specific patchset or release. Standard `git log` output is chronologically strictly ordered and highly verbose, making it difficult to extract a clean list of contributors and their work. `git shortlog` was built to aggregate this data natively, collapsing the noise of chronological history into a structured, author-centric digest.

## Syntax

```bash
git shortlog [options] [<revision-range>] [[\--] <path>...]
git log [options] | git shortlog [options]
```

## Flags

| Flag                    | Description                                                                                                                            | Example                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `-s`, `--summary`       | Suppresses the output of individual commit subject lines, displaying only the author's name and their total commit count.              | `git shortlog -s`                             |
| `-n`, `--numbered`      | Sorts the output descending by the number of commits per author, rather than alphabetically by the author's name.                      | `git shortlog -n`                             |
| `-e`, `--email`         | Includes the author's email address in the output header alongside their name (e.g., `Author Name <email@example.com>`).               | `git shortlog -e`                             |
| `-c`, `--committer`     | Groups the commits by the "committer" identity rather than the "author" identity.                                                      | `git shortlog -c`                             |
| `--group=<type>`        | Groups output by alternative metadata. `<type>` can be `author`, `committer`, or a commit trailer like `trailer:Co-authored-by`.       | `git shortlog --group=trailer:Co-authored-by` |
| `--format=<format>`     | Replaces the default commit subject line output with a custom formatted string (using standard `git log` format placeholders).         | `git shortlog --format="%h: %s"`              |
| `-w[<w>[,<i1>[,<i2>]]]` | Wraps the output lines by defining the line width, the indent for the first line, and the indent for subsequent lines.                 | `git shortlog -w72,4,4`                       |
| `--no-merges`           | Excludes merge commits from the summary. Crucial for accurate commit counting, as maintainers often generate many empty merge commits. | `git shortlog -sn --no-merges`                |
| `--since=<date>`        | Restricts the shortlog to commits created after a specific date or relative timestamp.                                                 | `git shortlog --since="1 month ago"`          |
| `--grep=<pattern>`      | Filters the summarized commits to only include those whose commit messages match the specified regular expression.                     | `git shortlog --grep="fix"`                   |

## Examples

```bash
git shortlog v1.0.0..v2.0.0
```

> Generates a complete, author-grouped changelog of all commits that occurred between the `v1.0.0` and `v2.0.0` tags. This is the canonical method for generating open-source release notes.

```bash
git shortlog -sn --no-merges
```

> Outputs a clean, numbered leaderboard of repository contributors, sorted by the total number of commits they have authored. The `--no-merges` flag ensures that project maintainers are not artificially inflated by merge commits.

```bash
git log --grep="CVE-" | git shortlog -e
```

> Demonstrates piping `git log` directly into `git shortlog`. This specific pipeline finds all commits referencing a CVE (Common Vulnerabilities and Exposures) ID and generates a summary of the developers (including their emails) who authored the security patches.

```bash
git shortlog --group=trailer:Co-authored-by
```

> Parses the body of every commit message looking for the `Co-authored-by:` trailer. It groups the output by these trailer values, allowing teams that practice pair programming to accurately track and credit collaborative contributions.

```bash
git shortlog -s --since="2023-01-01" --until="2023-12-31" -- src/backend/
```

> Generates a commit count summary for the year 2023, strictly isolated to modifications made within the `src/backend/` directory.

## Real-World Scenarios

**Automating Release Notes**

```bash
git shortlog $(git describe --tags --abbrev=0 HEAD^)..HEAD --no-merges > CHANGELOG.txt
```

> In CI/CD pipelines, engineers use this command to dynamically generate release notes. It automatically calculates the range from the _previous_ tag to the current `HEAD`, groups the commits by author, strips out noise from merges, and writes the structured output to a changelog file for distribution.

**Identifying the "Bus Factor"**

```bash
git shortlog -sn --all
```

> Tech leads and engineering managers use this command to audit repository knowledge distribution. By visualizing the commit counts across the entire repository history, they can instantly identify if a single developer is responsible for an overwhelming majority of the codebase (a high bus factor risk).

**Consolidating Fragmented Identities**

```bash
# After creating a .mailmap file
git shortlog -sn
```

> When developers commit from different machines using varied emails (e.g., `jdoe@company.com` vs `john.doe@personal.com`), their commit counts fragment into separate buckets. Administrators create a `.mailmap` file in the repository root to map these aliases to a single canonical identity. `git shortlog` automatically parses this file, producing a perfectly consolidated summary.

## When should it NOT be used?

- **Analyzing code volume or impact:** **Do not use `shortlog` to measure developer productivity.** It strictly counts the _number_ of commits. A single commit changing one character is weighted identically to a commit refactoring 10,000 lines of code. Use `git log --stat` or external tools like `cloc` and `gitinspector` for code churn analysis.
- **Reviewing code diffs:** **Do not use `shortlog` for code review.** It aggregates metadata (names and subjects) but completely strips away the actual file modifications (the patch). Use `git log -p` or `git diff` to view code changes.
- **Parsing data programmatically:** **Do not parse `shortlog` output in brittle scripts.** The output is inherently designed for human readability (with spaces, tabs, and word-wrapping). If you need to serialize author data into JSON or a database, use `git log --format=...` with custom delimiters instead.

## Alternatives

- **`git log --author=<name>`:** **Best for drilling down into a single person.** If you don't need a repository-wide summary and only want to see what a specific developer did, filtering `git log` directly is more flexible.
- **`gitinspector` / `cloc`:** **Best for deep repository analytics.** These external utilities parse Git history to provide true statistical analysis, including lines added/deleted, survival rates of code, and complex timeline graphs.
- **Hosted Git UIs (GitHub/GitLab Insights):** **Best for visual dashboards.** If you simply want to see a chart of top contributors over time, the "Contributors" tab on modern Git hosting platforms provides a much richer, interactive visual graph than a terminal text summary.

## How it works internally

Under the hood, `git shortlog` operates as a specialized filter. When invoked directly, it internally calls Git's revision walking machinery (the exact same C code that powers `git log`), traversing the commit DAG (Directed Acyclic Graph) backward from `HEAD` (or the specified range).

For each commit object it encounters, it extracts the `author` (or `committer`) payload string, which looks like `Author Name <email@domain.com> 1678886400 -0400`.

Before grouping, `git shortlog` intercepts this string and checks for the existence of a `.mailmap` file in the root of the repository (or the location specified by `mailmap.file`). If a mailmap exists, it passes the raw name and email through the mapping algorithm to resolve the canonical identity.

It then uses this canonical identity as a key in an internal hash map (or dictionary structure). The value associated with this key is a dynamically resizing list of strings containing the commit subjects (the first line of the commit message). Once the revision walk completes, it iterates over the hash map, sorts the keys alphabetically (or by array length if `-n` is provided), and streams the formatted output to `stdout`.

If `git shortlog` detects that standard input is not a terminal (e.g., `git log | git shortlog`), it entirely bypasses its internal revision walker. Instead, it reads the incoming text stream, expects it to be formatted as standard Git commit logs, and parses the text manually.

## Performance Notes

- **Unbounded Graph Traversal:** Running a naked `git shortlog` without a revision range on a massive repository (like the Linux kernel) forces Git to parse hundreds of thousands of commit objects and allocate memory for every single commit subject. This can take several seconds. Always bound queries with `--since` or tag ranges when auditing large projects.
- **Mailmap Overhead:** Utilizing `.mailmap` adds a marginal regex/string-matching overhead per commit. However, because this is processed entirely in memory via highly optimized C code, the performance impact is generally imperceptible even on large repositories.

## Security Notes

- **Email Address Exposure:** By default, `shortlog` groups by name, but adding the `-e` flag surfaces the raw email addresses stored in the commit objects. If you are generating changelogs for public distribution (e.g., posting to a blog or forum), ensure you are not inadvertently exposing contributor emails to spam scrapers.
- **Identity Spoofing:** Git commit authorship is not authenticated by default. Anyone can configure `git config user.name` and `user.email` to match another developer (e.g., Linus Torvalds). Do not rely on `git shortlog` for security audits, legal compliance, or payroll attribution. Rely on GPG-signed commits (`git log --show-signature`) for cryptographic verification of identity.

## Common Mistakes

- **Counting merges as equal contributions**
  - _Mistake:_ Running `git shortlog -sn` and incorrectly assuming a project maintainer wrote 5,000 patches, when they actually just merged 4,500 pull requests authored by others.
  - _Why:_ A merge commit is a discrete object in Git and is counted as a contribution by the person who executed the merge. To evaluate true code authorship, you must explicitly pass the `--no-merges` flag.
- **Ignoring fragmented user profiles**
  - _Mistake:_ Wondering why "Jane Doe", "Jane D.", and "jane.doe@work.com" appear as three separate entities in the leaderboard.
  - _Why:_ Git groups strictly by exact string matching. If a user changes their laptop configuration, Git sees a new author. You must create and maintain a `.mailmap` file to merge these aliases into a single entity.
- **Misunderstanding Author vs. Committer**
  - _Mistake:_ Using GitHub's "Squash and Merge" UI feature, which sets the original developer as the Author and GitHub as the Committer, and then grouping the shortlog by `-c` (committer), failing to attribute the work to the original developer.
  - _Why:_ The author is the person who originally wrote the patch. The committer is the person (or machine) who applied it to the tree. Default to author-based grouping unless strictly auditing the patch-application pipeline.

## Best Practices

- **Maintain a `.mailmap` File:** Establish a `.mailmap` file early in a project's lifecycle. Require developers to map their personal/corporate emails and various name spellings to a single canonical identity to ensure repository analytics remain pristine.
- **Combine Shortlog with `git describe`:** Create a bash alias for release generation that dynamically bounds the shortlog to the latest annotated tags. For example: `alias changelog='git shortlog $(git describe --tags --abbrev=0 HEAD^)..HEAD --no-merges'`.
- **Leverage Trailers for Nuanced Attribution:** Modern Git workflows heavily utilize trailers (e.g., `Reviewed-by:`, `Tested-by:`). Use `git shortlog --group=trailer:Reviewed-by` to recognize team members who contribute heavily to code quality, even if they aren't authoring the commits themselves.

## Interview Questions

**Q: What is the fundamental difference between the "Author" and the "Committer" in a Git repository, and how does `git shortlog` handle them?**
**A:** The Author is the person who originally wrote the code. The Committer is the person (or automated system) who applied the code to the repository (e.g., via a cherry-pick, rebase, or web UI merge). By default, `git shortlog` groups commits by the Author. You must explicitly pass the `-c` flag to group by the Committer.

**Q: You run `git shortlog -sn`, but a developer who recently changed their email address shows up twice in the list with split commit counts. How do you permanently fix this output without rewriting repository history?**
**A:** You create a file named `.mailmap` in the root of the repository. Inside this file, you define a mapping rule that maps the developer's old email and aliases to their new canonical name and email. `git shortlog` automatically reads this file and consolidates the counts on the fly, avoiding the danger of rewriting history with `git filter-repo`.

**Q: How would you extract a numbered list of the top 5 contributors to a repository, completely ignoring merge commits?**
**A:** You can combine `git shortlog` with standard Unix utilities. You execute `git shortlog -sn --no-merges` to generate a sorted list excluding merges, and pipe the output to `head -n 5` to limit the result to the top five lines.

## Practice Problems

**Problem:** You are preparing a quarterly report and need to see exactly how many commits each developer authored in the year 2023. You only want to see the numbers and names, not the commit subjects.
**Hint:** Combine the flag that generates a summary, the flag that sorts by number, and the two flags that constrain the search to a specific date range.
**Solution:**

```bash
git shortlog -sn --since="2023-01-01" --until="2023-12-31"
```

**Problem:** You are using pair programming. The driver commits the code, but the navigator is credited in the commit message using the trailer `Co-authored-by: Name <email>`. Write a command to group the shortlog strictly by these co-authors to see what they have helped with.
**Hint:** Use the flag that overrides the default grouping metadata and explicitly target the trailer syntax.
**Solution:**

```bash
git shortlog --group=trailer:Co-authored-by
```

## References

- [git-shortlog(1) Manual Page](https://git-scm.com/docs/git-shortlog)
- [Pro Git Book: Generating a Shortlog](https://git-scm.com/book/en/v2/Distributed-Git-Maintaining-a-Project#_generating_a_shortlog)
- [Git Documentation: Mapping Authors with .mailmap](https://git-scm.com/docs/gitmailmap)
