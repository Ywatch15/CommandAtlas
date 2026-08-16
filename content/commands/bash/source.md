---
slug: source
name: source
aliases:
  - .
category: bash
tags:
  - shell
  - built-in
  - scripting
  - execution
  - environment
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - run script in current shell
  - reload bashrc
  - load environment variables
  - execute file without subshell
  - import shell functions
relatedCommands:
  - export
  - eval
alternatives:
  - eval
status: draft
---

## What is it?

`source` (and its POSIX equivalent, the dot operator `.`) is a shell built-in command used to read and execute the contents of a file within the _current_ shell environment. Unlike executing a script normally (which spawns an isolated child process), `source` evaluates the file line-by-line as if you had typed it directly into your active terminal. This allows the script to modify the current shell's state, such as exporting environment variables, defining aliases, and declaring shell functions.

## Why does it exist?

When a standard script is executed (e.g., `./script.sh`), the operating system forks a new child shell to run it. If `script.sh` contains `export API_KEY=123`, that variable is set in the child process. When the script finishes, the child process dies, and the parent terminal remains completely unaware of the `API_KEY`. `source` exists to circumvent this isolation. It provides a mechanism for initialization scripts (like `.bashrc` or `.profile`), environment managers (like Python `venv`), and modular scripts to inject configurations, variables, and functions directly into the user's persistent, active session.

## Syntax

```bash
source filename [arguments]
. filename [arguments]
```

## Flags

_Note: `source` and `.` are pure shell built-ins designed exclusively to parse files. They do not accept traditional dashed flags (like `-a` or `--help`). The only arguments they accept are the file to read, followed by optional positional parameters._

| Argument    | Description                                                                                                   | Example                  |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `filename`  | Required. The relative or absolute path to the file containing shell commands to evaluate.                    | `source ~/.bashrc`       |
| `arguments` | Optional. Positional parameters (`$1`, `$2`, etc.) passed directly into the sourced file's execution context. | `source activate.sh dev` |

## Examples

```bash
source ~/.bashrc
```

> The most common use case. After editing your `~/.bashrc` file to add a new alias or environment variable, running this command applies the changes immediately to your current terminal session without requiring you to log out and log back in.

```bash
. .env
```

> Uses the POSIX-compliant dot operator to read a `.env` file containing secrets (e.g., `export DB_PASS=123`). This injects the database credentials directly into the active shell environment so subsequent commands (like `docker run` or `node app.js`) can access them.

```bash
source venv/bin/activate
```

> Initializes a Python Virtual Environment. The `activate` script modifies the `$PATH` and `$PS1` variables of your current shell to intercept Python and Pip commands, routing them to the isolated `venv` folder rather than the system Python installation.

```bash
source ./library.sh arg1 arg2
```

> Sources a script file and passes positional parameters to it. Inside `library.sh`, `$1` will evaluate to `arg1`. This allows sourced files to dynamically adjust what variables or functions they load based on user input.

```bash
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi
```

> A standard pattern found in root `.bashrc` files. It checks if a modular configuration file exists, and if so, sources it. This promotes clean configuration management by breaking monolithic init scripts into smaller, logical files.

## Real-World Scenarios

**Injecting Dynamic CI/CD Secrets**

```bash
# Inside a Jenkins/GitLab pipeline step:
aws s3 cp s3://secure-bucket/prod.env .
source prod.env
npm run deploy
```

> In deployment pipelines, secrets shouldn't be hardcoded. The runner pulls a secure `.env` file from cloud storage and `source`s it. Because it runs in the current shell context, the `npm run deploy` process inherits all the exported API keys and database strings instantly.

**Modularizing Complex Bash Scripts**

```bash
#!/bin/bash
source utils/logger.sh
source utils/error_handler.sh

log_info "Starting deployment..."
```

> Software engineers writing complex bash tooling avoid thousands of lines in a single file. They define reusable functions (like `log_info`) in separate files and use `source` at the top of their main script to import them into the active namespace, mimicking the `import` or `require` behavior of higher-level languages.

## When should it NOT be used?

- **Executing untrusted scripts:** **Do not `source` scripts from untrusted origins (e.g., `curl url | source`).** Because `source` runs in the current shell, a malicious script can overwrite your aliases (e.g., mapping `sudo` to a credential stealer) or mutate your `$PATH`. Normal script execution is slightly safer as it dies in a subshell.
- **Running disruptive binaries:** **Do not use `source` for standard executables.** You do not `source` a compiled C program or a standalone python script. It is strictly for files containing valid shell syntax.
- **When strict isolation is required:** **Do not use `source` if you don't want variables leaking.** If `script_A.sh` relies on `VAR=1` and you `source script_B.sh` which accidentally redefines `VAR=2`, `script_A.sh` is now compromised. If a script doesn't explicitly _need_ to modify the parent, execute it normally (`./script.sh`) to guarantee memory isolation.

## Alternatives

