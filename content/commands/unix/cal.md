---
slug: cal
name: cal
aliases: [ncal]
category: unix
tags: [linux, calendar, date, utilities]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'display calendar in terminal linux'
  - 'show current month calendar bash'
  - 'display full year calendar'
  - 'show specific month calendar linux'
  - 'julian calendar bash'
relatedCommands: [date, uptime, watch]
alternatives: [date]
status: draft
---

## What is it?

`cal` is a classic POSIX command-line utility used to print a formatted, text-based visual calendar to standard output. Originating in Version 1 Unix (1971), it calculates and displays the current month, a specific historical month, or an entire year, mapping the days of the week to their correct dates based on the Gregorian and Julian calendar algorithms.

## Why does it exist?

Before graphical user interfaces (GUIs) or desktop widgets existed, terminal users needed a rapid way to calculate date offsets (e.g., "What day of the week does the 15th of next month fall on?"). While the `date` command can output formatted time strings, it lacks spatial formatting. `cal` exists to provide instant visual context. By rendering a perfectly aligned, monospace grid directly in the shell, it allows administrators and developers to visually plan cron jobs, audit log timestamps, and calculate deployment windows without breaking context to open an external application.

## Syntax

```bash
cal [options] [[[day] month] year]
```

_(Note: Modern implementations like `util-linux cal` or `bsdmainutils ncal` support varying syntaxes. The following assumes modern GNU/Linux `util-linux`)._

## Flags

| Flag                   | Description                                                                                                   | Example    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| `-1`, `--one`          | Displays only a single month (the current month). This is the default behavior if no flags are provided.      | `cal -1`   |
| `-3`, `--three`        | Displays three months simultaneously: the previous month, the current month, and the next month.              | `cal -3`   |
| `-y`, `--year`         | Displays a calendar for the entire current year (all 12 months formatted in a grid).                          | `cal -y`   |
| `-Y`, `--twelve`       | Displays the next 12 months, starting from the _current_ month, rather than January of the current year.      | `cal -Y`   |
| `-m`, `--monday`       | Forces the calendar to start the week on Monday instead of the default Sunday (adhering to ISO 8601).         | `cal -m`   |
| `-s`, `--sunday`       | Forces the calendar to start the week on Sunday.                                                              | `cal -s`   |
| `-j`, `--julian`       | Displays Julian days (1-365) representing the day of the year, rather than standard days of the month (1-31). | `cal -j`   |
| `-A <N>`, `--after=N`  | Displays `N` months _after_ the target month.                                                                 | `cal -A 2` |
| `-B <N>`, `--before=N` | Displays `N` months _before_ the target month.                                                                | `cal -B 1` |
| `-h`, `--help`         | Prints a brief help message displaying the usage syntax and available flags.                                  | `cal -h`   |

## Examples

```bash
cal
```

> The standard invocation. Detects the system's current date and outputs a small grid representing the current month, with today's date visually highlighted (usually via terminal reverse-video or color formatting).

```bash
cal 2024
```

> Specifying a year. Outputs the entire 12-month grid for the year 2024. The months are cleanly stacked in rows of 3, designed to perfectly fit a standard 80-character wide terminal window.

```bash
cal 8 1991
```

> Specific month targeting. The utility calculates the leap years and day offsets, outputting the exact calendar for August 1991. The first argument is strictly the month number, the second is the year.

```bash
cal -3 -m
```

> Professional planning view. Outputs the previous, current, and next month side-by-side. The `-m` flag sets Monday as the first column on the left, aligning with global ISO business standards, making it easier to calculate business-day sprint cycles.

```bash
cal -j 12 2023
```

> Julian day calculation. Displays December 2023, but instead of the days being numbered 1 to 31, they are numbered 335 to 365. This is heavily utilized by mainframe administrators and developers who rely on Julian dates for batch job processing.

## Real-World Scenarios

**Terminal Dashboards (MOTD)**

> System administrators frequently embed `cal -3` into the `/etc/motd` (Message of the Day) script or a user's `.bash_profile`. When an engineer logs into the server via SSH, they are instantly greeted with a 90-day visual timeline, establishing context for system maintenance or log expiration tasks before they execute a single command.

**Cron Job Planning Verification**

> An SRE needs to schedule a highly disruptive database maintenance cron job to run exclusively on the 3rd Sunday of the month in the upcoming quarter. Instead of calculating the dates mentally or switching to a browser, they run `cal -A 3`. They visually identify the dates (e.g., Nov 19, Dec 17) to accurately program the deployment pipeline configuration.

## When should it NOT be used?

- **Timezone Conversions:** **`cal` does not handle timezones.** It simply prints a rigid mathematical matrix. If you need to know what time it is in Tokyo, or convert Unix epoch timestamps to human-readable strings, `cal` is useless. You must use the `date` command.
- **Programmatic Date Extraction:** **Do not parse the output of `cal` with `awk` or `grep` in shell scripts.** The output is heavily padded with spaces, carriage returns, and ANSI color codes to make it visually appealing. Extracting the "last day of the month" by parsing the `cal` grid is incredibly brittle. Use `date -d "-1 days +1 month" +%d` instead.

## Alternatives

