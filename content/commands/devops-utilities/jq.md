---
slug: jq
name: jq
aliases: []
category: devops-utilities
tags:
  - json
  - parsing
  - filtering
  - text-processing
  - api
  - devops
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - cmd
  - sh
intentPhrases:
  - parse json in bash
  - extract value from json file
  - format json output
  - filter json array by key
  - modify json from curl
relatedCommands: [yq, grep, awk, sed, curl, docker-inspect, kubectl-api-resources]
alternatives: [yq, kubectl-api-resources]
status: published
---

## What is it?

`jq` is a lightweight, command-line JSON processor. It functions like `sed` or `awk` but is specifically engineered for structured JSON data, allowing users to slice, filter, map, and transform complex JSON payloads seamlessly within terminal environments and shell scripts.

## Why does it exist?

Traditional Unix text-processing tools (like `grep`, `sed`, and `awk`) operate on a line-by-line basis. When dealing with JSON—where data is hierarchical, nested, and whitespace-independent—line-based tools become incredibly brittle and fail on minified payloads. `jq` was created to solve this by parsing JSON into an internal tree structure and providing a Turing-complete, functional Domain Specific Language (DSL) to navigate and mutate that data programmatically, bridging the gap between REST APIs and bash automation.

## Syntax

```bash
jq [options] <jq-filter> [file...]
cat data.json | jq [options] <jq-filter>
```

## Flags

| Flag                       | Description                                                                                                                                  | Example                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `-r`, `--raw-output`       | Outputs raw strings instead of JSON-encoded strings (removes the surrounding quotes). Essential for assigning JSON values to bash variables. | `jq -r '.name' data.json`                  |
| `-c`, `--compact-output`   | Formats the output as a single, minified line instead of pretty-printed, multi-line JSON. Useful for streaming log processors.               | `jq -c '.' data.json`                      |
| `-e`, `--exit-status`      | Sets the exit status based on the output. Exits `0` if the result is true/valid, `1` if false/null, and `4` for a syntax error.              | `jq -e '.isActive' data.json`              |
| `-s`, `--slurp`            | Reads the entire input stream into memory as a single, large JSON array, rather than processing discrete JSON objects one by one.            | `jq -s 'length' lines.json`                |
| `-S`, `--sort-keys`        | Sorts the keys of objects lexicographically. Extremely useful when comparing two JSON files for semantic equivalence.                        | `jq -S '.' data.json`                      |
| `-R`, `--raw-input`        | Reads input as raw text lines instead of parsing them as JSON. Useful for converting standard text files into JSON arrays.                   | `cat list.txt                              | jq -R -s '.'`          |
| `--arg <name> <val>`       | Passes a string value into the `jq` filter as a predefined variable (`$name`). Safely injects bash variables into `jq`.                      | `jq --arg user "bob" '.[]                  | select(.name==$user)'` |
| `--argjson <name> <val>`   | Passes a JSON-encoded value (object, array, boolean, number) into the `jq` filter as a variable.                                             | `jq --argjson id 42 '.id = $id' data.json` |
| `-f <file>`, `--from-file` | Reads the `jq` filter instructions from a specified file rather than the command line argument. Best for massive transformations.            | `jq -f transform.jq data.json`             |
| `-C`, `--color-output`     | Forces `jq` to output colorized JSON, even when piping the output to another command like `less` or `tee`.                                   | `jq -C '.' data.json                       | less -R`               |

## Examples

```bash
jq '.' payload.json
```

> The simplest and most common usage. The `.` acts as the identity filter, taking the input and passing it unchanged to standard output, but heavily pretty-printing and colorizing the JSON for human readability.

```bash
curl -s [https://api.github.com/repos/stedolan/jq/commits](https://api.github.com/repos/stedolan/jq/commits) | jq -r '.[0].sha'
```

> Extracts a specific deeply nested value. It pipes the JSON response from an API, accesses the first element of the array `.[0]`, accesses the `sha` key, and uses `-r` to output the raw hash string without quotes.

```bash
jq 'map(select(.status == "active"))' users.json
```