- **Execution (`./script.sh`):** **Best for standard execution.** Runs the script in an isolated subshell. State changes die with the script, keeping your main terminal pristine.
- **`eval`:** **Best for executing string outputs.** While `source` evaluates a _file_, `eval` evaluates a _string_ of commands generated dynamically by another program (e.g., `eval $(ssh-agent -s)`).

## How it works internally

When the shell encounters the `source` or `.` command, it halts execution of the current prompt and opens the target file using standard file I/O operations.

Unlike executing a script (which requires the file to have the executable `+x` permission bit set), `source` only requires the file to be readable (`+r`).

The shell reads the file line by line, passing each line through its standard parsing engine (tokenization, variable expansion, globbing) exactly as if the user were typing the lines directly into the terminal keyboard buffer. If the file contains an `export` statement, it modifies the active shell's environment dictionary. If it contains a `cd` command, it changes the active shell's working directory.

If `source` is passed positional parameters (e.g., `source file.sh a b`), the shell temporarily replaces its current positional parameters (`$1`, `$2`, etc.) with the new ones. Once the file finishes executing, the shell restores the original positional parameters and resumes its previous execution state.

## Performance Notes

- **Minimal Overhead:** Because `source` does not invoke `fork()` or `exec()` to spawn a new child process, it is extremely fast and memory-efficient.
- **`$PATH` Searching:** If the file passed to `source` does not contain a slash (e.g., `source config.sh` instead of `source ./config.sh`), Bash will search through the directories defined in your `$PATH` environment variable to find the file. If you have a massive `$PATH` string, this can cause a slight delay.

## Security Notes

- **Bypassing Execution Policies:** Because `source` only requires read permissions, it bypasses standard execution policy checks (`chmod +x`). It allows users to run scripts on filesystems mounted with the `noexec` flag, which is a common technique used by attackers to execute payloads on hardened systems.
- **Environment Pollution:** Sourced scripts have full access to your terminal's memory. A poorly written script might unintentionally run `unset PATH` or override critical functions like `cd`, completely breaking your terminal session and forcing you to restart the shell.

## Common Mistakes

- **Using `source` for portability**
  - _Mistake:_ Writing `source config.sh` in a script designed to run on Alpine Linux or legacy Unix servers.
  - _Why:_ `source` is a bashism. The strict POSIX standard requires the use of the dot operator (`. config.sh`). If a script is executed via `/bin/sh`, the word `source` will throw a "command not found" error.
- **Assuming the Shebang matters**
  - _Mistake:_ Adding `#!/bin/zsh` to the top of a file, then using `source file.sh` in a Bash terminal, expecting it to run as zsh.
  - _Why:_ `source` completely ignores the shebang line (`#!`). The file is always parsed by the _calling_ shell's syntax engine. If it contains zsh-specific syntax, Bash will throw a syntax error.
- **Using `exit` inside a sourced script**
  - _Mistake:_ Putting `exit 1` inside a sourced `.env` validation script.
  - _Why:_ Because it runs in the current shell, hitting `exit 1` won't just stop the script—it will immediately terminate your entire active terminal window (or SSH session). Use `return 1` inside sourced files instead.

## Best Practices

- **Always use the dot operator (`.`) in scripts:** For maximum portability across different Linux distributions and container minimal images, always use `. ./file.sh` instead of `source ./file.sh`.
- **Use explicit paths:** Always use `./filename` or absolute paths (`/etc/filename`) when sourcing files in the current directory. This prevents the shell from wasting time searching the `$PATH` and prevents accidental execution of identically named files elsewhere on the system.
- **Use `return`, not `exit`:** When writing files intended to be sourced, handle errors by using `return 1`. This safely stops parsing the file without killing the user's terminal session.

## Interview Questions

**Q: A junior developer writes a script `setup.sh` that contains `export DB_URL="localhost"`. They run `./setup.sh`, but when they type `echo $DB_URL`, it returns blank. Explain why, and how to fix it.**
**A:** Running `./setup.sh` spawns a child subshell. The variable is exported into the child shell's memory space, but when the script finishes, the child shell is destroyed, and the parent shell is unaffected. To fix this, they must execute the script within the current shell's memory space using `source ./setup.sh` (or `. ./setup.sh`).

**Q: Does a file need to be marked as executable (`chmod +x`) to be run using `source`?**
**A:** No. Because `source` simply opens the file and reads its contents line-by-line into the active shell, it only requires read (`+r`) permissions. This is why it can bypass `noexec` mount restrictions.

## Practice Problems

**Problem:** You have a file named `.secrets` in your current directory containing environment variables. Write the most POSIX-compliant command to load these variables into your current terminal session.
**Hint:** Use the single-character operator instead of the bash-specific word.
**Solution:**

```bash
. ./.secrets
```

**Problem:** You modified your `~/.bashrc` file to add a new alias, but you don't want to close your terminal and open a new one to use it. Write the command to apply the changes immediately.
**Hint:** Evaluate the initialization file in the current shell.
**Solution:**

```bash
source ~/.bashrc
```

## References

- [Bash Builtins: source (GNU Manual)](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-source)
- [POSIX Specification for the dot (.) command](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#dot)
