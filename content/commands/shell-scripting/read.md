---
slug: read
name: read
aliases: []
category: shell-scripting
tags: [bash, shell, input, variables, parsing, scripting]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'read user input in bash'
  - 'parse file line by line bash'
  - 'prompt user for password safely'
  - 'split string by delimiter bash'
  - 'assign output to variables shell'
relatedCommands: [echo, printf, while, awk]
alternatives: [awk]
status: draft
---

## What is it?

`read` is a powerful shell built-in command used to capture a single line of input from standard input (or a file descriptor) and split it into discrete fields. It maps these fields directly to specified shell variables, making it the foundational tool for interactive user prompts, processing piped data streams, and iterating through flat text files line by line.

## Why does it exist?

Automated scripts must interact with both human operators and dynamic data sources. Writing external C programs or invoking heavy text manipulators (`awk`) just to prompt for a "Yes/No" or extract a column from a CSV is highly inefficient. `read` exists natively within the shell memory space to provide immediate, highly configurable input parsing. By leveraging the Internal Field Separator (`IFS`), it provides a zero-overhead mechanism to tokenize data streams and inject values straight into shell variables safely.

## Syntax

```bash
read [options] [name1 name2 ...]
```

## Flags

| Flag          | Description                                                                                                         | Example                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `-r`          | Raw mode. Prevents backslashes (`\`) from acting as escape characters (nearly always required).                     | `read -r line`                           |
| `-p <prompt>` | Outputs a prompt string before waiting for input (without appending a newline).                                     | `read -p "Enter username: " user`        |
| `-a <array>`  | Reads the input and splits the delimited words into a zero-indexed indexed array.                                   | `read -a my_array <<< "A B C"`           |
| `-s`          | Silent mode. Disables terminal echo, hiding characters typed by the user (ideal for passwords).                     | `read -s -p "Password: " pass`           |
| `-t <sec>`    | Timeout. Causes `read` to fail and return an error code if input is not provided within the specified seconds.      | `read -t 5 -p "Proceed? [y/N]: " ans`    |
| `-n <num>`    | Returns instantly as soon as exactly `<num>` characters are read, rather than waiting for Enter.                    | `read -n 1 -p "Press any key..."`        |
| `-d <delim>`  | Delimiter. Reads characters until it encounters the specified character, instead of a newline.                      | `read -d ':' data`                       |
| `-e`          | Enables `readline` support for the input, allowing the user to use arrow keys to edit their text before submission. | `read -e -i "default_val" var`           |
| `-i <string>` | Provides a default, editable text string in the input buffer (requires the `-e` flag).                              | `read -e -i "/var/log" -p "Path: " path` |
| `-u <fd>`     | Reads input from a specific file descriptor number instead of standard input (0).                                   | `read -u 3 line`                         |

## Examples

```bash
read -p "Enter target directory: " target_dir
```

> This invokes the basic interactive prompt. It prints the string to the terminal and halts execution. When the user types their response and presses Enter, the string is saved to the variable `$target_dir`.

```bash
read -s -p "Enter database password: " db_pass
```

> This utilizes the silent flag (`-s`). It prompts the user for a password, but intercepts the terminal output so keystrokes are completely invisible on screen, securely capturing the credential into `$db_pass`.

```bash
IFS="," read -r col1 col2 col3 <<< "admin,1001,active"
```

> This temporarily modifies the `IFS` (Internal Field Separator) to a comma for a single command. `read` parses the injected "Here-String" (`<<<`), splits it cleanly across the commas, and assigns `admin` to `$col1`, `1001` to `$col2`, and `active` to `$col3`.

```bash
if read -t 10 -p "Execute destructive backup? [y/N]: " confirm; then ...
```

> This implements a non-blocking timeout (`-t 10`). The script pauses for 10 seconds. If the user doesn't press 'y' and hit Enter within the window, the `read` command fails natively, allowing the script to safely default to 'No' and continue execution.

```bash
while IFS= read -r line; do echo "Processing: $line"; done < data.txt
```

> This is the definitive, mathematically safe pattern for reading a text file line-by-line in Bash. `IFS=` prevents leading/trailing whitespace from being stripped, and `-r` prevents backslashes from corrupting file paths, ensuring the loop processes exact, verbatim lines.

## Real-World Scenarios

**Parsing Configuration Files Safely**

```bash
while IFS='=' read -r key value; do
  [[ $key == \#* ]] && continue
  export "$key=$value"
done < .env
```

> CI/CD deployment scripts parse raw `.env` files natively. By setting `IFS='='`, `read` splits each line into an exact `$key` and `$value`. The script ignores comments (`#`) and exports the keys directly into the environment without relying on slow `sed`/`awk` substitutions.

**Extracting Formatted Data from Commands**

```bash
ip -br addr show eth0 | read -r iface state ip
```

> Systems administrators execute commands and pipe them directly into `read`. Because `read` naturally splits input based on whitespace (default `IFS`), it strips out the spacing, mapping the interface name, status, and IP address to their respective variables instantly.

## When should it NOT be used?

- **Reading massive (multi-gigabyte) log files:** **Reason:** Shell `while read` loops execute entirely inside the interpreter, instantiating variable memory per line. It is catastrophically slow compared to C-compiled binaries. **Use instead:** `grep`, `awk`, or `sed`.
- **Parsing JSON or structured XML:** **Reason:** `read` handles flat string delimiting. It has no concept of nested brackets or arrays. **Use instead:** `jq` (for JSON) or `yq` (for YAML/XML).

## Alternatives

- **`xargs`:** Fast pipeline consumption. **Tradeoff:** `xargs` consumes input streams and injects them as arguments into external commands rapidly, but it does not capture the data into local shell variables for complex internal scripting logic like `read` does.
- **`awk`:** Advanced columnar parsing. **Tradeoff:** `awk '{print $1}'` extracts columns faster than bash loops, but requires spawning an external process and writing separate `.awk` execution syntax, whereas `read` operates directly within local bash memory.

## How it works internally

`read` is a shell built-in function, meaning it shares memory space with the active Bash process and does not require `fork()`/`exec()` system calls to launch.

When invoked, it reads bytes sequentially from file descriptor 0 (standard input) or the descriptor provided by `-u`. It processes the stream character by character.

If `-r` is missing, it evaluates the backslash `\` as an escape mechanism. For example, a `\` at the very end of a line instructs `read` to swallow the newline and merge the next line of input into the current buffer. This frequently destroys literal file paths containing backslashes (like Windows SMB mounts).

When the command encounters a termination character (newline by default, or the character set by `-d`), it finalizes the buffer. It applies the `IFS` (Internal Field Separator, defaulting to Space/Tab/Newline) to break the string into tokens. It assigns Token 1 to Variable 1, Token 2 to Variable 2. Crucially, if there are more tokens than variables, the absolute _last_ variable receives the remainder of the entire un-split string.

## Performance Notes

- Executing `while read` loops across 50,000 lines is extremely inefficient in Bash because of interpreter overhead. If the entire goal of the loop is text manipulation, shift the logic to an `awk` script.
- Redirecting a file directly into a `while read` loop (`done < file.txt`) executes entirely within the current shell context, preserving variables. Piping data into it (`cat file.txt | while read`) spawns a subshell, meaning any variables modified inside the loop will be permanently lost when the loop terminates.

## Security Notes

- **Password Echoing:** The `-s` flag simply issues `termios` ioctl calls to the TTY to disable local character echo. It does not encrypt the password in memory. The variable holding the password resides in plaintext inside the shell's RAM.
- **Evaluation of Untrusted Input:** Variables captured by `read` are strictly static strings. However, if those strings are later passed into `eval`, `printf` format strings, or `sed` execution blocks without proper escaping, attackers can easily execute arbitrary code.

## Common Mistakes

- **Forgetting the `-r` flag:** Reading a file containing paths like `C:\temp\data`. **Why it's wrong:** Without `-r` (raw), `read` swallows the backslashes, parsing it as `C:tempdata`. The `-r` flag is so universally required that forgetting it is considered a defect in modern bash scripts.
- **Variable scoping in pipes:** Running `echo "data" | read var; echo $var`. **Why it's wrong:** The pipe `|` creates a subshell. The variable `$var` is created, assigned, and then instantly destroyed when the subshell closes. The final `echo` prints nothing. Use Here-Strings (`read var <<< "data"`) or Process Substitution to keep variables in the parent shell.
- **Not clearing `IFS` in loops:** Writing `while read -r line`. **Why it's wrong:** Standard `IFS` strips leading and trailing spaces/tabs from the string. If the file is indented YAML or Python code, all formatting is destroyed. You must use `while IFS= read -r line` to preserve exact formatting.

## Best Practices

- Universally form the muscle memory to write `IFS= read -r line`. This is the only way to guarantee a string is retrieved exactly byte-for-byte as it exists on disk or in the stream.
- When assigning multiple variables (e.g., `read var1 var2`), remember that `var2` consumes all remaining text on the line. If you only want the second word and want to discard the rest, use a dummy variable: `read var1 var2 trash`.
- Provide robust defaults for interactive prompts using short-circuit evaluation: `read -t 10 -p "Restart? [y/N]: " ans; ans=${ans:-N}`.

## Interview Questions

- _Query:_ What is the critical flaw in executing `cat file.txt | while read -r line; do TOTAL=$((TOTAL+1)); done; echo $TOTAL` to count lines in a file, and how must you rewrite it?
  - _A:_ The pipe operator (`|`) forces the `while read` loop to execute within a separate subshell environment. The `$TOTAL` variable is incremented inside that subshell, but the moment the loop finishes, the subshell terminates and its memory is wiped. The `echo` command in the parent shell prints nothing (or 0). To fix it, you must use file redirection directly into the loop, avoiding the subshell entirely: `while read -r line; do ... done < file.txt`.
- _Query:_ Why is omitting the `-r` flag on the `read` command universally considered a bug in modern bash scripting?
  - _A:_ By default, `read` evaluates backslashes (`\`) as line-continuation or escape characters. If a user inputs a Windows file path (`C:\User\Desktop`), `read` will silently swallow and strip the backslashes, corrupting the input. Applying `-r` enforces "raw" mode, instructing the cmdlet to treat all characters—including backslashes—as literal strings, guaranteeing data integrity.
- _Query:_ If you have a string `"ERROR 404 Not Found"` and you execute `read status code msg <<< "ERROR 404 Not Found"`, what exact text does the `$msg` variable contain?
  - _A:_ The `$msg` variable contains the string `Not Found`. `read` splits the input using the default space/tab IFS. It assigns "ERROR" to `$status` and "404" to `$code`. Because there are no more variables defined, it dumps the absolute entire remainder of the un-split string into the final variable, `$msg`.

## Practice Problems

- _Problem:_ Prompt the user interactively with the text `Delete cache? [y/N]: ` and capture their response. Limit the prompt so it automatically fails if the user does not type anything within 5 seconds.
  - _Hint:_ Combine the prompt flag and the timeout flag.
  - _Solution:_ `read -t 5 -p "Delete cache? [y/N]: " response` (This pauses for 5 seconds and assigns input to the variable, returning a non-zero exit code if it times out).
- _Problem:_ Parse a single string `admin:x:1000:1000` directly into four discrete variables (`user`, `pass`, `uid`, `gid`), ensuring the delimiter is strictly a colon.
  - _Hint:_ Override the Internal Field Separator and use a Here-String `<<<` to feed the text.
  - _Solution:_ `IFS=":" read -r user pass uid gid <<< "admin:x:1000:1000"` (This modifies the separator purely for the duration of the split, assigning the parsed tokens correctly).

## References

- [Bash Reference Manual - Bash Builtins (read)](https://www.gnu.org/software/bash/manual/bash.html#Bash-Builtins)
- [Greg's Wiki (BashFAQ) - How can I read a file line by line?](https://mywiki.wooledge.org/BashFAQ/001)
