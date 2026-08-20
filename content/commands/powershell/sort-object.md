---
slug: sort-object
name: Sort-Object
aliases:
  - sort
category: powershell
tags:
  - powershell
  - objects
  - data-processing
  - sorting
  - pipeline
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - sort objects by property
  - order array in powershell
  - sort descending powershell
  - find unique values in array
  - sort processes by memory
relatedCommands:
  - select-object
  - where-object
status: draft
alternatives: []
---

## What is it?

`Sort-Object` is a pipeline utility cmdlet used to arrange .NET objects in ascending or descending order based on the values of one or more specified properties. Unlike traditional text-based sorting tools (which parse strings alphabetically), `Sort-Object` interacts directly with the underlying data types—sorting integers mathematically, `DateTime` objects chronologically, and strings lexicographically—ensuring perfectly accurate ordering of complex system data.

## Why does it exist?

When querying APIs, Active Directory, or the local operating system, PowerShell cmdlets often return massive, unsorted arrays of data objects. Analyzing a list of 500 running processes or 10,000 files requires deterministic ordering. `Sort-Object` exists to provide an incredibly powerful, property-aware sorting engine directly in the pipeline. It handles the heavy lifting of invoking .NET `IComparable` interfaces, allowing administrators to execute multi-tier sorts (e.g., sort by Department, then by LastName) or extract unique elements without writing complex array-manipulation logic in C# or Python.

## Syntax

```powershell
Sort-Object [[-Property] <Object[]>] [options]
```

## Flags

| Flag             | Description                                                                                                                       | Example                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `-Property`      | (Positional) The property or array of properties to sort by. Supports calculated properties (hashtables or script blocks).        | `Sort-Object -Property Length, Name`            |
| `-Descending`    | Reverses the sorting algorithm, ordering items from highest to lowest, newest to oldest, or Z to A.                               | `Sort-Object -Property CPU -Descending`         |
| `-Unique`        | Eliminates duplicates from the output. Only the first instance of an object (based on the sorted property) is returned.           | `Sort-Object -Property Status -Unique`          |
| `-CaseSensitive` | Forces a strict case-sensitive sort. By default, PowerShell string sorting is case-insensitive.                                   | `Sort-Object -Property Name -CaseSensitive`     |
| `-Top`           | (PowerShell 5+) Returns only the specified number of items from the absolute top of the sorted array.                             | `Sort-Object -Property CPU -Descending -Top 5`  |
| `-Bottom`        | (PowerShell 5+) Returns only the specified number of items from the absolute bottom of the sorted array.                          | `Sort-Object -Property Length -Bottom 3`        |
| `-Culture`       | Specifies the cultural context (e.g., `fr-FR`) to use for complex string sorting rules.                                           | `Sort-Object -Property Name -Culture "de-DE"`   |
| `-InputObject`   | Specifies the objects to be sorted. Usually supplied via the pipeline, but can be passed directly as an array.                    | `Sort-Object -InputObject $users -Property Age` |
| `-Stable`        | (PowerShell 6+) Guarantees that items with identical sort properties maintain their original relative order from the input array. | `Sort-Object -Property Status -Stable`          |

## Examples

```powershell
Get-Process | Sort-Object -Property CPU -Descending
```

> The universal performance audit. Fetches all running OS processes and mathematically sorts them based on the `CPU` property from highest to lowest, immediately revealing resource hogs.

```powershell
Get-ChildItem -Path C:\Logs | Sort-Object -Property Length -Descending | Select-Object -First 10
```

> Hunts down massive files. It retrieves file objects, sorts them mathematically by byte size (`Length`), and isolates the top 10 largest files. (Note: Using `-Top 10` in `Sort-Object` achieves the exact same result faster in PS 5+).

```powershell
$users | Sort-Object -Property Department, LastName, FirstName
```

> Executes a multi-tier sort. The algorithm first groups all users by `Department`. Within those identical departments, it alphabetizes by `LastName`. If the last names match, it falls back to alphabetizing by `FirstName`.

```powershell
Get-EventLog -LogName System | Sort-Object -Property EventID -Unique
```