> Filters a JSON array of objects. The `map` function iterates over the array, and `select` returns only the objects where the `.status` key is exactly equal to the string `"active"`.

```bash
jq '[.items[] | {id: .id, full_name: .name}]' data.json
```

> Performs a data transformation. It iterates over the `items` array and constructs a completely new array of objects containing only the `id` and `name` fields, effectively mapping and renaming the schema.

```bash
jq --arg ip "192.168.1.5" '.network.interfaces += [$ip]' config.json
```

> Injects an external shell variable into the JSON payload safely. It creates a variable `$ip` inside the `jq` scope, finds the `network.interfaces` array, and appends the new IP address to it.

## Real-World Scenarios

**Extracting JWT Claims in the Terminal**

```bash
TOKEN="eyJhbG..."
echo $TOKEN | awk -F. '{print $2}' | base64 --decode 2>/dev/null | jq '.'
```

> Developers frequently need to inspect JSON Web Tokens (JWTs) during local testing. This pipeline splits the token on the period to isolate the payload segment, decodes it from base64, and pipes the raw JSON string into `jq` to beautifully format the claims.

**Parsing AWS CLI Outputs**

```bash
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Role,Values=web" \
  | jq -r '.Reservations[].Instances[0].InstanceId')
```

> AWS CLI responses are notoriously verbose JSON documents. A deployment script uses `jq -r` to surgically extract the exact string value of the `InstanceId` for a server matching specific tags, storing it directly into a bash variable for the next deployment step.

**Mass Editing package.json Versions**

```bash
cat package.json | jq '.dependencies.axios = "^1.4.0"' > temp.json && mv temp.json package.json
```

> Instead of using error-prone `sed` regex replacements to update dependencies, a CI/CD script uses `jq` to explicitly traverse the JSON tree and update the version string of the `axios` library safely.

## When should it NOT be used?

- **Processing massive multi-gigabyte files:** **Do not use standard `jq` to parse 50GB log files.** Standard `jq` loads the entire JSON structure into memory to construct the parse tree. For massive files, you must use `--stream` mode, or switch to tools like `grep` or highly optimized Python/Go stream parsers.
- **In-place file editing:** **Do not use `jq` expecting it to modify the file directly.** Unlike `sed -i` or `yq -i`, `jq` does not natively support in-place editing. You must redirect to a temporary file and overwrite the original, which can cause data loss if the disk fills up during execution.
- **Parsing non-strict JSON:** **Do not use `jq` on Python dictionaries or trailing-comma JSON.** `jq` strictly enforces the RFC 8259 JSON specification. It will fail to parse files containing single quotes, trailing commas, or unquoted keys.

## Alternatives

- **`yq`:** **Best for YAML environments.** The spiritual successor to `jq` that handles YAML, XML, and JSON natively. It also supports in-place editing (`-i`).
- **`jmespath` (jp):** **Best for AWS-centric workflows.** The query language natively built into the AWS CLI (`--query`). It is highly optimized for extracting data but lacks `jq`'s powerful data mutation capabilities.
- **`python -m json.tool`:** **Best for environments lacking `jq`.** If you are on a bare-bones server and only need basic pretty-printing, the standard Python library can format JSON natively without installing external binaries.

## How it works internally

`jq` is written entirely in portable C and utilizes a custom-built parser/lexer. When you execute a `jq` command, it compiles the `<jq-filter>` string into bytecode for a custom, stack-based virtual machine specifically designed to operate on a stream of JSON values.

As input is piped in, `jq` leverages the `jv` (JSON Value) C library to dynamically parse the text into an internal tree representation of `jv` objects (booleans, numbers, strings, arrays, objects).

The `jq` virtual machine processes this tree. Everything in `jq` is a filter. The `.` identity filter takes an input and produces the same output. A filter like `.name` takes an object and yields the value associated with the key `name`. The pipe operator `|` inside the `jq` language takes the output stream of the left filter and feeds it as the input stream to the right filter, enabling massive, complex chains of functional map/reduce operations entirely inside the `jq` memory space before serializing the final `jv` objects back into a text stream.

## Performance Notes

