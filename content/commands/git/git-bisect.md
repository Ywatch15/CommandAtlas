---
slug: git-bisect
name: git bisect
aliases: []
category: git
tags: [debugging, troubleshooting, bisection, commits, testing]
difficulty: advanced
supportedOS: [linux, macos, unix, windows]
supportedShells: [bash, zsh, sh, powershell, cmd]
intentPhrases:
  - 'find which commit broke the code'
  - 'binary search git history'
  - 'find bug origin in git'
  - 'automate git regression testing'
  - 'track down bad commit'
relatedCommands: [git-blame, git-checkout, git-log, git-reset]
alternatives: [git-blame, git-log]
status: draft
---

## What is it?

`git bisect` is a powerful diagnostic version control command that uses a binary search algorithm to isolate the exact commit that introduced a bug, regression, or behavior change. By defining a known "bad" commit (where the bug exists) and a known "good" commit (where the bug does not exist), it systematically checks out intermediate commits, asking the user (or an automated script) to test them. It drastically reduces the time required to hunt down regressions in large, heavily active codebases.

## Why does it exist?

In large, collaborative repositories, a bug might be discovered weeks or months after it was introduced, hidden amidst thousands of commits. Manually checking out and testing commits linearly (one by one) is an $O(N)$ operation, which is prohibitively slow and error-prone. `git bisect` exists to mathematically optimize this process. By leveraging the Directed Acyclic Graph (DAG) of Git's commit history, it cuts the search space in half at every step, reducing the time complexity to $O(\log N)$. It fills the critical gap between knowing a bug exists and knowing exactly which developer's patch caused it.

## Syntax

```bash
git bisect <subcommand> [options]
```

## Flags

_Note: Because `git bisect` operates as a state machine, it primarily uses positional subcommands rather than traditional dashed flags to control its execution flow._

| Flag / Subcommand    | Description                                                                                                                      | Example                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `start`              | Initializes the bisection session. Can optionally accept the bad and good commits immediately as arguments to save time.         | `git bisect start HEAD v2.0`                             |
| `bad` / `new`        | Marks the currently checked-out commit (or a specified hash) as containing the bug.                                              | `git bisect bad`                                         |
| `good` / `old`       | Marks the currently checked-out commit (or a specified hash) as functioning correctly.                                           | `git bisect good a1b2c3d`                                |
| `skip`               | Marks the current commit as untestable (e.g., it fails to compile). Git will pick a nearby adjacent commit to test instead.      | `git bisect skip`                                        |
| `reset`              | Terminates the bisection session and cleans up state, returning the working directory to the branch you were on before starting. | `git bisect reset`                                       |
| `run <cmd>`          | Fully automates the bisection process by running the provided shell script or command against every checked-out commit.          | `git bisect run make test`                               |
| `log`                | Displays the history of the current bisection session, showing which commits have been marked good, bad, or skipped.             | `git bisect log`                                         |
| `replay <file>`      | Restarts a bisection session by replaying a previously saved `git bisect log` file, avoiding repetitive manual testing.          | `git bisect replay bisect_log.txt`                       |
| `terms`              | Configures alternative terms if "good" and "bad" are semantically confusing (e.g., searching for when a feature was _added_).    | `git bisect terms --term-old=missing --term-new=present` |
| `visualize` / `view` | Launches `gitk` or `git log` to visually display the remaining commits left in the bisection search space.                       | `git bisect visualize`                                   |

## Examples

```bash
git bisect start
git bisect bad                 # The current state is broken
git bisect good v1.4.2         # The last known working release
# Git checks out a commit halfway between v1.4.2 and HEAD
# ... run your manual tests ...
git bisect good                # If the bug isn't here
# Git checks out the next halfway point
```

> The standard interactive bisection workflow. You explicitly define the boundaries, and Git drops you into a detached HEAD state at the midpoint. You test the application, report `good` or `bad`, and Git calculates the next hop until the exact culprit is isolated.

```bash
git bisect start HEAD HEAD~100
git bisect run npm run test:unit
```

> Fully automates the regression hunt. Git initializes a bisection between the current commit and 100 commits ago. It then executes `npm run test:unit` at every step. If the script exits with `0`, Git marks it `good`. If it exits `1`-`124`, Git marks it `bad`. It runs hands-free until it finds the breaking commit.

```bash
git bisect skip
```

> Used when the current commit selected by Git is untestable. For example, if a developer broke the build script in commit A, and fixed it in commit C, testing commit B is impossible. `git bisect skip` tells the algorithm to ignore this node and select an adjacent, hopefully compileable, commit to continue the search.

```bash
git bisect terms old new
git bisect start
git bisect new HEAD
git bisect old v2.0
```

