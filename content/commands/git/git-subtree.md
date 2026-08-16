---
slug: git-subtree
name: git subtree
aliases: []
category: git
tags:
  - version-control
  - monorepo
  - submodules
  - dependencies
  - merging
difficulty: advanced
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
  - merge another repository into a subdirectory
  - extract directory into new repository
  - manage vendored dependencies
  - split folder into its own git repo
  - push subdirectory changes to upstream repo
relatedCommands:
  - git-fetch
  - git-merge
  - git-remote
alternatives: []
status: draft
---

## What is it?

`git subtree` is an advanced version control command that allows you to nest a complete, independent Git repository inside a subdirectory of another Git repository, or conversely, extract a specific subdirectory's history into a standalone repository. Unlike submodules, which merely store a reference to an external commit hash, `git subtree` physically merges the external files and their commit history directly into the host repository's Directed Acyclic Graph (DAG). To developers cloning the host project, the subtree appears as native, standard files with no special initialization required.

## Why does it exist?

Managing shared code across multiple projects has historically been a massive pain point in Git. `git submodule` was the original solution, but it relies on strict, detached pointer files (`.gitmodules`) that require users to manually run `submodule init` and `update`. This often leads to "detached HEAD" confusion, broken CI/CD pipelines, and out-of-sync dependencies. `git subtree` (originally written as a contrib shell script by Avery Pennarun and later merged into Git core) was built to eliminate this friction. It leverages Git's internal subtree merge strategy to seamlessly weave disparate project histories together, allowing maintainers to manage dependencies while providing a frictionless, standard `git clone` experience for the end user.

## Syntax

```bash
git subtree add --prefix=<prefix> <repository> <ref> [options]
git subtree pull --prefix=<prefix> <repository> <ref> [options]
git subtree push --prefix=<prefix> <repository> <ref> [options]
git subtree split --prefix=<prefix> [options]
git subtree merge --prefix=<prefix> <commit> [options]
```

## Flags

| Flag / Action                      | Description                                                                                                                                | Example                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `add`                              | Injects an external repository's history into the host repository at the specified prefix.                                                 | `git subtree add -P libs/math repo.git main`         |
| `pull`                             | Fetches and merges subsequent updates from the external repository into the local subtree directory.                                       | `git subtree pull -P libs/math repo.git main`        |
| `push`                             | Extracts local commits that touched the subtree directory and pushes them back to the external repository.                                 | `git subtree push -P libs/math repo.git main`        |
| `split`                            | Scans the host history, isolating commits that touched a prefix, and generates a new, synthetic commit history.                            | `git subtree split -P src/module -b new-repo`        |
| `-P <prefix>`, `--prefix=<prefix>` | Required for almost all actions. Specifies the relative path of the subdirectory in the working tree to operate on.                        | `git subtree add --prefix=vendor/lib ...`            |
| `--squash`                         | Compresses the external repository's entire history into a single commit before merging it into the host repository.                       | `git subtree add -P ext/ repo.git main --squash`     |
| `-b <branch>`, `--branch=<branch>` | Used with `split`. Automatically creates a new branch pointing to the newly generated synthetic history tip.                               | `git subtree split -P api/ -b api-standalone`        |
| `--rejoin`                         | Used with `split`. Merges the newly generated synthetic history back into the host branch to cache the split calculations for future runs. | `git subtree split -P api/ --rejoin`                 |
| `--onto=<commit>`                  | Used with `split`. Instructs the split algorithm to build the new history on top of a previously existing, known commit.                   | `git subtree split -P api/ --onto=a1b2c3d`           |
| `-m <msg>`, `--message=<msg>`      | Overrides the default auto-generated commit message when creating the merge commit for `add` or `pull`.                                    | `git subtree add -P core/ repo.git -m "Vendor core"` |
| `--ignore-joins`                   | Forces `split` to ignore any previously cached `--rejoin` merge commits, forcing a complete recalculation of the history.                  | `git subtree split -P api/ --ignore-joins`           |

## Examples

```bash
git subtree add --prefix=vendor/logging [https://github.com/org/logger.git](https://github.com/org/logger.git) main --squash
```