> Deduplicates data streams. Instead of returning 50,000 log entries, this command returns exactly one object for every unique `EventID` encountered in the log, instantly generating a summary dictionary of distinct error codes.

```powershell
Get-ChildItem | Sort-Object { $_.Extension.ToUpper() }
```

> Sorts using a dynamically calculated property. Instead of passing a static property name, it passes a ScriptBlock `{ ... }`. `Sort-Object` evaluates this block against every file (`$_`), extracts the extension, converts it to uppercase, and sorts the files alphabetically based on that dynamic result.

## Real-World Scenarios

**AWS EC2 Instance Auditing**

```powershell
Get-EC2Instance | Sort-Object -Property @{Expression="InstanceType"; Descending=$false}, @{Expression="LaunchTime"; Descending=$true}
```

> Cloud engineers often need complex reports. This command utilizes hash tables to assign different sorting directions to different properties simultaneously. It groups all instances by their `InstanceType` (e.g., all `t3.micro` together) alphabetically, and within those groups, sorts them so the newest (`LaunchTime` descending) instances appear first.

**Parsing IP Addresses Correctly**

```powershell
$ips | Sort-Object { [version]$_ }
```

> Standard string sorting breaks on IP addresses (e.g., `10.0.0.2` sorts _after_ `10.0.0.10` because the character '2' follows '1'). By using a script block to dynamically cast the IP strings into `[version]` or `[IPAddress]` objects during evaluation, `Sort-Object` invokes numerical sorting, returning perfectly ordered subnets.

## When should it NOT be used?

- **Massive Data Sets without constraints:** **Do not pipe millions of objects into `Sort-Object` unnecessarily.** `Sort-Object` is a "blocking" cmdlet. It cannot output a single item until the _entire_ upstream pipeline has finished sending data, as the absolute last item might belong at the very top. This consumes massive amounts of RAM and stalls script execution.
- **Database Queries:** If you are querying SQL or Active Directory via a module, **do not pull 50,000 users into PowerShell to run `Sort-Object`.** Always use the `-Sort` or `ORDER BY` parameters natively in the SQL/AD query. Offload the heavy lifting to the highly optimized backend database engine.

## Alternatives

- **LINQ `OrderBy()`:** **Best for high-performance C# integration.** If writing advanced PowerShell classes or massive arrays, calling native .NET LINQ extensions (`[Linq.Enumerable]::OrderBy()`) drastically outperforms the pipeline overhead of `Sort-Object`.
- **`Group-Object`:** **Best for counting and categorizing.** If you want to sort items to see how many of each type exist, use `Group-Object -NoElement | Sort-Object Count`, which provides grouped analytics instantly.

## How it works internally

`Sort-Object` is a pipeline blocking cmdlet. As objects flow down the pipeline (e.g., from `Get-Process`), `Sort-Object` intercepts them and appends them to an internal dynamic array (a `List<T>`). No data is output to the console during this phase.

Once the upstream pipeline is exhausted (meaning all data has been received), the cmdlet begins evaluation.
For each object, it extracts the value of the requested `-Property`. It checks if the .NET class of that property implements the `IComparable` interface. If it does, PowerShell uses the native .NET comparative logic (e.g., comparing integers numerically, or `DateTime` objects via ticks). If it doesn't, PowerShell attempts to cast the properties to strings and compares them lexicographically.

If multiple properties are specified (e.g., `Sort-Object PropA, PropB`), it relies on a multi-pass stable sort algorithm. It sorts by `PropB` first, and then sorts by `PropA`.

Finally, once the internal array is perfectly ordered, `Sort-Object` unspools the array, yielding the objects down the pipeline one by one to the next cmdlet (like `Format-Table` or `Select-Object`).

## Performance Notes