- **`ncal` (New Calendar):** **The direct evolution.** On many Debian/Ubuntu systems, `cal` is actually just a symlink to `ncal`. `ncal` offers an alternative, vertically-oriented layout where the days of the week run down the left column, rather than across the top, which some users find easier to read.
- **`date`:** **Best for logic.** While `cal` is for human eyes, `date` is for machine logic. Use `date` for math, formatting, and variables.
- **`gcal` (GNU Calendar):** A heavily extended, separate utility that supports complex holiday calculations, moon phases, and alternative cultural calendar systems (like Hijri or Islamic).

## How it works internally

`cal` is entirely a mathematical engine; it does not query an external database or network API to build its display.

When you run `cal`, the utility uses the `time()` and `localtime()` system calls to determine the current system date and year. It then feeds these integers into a series of deeply established calendrical algorithms (primarily Zeller's congruence or similar mathematical formulas) to determine exactly what day of the week the 1st of the target month falls on.

Crucially, `cal` is historically accurate, maintaining hardcoded logic to handle the transition from the Julian calendar to the Gregorian calendar.

In the British Empire (and its colonies), this transition occurred in September 1752. If you type `cal 9 1752`, `cal` mathematically honors this historical anomaly. The output will show September 2nd immediately followed by September 14th. The 11 days in between were physically removed from history to correct the calendar drift. The `cal` binary handles these complex leap-year and transition edge-cases flawlessly before using simple `printf` loops to align the matrix and push it to standard output.

## Performance Notes

- **Instantaneous:** `cal` executes purely in CPU registers performing integer arithmetic. It requires zero disk I/O and zero network calls, running effectively instantly on any hardware.

## Security Notes

- **Completely Benign:** `cal` is a read-only mathematical text formatter. It possesses no capabilities to escalate privileges or access sensitive files, making it entirely safe.

## Common Mistakes

- **Entering two-digit years**
  - _Mistake:_ Typing `cal 24` expecting the calendar for the year 2024.
  - _Why:_ `cal` does not assume the century. It strictly honors the integer provided. `cal 24` will output the 12-month calendar for the year 24 A.D. (during the Roman Empire). You must always provide the full four-digit year: `cal 2024`.
- **Mixing up Month and Year arguments**
  - _Mistake:_ Typing `cal 2024 10` expecting October 2024.
  - _Why:_ The positional arguments are strictly `[month] [year]`. The command will fail with an error complaining that 2024 is not a valid month (since months must be 1-12). The correct format is `cal 10 2024`.
- **Relying on the default Sunday start**
  - _Mistake:_ An administrator in Europe writes a script assuming the first column of `cal` is Monday.
  - _Why:_ Depending on the Linux distribution and the system's `LC_TIME` locale variable, `cal` may default to Sunday as the first day of the week (US standard) or Monday. To guarantee behavior across diverse servers, always explicitly force the alignment using `-m` (Monday) or `-s` (Sunday).

## Best Practices

- **Combine with `watch`:** If you are waiting for a specific date or event, `watch -n 3600 cal -3` turns your terminal into a persistent, auto-refreshing wall calendar that updates every hour.
- **Disable highlighting for scripts:** The utility uses terminal escape sequences to visually highlight the current day. If you must redirect `cal` output to a text file for documentation, use the `--color=never` flag (if supported by your `util-linux` version) to prevent ugly `^[[7m24^[[27m` ANSI characters from corrupting your text file.

## Interview Questions

**Q: You type `cal 9 1752` into a Linux terminal. The output displays the dates 1, 2, 14, 15, skipping dates 3 through 13 entirely. Why does the `cal` command do this?**
**A:** The `cal` command is historically accurate. In September 1752, the British Empire transitioned from the Julian calendar to the Gregorian calendar. To realign the calendar with the solar equinoxes, it was decreed that the 11 days following September 2nd would be skipped. `cal` implements this specific historical offset algorithmically, perfectly representing the true historical calendar of that month.

**Q: A developer writes a bash script that uses `grep` on the output of `cal` to find the last day of the current month. Why is this an architectural anti-pattern, and what command should they use instead?**
**A:** `cal` is a visual formatter designed exclusively for human terminal reading. It pads output with variable spaces, newlines, and potentially ANSI escape codes for color highlighting. Parsing it with `grep` or `awk` is incredibly brittle; changes in terminal width or locale (which might shift the layout) will instantly break the script. For programmatic date logic, they must use the `date` command (e.g., `date -d "-$(date +%d) days +1 month" +%d`), which relies on rigorous, parse-safe kernel time APIs.

## Practice Problems

**Problem:** You are planning a project. You need to see the calendar for the month of February in the year 2025. Write the command to display exactly this month.
**Hint:** Use the positional arguments. Month comes first.
**Solution:**

```bash
cal 2 2025
```

**Problem:** You want to display a three-month view (Previous, Current, Next), but because your company operates on European standards, you must ensure the far-left column of the calendar grid represents Monday, not Sunday. Write the command.
**Hint:** Combine the 3-month flag with the Monday-start flag.
**Solution:**

```bash
cal -3 -m
```

## References

- [cal(1) - Linux man page (util-linux)](https://linux.die.net/man/1/cal)
- [ISO 8601 Date and time format](https://www.iso.org/iso-8601-date-and-time-format.html)