> Vendors a third-party logging library into the `vendor/logging` directory. The `--squash` flag tells Git to ignore the thousands of historical commits from the `logger.git` repository, instead compressing the current state of its `main` branch into a single, clean commit within your host repository.

```bash
git subtree pull --prefix=vendor/logging [https://github.com/org/logger.git](https://github.com/org/logger.git) main --squash
```

> Updates an existing subtree. This fetches the latest changes from the upstream logger repository, squashes the new commits since your last pull, and merges them securely into your `vendor/logging` directory.

```bash
git subtree split --prefix=src/microservice-auth --branch=auth-standalone
```

> Isolates the history of a specific folder. Git crawls backward through your monorepo's history, finds every commit that modified files inside `src/microservice-auth`, and constructs a brand new, independent Git history containing _only_ those changes, placing the result on a new branch named `auth-standalone`.

```bash
git subtree push --prefix=vendor/logging [https://github.com/org/logger.git](https://github.com/org/logger.git) feature-fix
```

> Contributes back to an upstream repository. If you made local bug fixes directly inside your `vendor/logging` folder, this command isolates those specific commits, translates them to match the upstream repository's structure, and pushes them to a branch named `feature-fix` on the remote server.

```bash
git remote add logger_remote [https://github.com/org/logger.git](https://github.com/org/logger.git)
git fetch logger_remote
git subtree add --prefix=vendor/logging logger_remote/main --squash
```

> Demonstrates the best practice of configuring a Git remote before adding a subtree. Instead of passing the raw URL to `git subtree` every time, you fetch the remote normally, allowing you to use local tracking branches (`logger_remote/main`) for significantly faster additions and pulls.

## Real-World Scenarios

**Extracting a Shared Library from a Monorepo**

```bash
git subtree split --prefix=libs/common-ui --branch=common-ui-extract
git init ../common-ui-repo
cd ../common-ui-repo
git pull ../monorepo common-ui-extract
```

> When a monorepo grows too large, or a specific internal folder (like `common-ui`) needs to be open-sourced, engineers use `git subtree split` to cleanly sever the folder's history from the monorepo. They then initialize a fresh repository in a different folder and pull the newly generated, synthetic branch into it, preserving authorship and commit messages without leaking the rest of the monorepo's proprietary code.

**Vendoring Immutable Upstream Dependencies**

```bash
git subtree add --prefix=third_party/libjpeg [https://github.com/libjpeg-turbo/libjpeg-turbo.git](https://github.com/libjpeg-turbo/libjpeg-turbo.git) main --squash
```

> C++ or Go developers who prioritize hermetic builds often vendor their dependencies directly into their source tree. Using `git subtree` with `--squash` imports the exact source code of the external library without dragging in its massive historical baggage, ensuring that a simple `git clone` of the host repo immediately provides all necessary code to compile the project.

**Bi-directional Synchronization**

```bash
git subtree pull --prefix=plugins/analytics origin-analytics main
# ... make local changes to plugins/analytics/core.js ...
git commit -am "Fix analytics memory leak"
git subtree push --prefix=plugins/analytics origin-analytics hotfix-leak
```

> A team maintains a core framework (host repo) and several open-source plugins (external repos). When a developer fixes a bug in the plugin while working within the framework, they author a standard commit. `git subtree push` mathematically unweaves that commit from the framework's history and pushes it directly to the plugin's upstream repository for review.

## When should it NOT be used?

- **Strict Access Control Requirements:** **Do not use `subtree` if host repo users shouldn't see the nested code.** `git subtree` permanently merges the external code into the host repository. If you are linking a proprietary, access-restricted billing module into a wider company monorepo, anyone with access to the host repo can read the billing code. Use `git submodule` instead, which enforces separate authentication.
- **Massive, High-Churn Repositories:** **Do not use `subtree` (without squash) for massive external projects.** Merging the entire un-squashed Linux kernel history into your small driver project will permanently bloat your local `.git` database by gigabytes.
- **Pure Binary Dependency Management:** **Do not use `subtree` to manage compiled DLLs, JARs, or static assets.** Version control is for text and source code. Pulling in large binary releases via `subtree` destroys repository performance. Use Artifactory, Nexus, or language-level package managers (npm, Maven) instead.

