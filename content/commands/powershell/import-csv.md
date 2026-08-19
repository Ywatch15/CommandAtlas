---
slug: import-csv
name: Import-Csv
aliases:
  - ipcsv
category: powershell
tags:
  - powershell
  - data-import
  - csv
  - pipeline
  - parsing
  - scripting
difficulty: beginner
supportedOS:
  - windows
  - linux
  - macos
supportedShells:
  - powershell
  - powershell
intentPhrases:
  - read csv file in powershell
  - import data from csv to array
  - parse comma separated values powershell
  - load csv into custom objects
  - convert text to objects ps
relatedCommands:
  - export-csv
  - select-object
  - foreach-object
alternatives:
  - get-content
status: draft
---

## What is it?

`Import-Csv` is a core PowerShell cmdlet used to read comma-separated values (CSV) files and convert them into structured arrays of custom .NET objects (`PSCustomObject`). It automatically parses the first row of the file as property names and maps all subsequent rows to the corresponding properties of the generated objects, enabling immediate programmatic manipulation.

## Why does it exist?

Traditional shell scripting in bash or cmd required brittle text-parsing tools (like `awk`, `cut`, or complex regex) to extract columnar data from flat text files. `Import-Csv` exists to bridge the gap between flat-file data exchange and PowerShell's object-oriented pipeline. It natively handles text escaping, quoting, and delimiter separation, instantly granting operators the ability to filter, sort, and iterate through external data as native objects.

## Syntax

```powershell
Import-Csv [[-Path] <string[]>] [[-Delimiter] <char>] [options]
Import-Csv -LiteralPath <string[]> [-UseCulture] [options]
```

## Flags

| Flag              | Description                                                                                         | Example                                           |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `-Path`           | Specifies the path to the CSV file(s) to import. Supports wildcard patterns.                        | `Import-Csv -Path .\users.csv`                    |
| `-LiteralPath`    | Specifies the exact path to the file. Bypasses wildcard resolution (critical for paths with `[ ]`). | `Import-Csv -LiteralPath '.\data[1].csv'`         |
| `-Delimiter`      | Specifies the character that separates the property values. Defaults to the comma `,`.              | `Import-Csv -Path .\data.tsv -Delimiter "`t"`     |
| `-Encoding`       | Specifies the file encoding (e.g., `UTF8`, `ASCII`, `Unicode`).                                     | `Import-Csv -Path .\data.csv -Encoding UTF8`      |
| `-Header`         | Manually specifies an array of column header names, overriding or supplying missing headers.        | `Import-Csv .\data.txt -Header "ID","Name","Age"` |
| `-UseCulture`     | Uses the list separator of the current culture (e.g., `;` in Europe instead of `,`).                | `Import-Csv -Path .\euro_data.csv -UseCulture`    |
| `-AsDictionary`   | (PS 7.3+) Imports each row as an `[ordered]` hashtable rather than a `PSCustomObject`.              | `Import-Csv .\data.csv -AsDictionary`             |
| `-EscapeHandling` | (PS 7+) Specifies how escape characters are handled. Defaults to `Escape`.                          | `Import-Csv .\data.csv -EscapeHandling Disable`   |
| `-QuoteCharacter` | (PS 7+) Specifies the character used to enclose values containing the delimiter.                    | `Import-Csv .\data.csv -QuoteCharacter "'"`       |
| `-MaxCount`       | (PS 7+) Limits the import to the specified number of top rows, useful for inspecting large files.   | `Import-Csv .\massive.csv -MaxCount 10`           |

## Examples

```powershell
Import-Csv -Path .\employees.csv
```

> This reads the file, treats the first line as property headers, and outputs a stream of `PSCustomObject` instances to the console, neatly formatted as a list or table depending on the number of columns.

```powershell
Import-Csv -Path .\logs.txt -Header "Date", "EventID", "Message"
```

> This imports a delimiter-separated text file that lacks a header row. By supplying the `-Header` array, the cmdlet artificially applies these property names to the resulting objects, ensuring the first row of data is not accidentally swallowed as the header.

