"""Build a size-checked source/documentation ZIP without dependencies, secrets or database dumps.

Review mode accepts uncommitted work and clearly labels it as a review artifact.
Final mode validates team/repository metadata and requires a clean committed tree.
The archive README is stamped with the exact committed HEAD without editing the
working README itself. Packaging preserves paths needed by member entry points.
"""

import argparse
import re
import subprocess
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
# Final filename rules differ for Assignment 1 and Assignment 2; review names stay
# explicit.
parser = argparse.ArgumentParser()
parser.add_argument("--assignment", choices=["1", "2"], required=True)
parser.add_argument("--team", type=int)
parser.add_argument("--repo-url")
parser.add_argument(
    "--review",
    action="store_true",
    help="Allow uncommitted work; clearly named review ZIP, not a final submission",
)
args = parser.parse_args()
# Do not guess team numbers or claim a final submission from missing metadata.
if not args.review and (args.team is None or args.team < 1):
    parser.error("A positive team number is required for the prescribed ZIP name")
if not args.review and args.assignment == "2" and not args.repo_url:
    parser.error("Provide the actual Assignment 2 fork URL with --repo-url")
if args.repo_url and not re.fullmatch(
    r"https://github\.com/[\w.-]+/[\w.-]+/?", args.repo_url
):
    parser.error("Use a direct HTTPS GitHub repository URL")
# A commit hash only identifies committed content; final mode rejects a dirty source
# tree.
dirty = subprocess.check_output(
    ["git", "status", "--porcelain"], cwd=root, text=True
).strip()
if dirty and not args.review:
    raise SystemExit(
        "Commit the finished work first. A final archive must refer to the commit containing its code."
    )
head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"], cwd=root, text=True
).strip()
name = (
    f"{root.name}_review.zip"
    if args.review
    else f'{args.team}_{"a1" if args.assignment=="1" else "a1b"}.zip'
)
output = root.parent / name
# Exclude entire dependency/cache/build trees before examining individual files.
excluded = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "venv",
    ".venv",
    "__pycache__",
    ".runtime",
    ".pytest_cache",
    ".mypy_cache",
}
# Retain source SQL scripts but exclude raw data exports and generated database/storage
# files.
blocked_suffixes = {
    ".pyc",
    ".zip",
    ".csv",
    ".tsv",
    ".bson",
    ".db",
    ".sqlite",
    ".dump",
    ".log",
}
files = []
# Never follow symlinked paths into outside dependency/runtime directories.
for file in root.rglob("*"):
    relative = file.relative_to(root)
    if (
        file.is_symlink()
        or not file.is_file()
        or any(p in excluded for p in relative.parts)
    ):
        continue
    # Only .env.example is distributable; active environment files may contain private
    # settings.
    if (
        file.name == ".env"
        or file.name.startswith(".env.")
        and file.name != ".env.example"
    ):
        continue
    if file.suffix.lower() in blocked_suffixes:
        continue
    # Numbered entry points and canonical per-member SQL are both source scripts.
    # Include canonical member SQL as well as the numbered compatibility entry points.
    member_sql = (
        len(relative.parts) >= 4
        and relative.parts[0] == "members"
        and relative.parts[1] in {"member1", "member2", "member3", "member4"}
        and relative.parts[2] == "sql"
    )
    if file.suffix.lower() == ".sql" and relative.parts[0] != "sql" and not member_sql:
        continue
    files.append((file, relative))
# Write a compressed portable archive; root-relative paths preserve runtime imports.
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file, relative in files:
        data = file.read_bytes()
        # Stamp metadata only inside the ZIP payload; keep the original working README
        # intact.
        if relative.as_posix() == "README.md":
            text = data.decode()
            if args.review:
                text = (
                    "> REVIEW ARCHIVE: contains uncommitted local changes. Not a final Moodle submission.\n\n"
                    + text
                )
            else:
                text = re.sub(
                    r"\*\*Final commit hash:\*\*[^\n]*",
                    f"**Final commit hash:** `{head}`",
                    text,
                )
                if args.repo_url:
                    text = re.sub(
                        r"\*\*Submission repository:\*\*[^\n]*",
                        f"**Submission repository:** {args.repo_url}",
                        text,
                    )
            data = text.encode()
        archive.writestr(f"{root.name}/{relative.as_posix()}", data)
# Use the stricter decimal 20 MB limit and remove only this newly generated oversized
# artifact.
if output.stat().st_size >= 20000000:
    output.unlink()
    raise SystemExit(
        "Archive exceeds the strict 20 MB limit; reduce docs/video size before submission"
    )
# Validate CRC integrity and the directory-exclusion rules before announcing success.
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert not any(
        any(part in excluded for part in Path(name).parts)
        for name in archive.namelist()
    )
print(
    f"{output.name}: {output.stat().st_size:,} bytes; {len(files)} files; no dependencies, caches, build output, secrets or dumps"
)
