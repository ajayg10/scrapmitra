"""Run the installed cfn-lint console entry point with this project's Python."""

from importlib.metadata import distribution

if __name__ == "__main__":
    entry_point = next(
        entry
        for entry in distribution("cfn-lint").entry_points
        if entry.group == "console_scripts" and entry.name == "cfn-lint"
    )
    raise SystemExit(entry_point.load()())