```powershell
Import-Csv -Path .\inventory.tsv -Delimiter "`t" | Where-Object { $_.Status -eq "Active" }
```

> This reads a Tab-Separated Values (TSV) file by explicitly setting the delimiter to the PowerShell backtick-t tab character. It immediately pipelines the parsed objects into a filter to isolate only the "Active" inventory items.

```powershell
$Users = Import-Csv -LiteralPath "C:\Data\[Export]HR.csv" -Encoding UTF8
```

> This targets a file with square brackets in the filename, utilizing `-LiteralPath` to prevent PowerShell from incorrectly interpreting `[Export]` as a regex character class. The objects are collected in RAM inside the `$Users` variable.

```powershell
Import-Csv .\data.csv | ForEach-Object { [int]$_.Age * 2 }
```

> This demonstrates data mutation. Because `Import-Csv` natively treats all parsed values as strings, the property `$_.Age` must be explicitly cast to an `[int]` before mathematical operations can be performed on it.

## Real-World Scenarios

**Bulk Active Directory User Creation**

```powershell
Import-Csv .\new_hires.csv | ForEach-Object {
    New-ADUser -SamAccountName $_.Username -GivenName $_.FirstName -Surname $_.LastName -Path "OU=Users,DC=corp,DC=com"
}
```

> IT Administrators use `Import-Csv` to read HR-provided spreadsheets containing employee data, iterating through the object stream to programmatically generate hundreds of Active Directory accounts in seconds.

**Mass Infrastructure Configuration Updates**

```powershell
$Servers = Import-Csv .\server_patch_list.csv
Invoke-Command -ComputerName $Servers.Hostname -ScriptBlock { Install-WindowsUpdate -AcceptAll }
```

> Cloud engineers read infrastructure inventory manifests exported from CMDBs to extract raw hostnames. PowerShell natively unwraps the `.Hostname` property from the array of custom objects, passing it cleanly to parallel remote execution commands.

## When should it NOT be used?

- **Processing multi-gigabyte files with limited RAM:** **Reason:** Assigning `Import-Csv` to a variable (`$data = Import-Csv massive.csv`) forces the entire file into memory as heavy .NET objects, causing `OutOfMemoryException` crashes. **Use instead:** Pipeline streaming (`Import-Csv massive.csv | ForEach-Object`) or `[System.IO.StreamReader]`.
- **Importing hierarchical or nested data structures:** **Reason:** CSV is a strictly flat, two-dimensional format. It cannot represent nested arrays or objects. **Use instead:** `Get-Content | ConvertFrom-Json` or `Import-Clixml`.

## Alternatives

- **`ConvertFrom-Csv`:** Memory-based CSV parsing. **Tradeoff:** Operates identically to `Import-Csv` but accepts raw strings via the pipeline or variables rather than reading a physical file from the disk.
- **`[Microsoft.VisualBasic.FileIO.TextFieldParser]`:** The underlying .NET parsing class. **Tradeoff:** It is drastically faster for massive file processing and memory management but requires significantly more verbose C#-style coding to instantiate and loop through.

## How it works internally

When you execute `Import-Csv`, PowerShell opens a `System.IO.StreamReader` against the target file. It reads the first line and splits it based on the specified `-Delimiter` (or comma by default) to establish the property names.

For every subsequent line, it reads the string, respects text qualifiers (like double quotes `"` used to encapsulate values containing internal delimiters or newlines), and splits the line into an array of values. It then uses the `PSObject` type system to instantiate a new `PSCustomObject`.

It maps the parsed string values to `NoteProperty` members dynamically named after the extracted headers. Because CSV files lack schema metadata, the internal engine assigns every single parsed value the type of `System.String`, completely discarding original integers, booleans, or dates. The object is then yielded to the pipeline synchronously.

## Performance Notes

- Creating dynamic `PSCustomObject` wrappers for every row introduces high overhead. Importing a 500,000-line CSV file via `Import-Csv` is magnitudes slower than parsing the text manually with `Get-Content` and `.Split()`.
- In PowerShell 7+, the CSV parsing engine was completely rewritten natively in C# rather than relying on legacy Windows routines, resulting in a significantly faster and more standard-compliant import speed.

## Security Notes