> Alters the terminology of the state machine. When searching for a performance improvement or the introduction of a new feature, using "bad" to mean "has the feature" feels counterintuitive. Defining custom terms makes the workflow logically clearer.

```bash
git bisect reset
```

> Always required after a bisection successfully identifies the target commit, or when you wish to abort. This command deletes the internal bisection state files and checks out the branch you were originally working on, restoring your normal Git environment.

## Real-World Scenarios

**Automated CI/CD Regression Hunting**

```bash
git bisect start HEAD v3.1.0
git bisect run ./scripts/ci_test.sh
```

> A deployment to staging fails due to a core dump, but 500 commits have been merged since the last release. An infrastructure engineer writes a small wrapper script (`ci_test.sh`) that compiles the code and runs the specific failing test. By passing this to `git bisect run`, the server automatically identifies the exact offending PR within minutes, requiring zero human intervention.

**Finding Performance Degradations**

```bash
git bisect start HEAD v1.0
git bisect run ./benchmark.sh
```

> A web application's page load time spikes by 3 seconds, but no unit tests are failing. An engineer writes `benchmark.sh` to measure the execution time of the critical path, configuring the script to exit `0` if the time is under 1 second, and exit `1` if over. `git bisect` mathematically isolates the unoptimized database query buried in the history.

**Navigating Broken Intermediate History**

```bash
# Inside a bisect session where compilation fails
git bisect skip
```

> When working in a repository with poor discipline where intermediate commits often fail to compile (breaking the build), standard bisection fails because you cannot test the binary. Developers use `git bisect skip` to sidestep these broken nodes, allowing the algorithm to widen the search boundary to the nearest functioning commit to resume the search.

## When should it NOT be used?

- **Single-file textual bugs:** **Do not use `bisect` if you know exactly which line of code is broken.** If you see a typo or a bad variable assignment in `config.js`, using `git blame config.js` to see who wrote that line is instantaneous. `bisect` is for when you _don't_ know where the bug lives.
- **Non-deterministic/Flaky bugs:** **Do not use automated bisection if the bug only appears 50% of the time.** If your test script exits `0` on a commit that actually contains the bug (a false negative), the binary search algorithm will discard the correct half of the history, completely poisoning the search and returning the wrong commit.
- **Completely broken commit history:** **Do not use `bisect` if 90% of the commits between good and bad do not compile.** If you have to `git bisect skip` almost every step, the binary search degrades into a linear search, rendering the tool effectively useless.

## Alternatives

- **`git blame`:** **Best for known file locations.** When the bug is visually obvious and constrained to a specific line in a specific file, `blame` annotates each line with the commit that last modified it, bypassing the need for testing entirely.
- **`git log -S"<string>"` (Pickaxe):** **Best for removed or added strings.** If a bug was caused because an API key or specific function call was deleted, using the pickaxe search scans the commit diffs directly for that exact string addition/deletion, instantly finding the commit.
- **Manual linear testing:** **Best for very small commit ranges.** If the bug was introduced between `HEAD` and `HEAD~3`, manually checking out the 3 commits is faster than initializing the `git bisect` state machine.

## How it works internally

When `git bisect start` is invoked, Git creates state files in the `.git` directory, specifically `.git/BISECT_START`, `.git/BISECT_LOG`, and `.git/BISECT_TERMS`. As you define the bounds, it writes the good commit hashes to `.git/BISECT_GOOD` (or similar depending on terms) and the bad hash to `.git/BISECT_EXPECTED_REV`.

Once bounded, Git constructs the DAG (Directed Acyclic Graph) of commits reachable from the "bad" commit but _not_ reachable from the "good" commit(s). It counts the total number of commits in this subgraph.

To achieve $O(\log N)$ performance, Git does not simply pick the chronologically middle commit. Because Git history can be heavily branched and merged, the chronological middle might not divide the graph evenly. Instead, Git calculates the topology of the DAG to find the commit that halves the number of ancestors. It looks for a commit where testing it will eliminate exactly half of the remaining subgraph, regardless of whether the result is good or bad.

Git then updates the `HEAD` pointer (placing you in a detached HEAD state) to this calculated midpoint and pauses. When you provide the `good` or `bad` feedback, Git prunes the impossible paths from its internal graph and repeats the calculation until exactly one commit remains. It then outputs the commit metadata and terminates the search, waiting for you to run `git bisect reset`.

## Performance Notes

- **Test Script Overhead:** The performance of `git bisect run` is entirely bottlenecked by the execution time of the command being run. If your test suite takes 10 minutes to run, a 10-step bisection will take over 1.5 hours. Always write a targeted script that compiles and tests _only_ the failing component.
- **Build Caching:** When bisecting compiled languages (C++, Rust, Go), use tools like `ccache` or `sccache`. Because `bisect` jumps wildly across the commit graph, timestamp-based incremental builds often fail or rebuild entirely. External compiler caches drastically reduce the compilation time at each step.