- **Slurping Memory Costs:** The `-s` (`--slurp`) flag reads all input objects into a single massive array before processing. If you slurp a stream of 1 million JSON log lines, `jq` will consume gigabytes of RAM and likely crash via the OOM killer.
- **High-Speed C Execution:** For standard payload sizes (under 100MB), `jq` is blazingly fast because its internal VM and memory allocator are strictly tuned for JSON tokenization, easily outperforming equivalent Python or Node.js parsing scripts.

## Security Notes

- **Shell Injection via Concatenation:** If you construct a `jq` filter using bash variables directly (e.g., `jq '.[] | select(.name == "'$USER_INPUT'")'`), a malicious user can inject quotes and commands into the `jq` string. _Always_ use the `--arg` flag (e.g., `jq --arg user "$USER_INPUT" '.[] \vert{} select(.name == $user)'`) to ensure input is treated strictly as a data string by the `jq` VM.

## Common Mistakes

- **Forgetting `-r` in bash scripts**
  - _Mistake:_ `ID=$(jq '.id' data.json)` and then later making an API call using `https://api.com/users/$ID`.
  - _Why:_ Without `-r`, the value is assigned as `"12345"` (including the double quotes). The API call evaluates to `https://api.com/users/"12345"`, resulting in an HTTP 404. Always use `-r` for variables.
- **Iterating over arrays vs objects**
  - _Mistake:_ Using `.name` on an array of objects, resulting in `jq: error (at <stdin>): Cannot index array with string "name"`.
  - _Why:_ To access a key inside an array of objects, you must first unwrap the array into a stream of objects using `.[]`. The correct filter is `.[] | .name`.
- **Hyphens in key names**
  - _Mistake:_ Attempting to access a key with a dash via `.first-name`. `jq` misinterprets this as "first minus name".
  - _Why:_ Keys containing special characters or hyphens must be wrapped in quotes and brackets: `.["first-name"]`.

## Best Practices

- **Format with the Identity Filter:** Use `cat minified.json | jq '.' > formatted.json` to normalize and beautifully format API responses or messy configuration files before committing them to Git, keeping diffs clean.
- **Use `has()` for existence checks:** Before accessing deeply nested properties that might not exist, use `select(has("metadata"))` to prevent `jq` from throwing "null" errors in your output stream.

## Interview Questions

**Q: Explain the exact difference between the filters `.` and `.[]` in `jq`.**
**A:** The `.` is the identity filter; it passes the entire input structure (like an array or object) forward exactly as it received it. The `.[]` is the array/object value iterator; if applied to an array, it unwraps the array and outputs each element as a distinct, separate item in a stream, allowing subsequent filters in a pipe to process each item individually.

**Q: You need to parse an input value provided by an end-user and use it to filter a JSON file. Why is `jq '.users[] | select(.name == "'$USER'")'` considered dangerous, and what is the secure alternative?**
**A:** Using bash string interpolation to build the `jq` query allows for injection attacks; a malicious user could provide a string that breaks out of the quotes and alters the `jq` filter logic. The secure alternative is to use `jq`'s variable passing mechanism: `jq --arg name "$USER" '.users[] \vert{} select(.name == $name)'`.

## Practice Problems

**Problem:** You have a JSON response stored in `users.json`. You need to extract the raw string value of the `email` field, but only for the user whose `id` is equal to `42`.
**Hint:** You will need to unwrap the array, use the `select` function, pipe to the field, and use the raw output flag.
**Solution:**

```bash
jq -r '.[] | select(.id == 42) | .email' users.json
```

**Problem:** You want to check if a local JSON file (`config.json`) is syntactically valid JSON. You want `jq` to output absolutely nothing to the terminal, but you want it to set a non-zero exit status if the file is invalid so your bash script can fail safely.
**Hint:** Use the flag that sets exit status and redirect standard output to `/dev/null`.
**Solution:**

```bash
jq -e '.' config.json > /dev/null
```

## References

- [jq Manual (stedolan.github.io)](https://stedolan.github.io/jq/manual/)
- [jq on GitHub](https://github.com/stedolan/jq)