## Alternatives

- **`git submodule`:** **Best for decoupled, strictly versioned dependencies.** Submodules keep the host repository lightweight because they only store a 40-character commit hash pointing to the external repository, forcing the end-user to fetch the external code themselves.
- **`git read-tree`:** **Best for automated plumbing scripts.** `git subtree` is actually a high-level wrapper that utilizes `git read-tree` internally. If you are writing a custom CI script that only needs to jam files into a prefix without managing ongoing synchronization, `git read-tree` is significantly faster.
- **Repo / Lerna / Rush:** **Best for massive enterprise monorepos.** If you are managing 50+ inter-dependent repositories, `git subtree` becomes mathematically prohibitive. Dedicated monorepo orchestration tools provide highly optimized, parallelized dependency linking via symlinks rather than Git object manipulation.

## How it works internally

`git subtree` operates using a combination of the `subtree` merge strategy and dynamic history rewriting. It is not a compiled C command; it is a complex shell script distributed with Git's `contrib` tools.

When you run `git subtree add`, Git essentially executes a `git fetch` of the target repository, creates a new tree object placing those files into your specified `--prefix`, and then executes a `git merge` using the `subtree` strategy (often utilizing `git read-tree --prefix=<dir> -u`). If `--squash` is used, it generates a single commit containing the tree state and merges that, rather than the entire fetched history.

The true mathematical complexity lies in `git subtree split` (which is also used internally during a `push`). Git traverses the DAG (Directed Acyclic Graph) of your host repository backwards from `HEAD`. For every commit it encounters, it inspects the tree object to see if the specified `--prefix` was modified. If it was, Git maps the host commit to a brand new, synthetic commit. It replaces the root tree of the synthetic commit with the sub-tree from the host commit, maps the old parent SHAs to the new synthetic parent SHAs, and writes this to the object database.

Because this requires re-hashing and re-writing thousands of commits, it is incredibly CPU-intensive. The `--rejoin` flag solves this by taking the tip of the newly generated synthetic history and immediately merging it _back_ into the host branch. The next time you run `split`, Git stops traversing backward when it hits this rejoin merge commit, acting as an optimization cache.

## Performance Notes

- **Exponential Split Times:** Running `git subtree split` on a directory inside a monorepo with 100,000+ commits can take hours. Git must evaluate every single commit in the graph. Always use `--rejoin` on subsequent splits to cache the traversal boundary.
- **The Inconsistency of `--squash`:** If you add a subtree with `--squash`, you **must** use `--squash` on all subsequent `git subtree pull` operations for that prefix. Mixing squashed and un-squashed operations fundamentally breaks the subtree merge algorithm's ability to find a common ancestor, resulting in massive, unresolvable merge conflicts.

## Security Notes

- **Secret Leakage During Push:** If you accidentally commit an API key into the subtree folder within your host repository, and then run `git subtree push` back to a public open-source repository, the secret is pushed upstream. The synthetic history generation perfectly preserves the malicious/leaked delta.
- **Malicious Upstream Code:** Because `git subtree` natively merges code into your host repository, running `git subtree pull` from an untrusted, compromised upstream repository injects that code directly into your working directory without the explicit sandboxing a submodule `.gitmodules` review would provide.

## Common Mistakes

- **Forgetting to commit before splitting/pushing**
  - _Mistake:_ Modifying files in the subtree folder and immediately running `git subtree push`, wondering why the remote repository didn't update.
  - _Why:_ `git subtree` operates exclusively on commit objects in the `.git` database, not the working directory. You must stage and commit your local changes to the host repository before the subtree algorithm can extract and push them.
- **Rebasing host repository history**
  - _Mistake:_ Using `git rebase -i` to squash or rewrite host commits that encompass a previous `git subtree add` or `pull` merge commit.
  - _Why:_ Rebasing a subtree merge commit destroys the specialized internal pointer metadata that `git subtree` relies on to calculate future common ancestors. Future `pull` or `push` operations will fail catastrophically. Never rebase a subtree merge.