## Security Notes

- **Execution of Historical Code:** When running `git bisect run`, Git checks out historical versions of your repository and executes code. If an attacker previously committed a malicious build script (`Makefile`, `package.json`) that was later caught and removed, bisecting over that history will unknowingly execute the malicious payload on your machine.
- **Detached HEAD Secret Leaks:** During bisection, your working directory is constantly mutated. If a past commit accidentally included an unencrypted secret that was removed in a later commit, checking out that point in history will temporarily materialize the plaintext secret onto your disk, which could be captured by local filesystem monitoring tools.

## Common Mistakes

- **Forgetting `git bisect reset`**
  - _Mistake:_ Finding the bug, celebrating, and immediately typing `git commit` to fix it, only to realize later the commit is lost.
  - _Why:_ `git bisect` leaves you in a detached HEAD state at the bad commit. Any fixes you author here do not belong to a branch. You must run `git bisect reset` to return to your original branch _before_ authoring the bug fix.
- **Inverting "Good" and "Bad"**
  - _Mistake:_ Realizing a feature is broken on `main`, but works on `v1.0`. You type `git bisect start`, then `git bisect good HEAD` and `git bisect bad v1.0`.
  - _Why:_ The algorithm requires "bad" to represent the state where the bug _is present_. Reversing them causes Git to search the DAG in the wrong direction, usually resulting in a prompt saying the bisection is impossible.
- **Using `run` with improper exit codes**
  - _Mistake:_ Writing a bash script that uses `grep` to check for a bug, but failing to realize `grep` exits `1` when no lines are found, causing `git bisect` to mark perfectly healthy commits as "bad".
  - _Why:_ `git bisect run` relies strictly on POSIX exit codes: `0` is good, `1`-`124` is bad, `125` is skip. Your wrapper script must translate your testing tool's output into these exact integer codes.

## Best Practices

- **Use Sub-shells for `run` Wrappers:** When writing a script for `git bisect run`, wrap the testing logic in a short inline shell command if you don't want to create a separate file: `git bisect run sh -c "make && ./app --test"`.
- **Write Atomic Commits:** `git bisect` is only as useful as your commit history. If it isolates the bug to a single commit, but that commit contains 10,000 lines of changes across 50 files (a monolithic commit), you still have to manually hunt for the bug. Atomic, single-purpose commits ensure the bisect result is immediately actionable.
- **Save the Log on Long Searches:** If you are performing a manual bisection that takes hours to test at each step, occasionally run `git bisect log > bisect_backup.txt`. If you make a mistake and type `good` instead of `bad`, you can `git bisect reset`, modify the text file to fix your mistake, and `git bisect replay bisect_backup.txt` to instantly return to where you were.

## Interview Questions

**Q: What is the time complexity of a `git bisect` operation, and why?**
**A:** The time complexity is $O(\log N)$, where N is the number of commits between the good and bad boundaries. It achieves this by performing a binary search over the commit graph, continually finding a midpoint commit that eliminates half of the remaining searchable history regardless of the test outcome.

**Q: You are running an automated bisection, but some commits in the middle of your history fail to compile due to an unrelated syntax error. How do you prevent the script from marking these as "bad" (which contains the bug) and ruining the search?**
**A:** Your automated script must be configured to exit with the specific code `125`. When `git bisect run` encounters an exit code of `125`, it treats the commit as if you typed `git bisect skip`, ignoring it and moving to an adjacent commit to continue the binary search accurately.

**Q: Why does Git leave you in a "detached HEAD" state during bisection?**
**A:** During bisection, Git must physically check out historical commits into your working directory so you can compile and test them. Because these historical commits are not the active tips of any branches, checking them out fundamentally detaches `HEAD` from a branch reference and points it directly at the raw commit hash.

## Practice Problems

**Problem:** You are currently on `main` where the code is broken. You know for a fact the code worked perfectly at the tag `v2.4.0`. Write the commands to initialize the bisection and set these boundaries in a single line.
**Hint:** `git bisect start` accepts the bad commit first, followed by the good commit as optional positional arguments.
**Solution:**

```bash
git bisect start HEAD v2.4.0
```

**Problem:** You have started a bisection. You want to automate it using a script located at `./test_auth.sh`. If the script fails, it exits with `1`. Write the command to automate the bisection using this script.
**Hint:** Use the subcommand designed for executing scripts against the bisection state machine.
**Solution:**

```bash
git bisect run ./test_auth.sh
```

## References

- [git-bisect(1) Manual Page](https://git-scm.com/docs/git-bisect)
- [Pro Git Book: Binary Search](https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git#_binary_search)
- [Linux Kernel Documentation: Using Git bisect](https://www.kernel.org/doc/html/latest/admin-guide/bug-bisect.html)
