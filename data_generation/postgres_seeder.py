"""Keep the original CLI filename while Member 2 owns its documented seeder.

runpy executes the canonical script with __name__=__main__, retaining its CLI parsing.
The resolved absolute source path makes delegation independent of the caller's directory.
"""

from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(
        str(
            Path(__file__).resolve().parents[1]
            / "members/member2/data_generation/postgres_seeder.py"
        ),
        run_name="__main__",
    )