- **The Pipeline Stall:** Because sorting is inherently a whole-dataset operation, inserting `Sort-Object` in the middle of a pipeline absolutely destroys asynchronous streaming benefits. If a pipeline takes 10 minutes to generate data, the user will see a blank screen for 10 minutes, followed by a massive burst of sorted output.
- **Top/Bottom Optimization:** In PowerShell 5+, using `-Top 5` is magnitudes faster than `| Sort-Object | Select-Object -First 5`. The `-Top` parameter invokes a bounded priority queue algorithm internally (like a Min-Heap). It only keeps the 5 largest items in memory, aggressively discarding everything else during the collection phase, saving massive RAM allocations.

## Security Notes

- **Script Block Injection:** If using the dynamic script block feature (`Sort-Object { $_.Prop }`), ensure the script block does not execute untrusted user input, as the block is evaluated using full execution privileges against every object in the pipeline.

## Common Mistakes

- **Sorting before filtering**
  - _Mistake:_ `Get-ADUser -Filter * | Sort-Object Name | Where-Object Enabled -eq $true`
  - _Why:_ This is a massive performance flaw. The script pulls 10,000 users, executes heavy memory allocation and CPU sorting algorithms on 10,000 objects, and _then_ throws away 9,000 disabled users. Always filter first: `Where-Object -> Sort-Object`.
- **Misunderstanding String Sorting**
  - _Mistake:_ Sorting an array of strings representing numbers: `"10", "2", "1" | Sort-Object`. The output is `1, 10, 2`.
  - _Why:_ Because the objects are strings, they are sorted alphabetically character-by-character. To sort numerically, you must cast the objects to integers during the sort: `Sort-Object { [int]$_ }`.

## Best Practices

- **Use Calculated Properties for Complex Logic:** Do not permanently alter objects just to sort them. Use the hash table syntax to enforce mixed direction sorting: `Sort-Object @{Expression="Priority"; Descending=$true}, @{Expression="Date"; Descending=$false}`.
- **Use `-Unique` for rapid deduplication:** When combining arrays of strings or extracting distinct lists of IP addresses, `Sort-Object -Unique` is the fastest, cleanest native syntax for set deduplication.

## Interview Questions

**Q: You have an array of IP addresses stored as raw text strings. You run `$ips | Sort-Object`. The output places `10.0.0.20` BEFORE `10.0.0.3`. Why did this happen, and how do you write the command to sort them correctly?**
**A:** This happens because `Sort-Object` defaults to lexicographical (alphabetical) sorting for strings. Because the character "2" comes before the character "3" in the ASCII table, "20" is sorted before "3". To fix this, you must force mathematical evaluation by dynamically casting the strings to an IP object during the sort via a script block: `$ips \vert{} Sort-Object { [version]$_ }` or `[IPAddress]$_`.

**Q: Explain why you should always strive to place `Where-Object` BEFORE `Sort-Object` in a long pipeline.**
**A:** `Sort-Object` is a blocking cmdlet that requires allocating memory for every object it receives and processing them through sorting algorithms (like Quicksort). If you place `Where-Object` after the sort, you waste CPU and RAM sorting thousands of objects that you ultimately plan to throw away. Placing `Where-Object` first strips the dataset down to the minimum required size, drastically reducing the computational burden on the downstream sort operation.

## Practice Problems

**Problem:** You have a massive log folder. Write the pipeline to retrieve all the files in `C:\Logs`, sort them strictly by their file size from largest to smallest, and output exclusively the 3 largest files. Do this using the most memory-efficient parameters available in PowerShell 5+.
**Hint:** Use the specific parameter designed to optimize bounded sorting without needing `Select-Object`.
**Solution:**

```powershell
Get-ChildItem C:\Logs | Sort-Object -Property Length -Descending -Top 3
```

**Problem:** You queried a cloud provider and have an array of server objects. You need to output a list of servers, sorted first by `Region` (alphabetically A-Z), and then within each region, sorted by `Cost` (highest to lowest). Write the specific calculated property syntax to achieve this mixed-direction sort.
**Hint:** You need to pass an array to `-Property` where one element is a string and the other is a hashtable defining the expression and descending state.
**Solution:**

```powershell
$servers | Sort-Object -Property Region, @{Expression="Cost"; Descending=$true}
```

## References

- [Sort-Object (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/sort-object)
- [about_Calculated_Properties (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_calculated_properties)