- **Appending a trailing slash to the prefix**
  - _Mistake:_ Typing `git subtree add --prefix=vendor/lib/ repo.git main`.
  - _Why:_ Older versions of the `git-subtree` bash script possess a parsing bug where trailing slashes in the `--prefix` argument cause the history extraction to fail silently or miscalculate the path limits. Always use clean paths (e.g., `vendor/lib`).

## Best Practices

- **Commit Subtree Merges Instantly:** When `git subtree add` or `pull` completes, it usually generates a merge commit automatically. If you intercept this (e.g., resolving a conflict), do not bundle other unrelated host repository changes into that same merge commit. Keep subtree merge commits mathematically pure to ensure future `split` calculations succeed.
- **Configure Dedicated Remotes:** Do not continuously type raw HTTPS/SSH URLs into subtree commands. Run `git remote add <name> <url>` once, and `git fetch <name>`. Then, use `git subtree pull --prefix=lib <name> <branch>`. This significantly speeds up the operation as it utilizes local cache.
- **Standardize `--squash` Usage:** Enforce a strict team policy. If you are vendoring external dependencies, mandate the use of `--squash`. If you are orchestrating a bi-directional microservice sync where preserving granular commit history is paramount, explicitly ban `--squash`.

## Interview Questions

**Q: What is the primary difference in the developer experience between cloning a repository that uses `git submodule` versus one that uses `git subtree`?**
**A:** A repository using `git subtree` contains the actual files and history of the dependency directly in its commit graph. A developer simply runs `git clone <url>` and immediately possesses all the code, ready to compile. A repository using `git submodule` only contains a pointer file. The cloning developer must run `git clone --recursive` or manually run `git submodule update --init` to explicitly fetch the external code, otherwise their local dependency folders will remain completely empty.

**Q: You ran `git subtree add --squash`, and months later someone else on your team ran `git subtree pull` without the `--squash` flag. What happens and why?**
**A:** The pull operation will likely result in a massive, unresolvable merge conflict. By squashing initially, you destroyed the historical commit DAG that the external repository relies on to calculate the "merge base" (common ancestor). When the second developer attempts an un-squashed pull, Git's merge algorithm cannot reconcile the squashed monolithic host commit with the granular upstream commits, treating every line as a conflict.

**Q: Explain how `git subtree split` handles commits in the host repository that modified both files _inside_ the subtree prefix and files _outside_ the subtree prefix simultaneously.**
**A:** When generating the new synthetic history, `git subtree split` inspects the patch payload of the monolithic commit. It mathematically strips out any changes that occurred outside the specified prefix, and generates a new, synthetic commit that contains _only_ the diffs applicable to the subtree directory. The original monolithic commit in the host repository remains untouched.

## Practice Problems

**Problem:** You are building a Go application and want to vendor the `gin-gonic/gin` web framework into a folder named `third_party/gin`. You do not want the thousands of historical commits from the Gin repository cluttering your project's `git log`. Write the command to accomplish this.
**Hint:** Use the `add` action, specify the target prefix, provide the repository URL and branch (`master`), and use the flag that compresses the history.
**Solution:**

```bash
git subtree add --prefix=third_party/gin [https://github.com/gin-gonic/gin.git](https://github.com/gin-gonic/gin.git) master --squash
```

**Problem:** You have been developing a generic utility library directly inside your host monorepo under the directory `src/utils`. You now want to open-source this utility. Write the command to extract the history of `src/utils` into a brand new branch named `utils-open-source`.
**Hint:** Use the action designed for history extraction, specify the exact prefix, and use the flag that automatically generates the new branch pointer.
**Solution:**

```bash
git subtree split --prefix=src/utils --branch=utils-open-source
```

## References

- [Git Subtree Tutorial - Atlassian](https://www.atlassian.com/git/tutorials/git-subtree)
- [git-subtree(1) Manual Page (via git.kernel.org)](https://git.kernel.org/pub/scm/git/git.git/tree/contrib/subtree/git-subtree.txt)
- [Mastering Git Subtrees (GitHub Blog)](https://github.blog/2020-04-29-how-to-manage-dependencies-with-git-subtrees/)