- **Blind Execution Risks:** Because the import creates objects with arbitrary strings, passing a property like `$_.Hostname` directly into an `Invoke-Expression` or `Start-Process` command without sanitization exposes scripts to injection attacks if the CSV was authored by an untrusted user.

## Common Mistakes

- **Assuming data types are preserved:** Running `Import-Csv file.csv | Where-Object { $_.Count -gt 5 }`. **Why it's wrong:** The `Count` property is imported as a String (`"10"`). String comparison evaluates `"10"` as _less than_ `"5"` because `1` comes before `5` alphabetically. You must cast it: `[int]$_.Count -gt 5`.
- **Mismatched delimiters:** Importing a European CSV file that uses semicolons. **Why it's wrong:** `Import-Csv` expects commas. It will parse the entire row as a single, useless string under one header. You must explicitly pass `-Delimiter ";"` or `-UseCulture`.
- **Empty headers in the source file:** **Why it's wrong:** If the CSV file has two columns but the header row only defines one, or if a header name is blank, the cmdlet throws a terminating error `MemberAlreadyExists` or `InvalidHeader`. You must use `-Header` to override the broken source data.

## Best Practices

- Always strictly type-cast properties extracted from `Import-Csv` immediately upon consumption (e.g., `[datetime]$_.JoinDate` or `[bool][System.Convert]::ToBoolean($_.IsActive)`) to prevent insidious logical errors during conditional evaluations.
- If the source CSV contains spaces in the header names (e.g., "First Name"), encapsulate the property call in quotes when accessing it dynamically in scripts: `$_. 'First Name'`.
- Utilize `-AsDictionary` (if available in PS 7.3+) when raw speed and memory efficiency are paramount, as ordered hashtables carry far less structural overhead than `PSCustomObject` instances.

## Interview Questions

- _Query:_ You import a CSV containing a column named 'Salary' and run a sort: `Import-Csv data.csv | Sort-Object Salary -Descending`. The values `90000`, `120000`, and `85000` sort incorrectly, placing `90000` at the top. Why?
  - _A:_ `Import-Csv` lacks schema knowledge and natively imports all properties as `System.String` types. The `Sort-Object` cmdlet performs an alphabetical string sort, where the character "9" evaluates as higher than "1", placing "90000" above "120000". To fix this, you must cast the property to an integer during the sort: `Sort-Object { [int]$_.Salary } -Descending`.
- _Query:_ How does `Import-Csv` behave if the source file contains a data row with more column values than there are headers defined in the first row?
  - _A:_ The cmdlet will throw a terminating error or silently truncate data depending on the PowerShell version. Generally, it expects a strict rectangular dataset. To resolve malformed files with missing headers, you must use the `-Header` parameter to manually specify an array of header names covering the maximum width of the data.
- _Query:_ A CSV file contains a column value that itself has a comma in it, such as `Smith, John`. How must the CSV be formatted so `Import-Csv` does not mistakenly split this into two separate columns?
  - _A:_ The value must be text-qualified (encapsulated) in double quotes: `"Smith, John"`. The internal CSV parsing engine recognizes that commas residing inside matching double quotes are literal string characters, not structural delimiters.

## Practice Problems

- _Problem:_ Import a file located at `inventory.csv`. Filter the results so that only objects where the `Quantity` column is mathematically less than 50 are returned.
  - _Hint:_ Import the file, pipe it, and ensure you cast the property to an integer before evaluating the conditional.
  - _Solution:_ `Import-Csv inventory.csv | Where-Object { [int]$_.Quantity -lt 50 }` (This correctly evaluates the numerical value rather than the string).
- _Problem:_ Read a poorly formatted text file named `data.log` that uses the pipe character (`|`) as a delimiter and entirely lacks a header row. Assign the headers `Timestamp`, `Severity`, and `Message` to the imported objects.
  - _Hint:_ Combine the delimiter override flag with the manual header array injection.
  - _Solution:_ `Import-Csv data.log -Delimiter "|" -Header "Timestamp", "Severity", "Message"` (This forces the parser to split correctly and assigns custom properties without swallowing the first row).

## References

- [Microsoft Docs - Import-Csv](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/import-csv)
- [about_Objects (PowerShell)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_objects)
  === END FILE ===
