import re
import shutil
import subprocess
from pathlib import Path
import httpx
from ..config import settings


def _run_git(args: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )


def is_valid_git_repo(repo_path: str) -> bool:
    """Return True if repo_path points to an existing Git repository."""
    if not repo_path:
        return False
    path = Path(repo_path)
    if not path.exists() or not path.is_dir():
        return False
    res = _run_git(["rev-parse", "--is-inside-work-tree"], path)
    return res.returncode == 0 and res.stdout.strip() == "true"


def slugify(text: str, max_len: int = 32) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return (cleaned[:max_len].strip("-")) or "task"


def create_card_worktree(
    repo_path: str,
    card_id: int,
    title: str,
    base_branch: str = "main",
) -> tuple[str, Path]:
    """Create or reuse an isolated git worktree for a card."""
    repo = Path(repo_path).resolve()
    branch_name = f"ai/card-{card_id}-{slugify(title)}"
    worktree_dir = settings.worktrees_path / f"card-{card_id}"

    if worktree_dir.exists():
        return branch_name, worktree_dir

    # Check if branch already exists
    branch_check = _run_git(["rev-parse", "--verify", branch_name], repo)
    if branch_check.returncode == 0:
        res = _run_git(["worktree", "add", str(worktree_dir), branch_name], repo)
    else:
        # Try creating from base_branch, fallback to HEAD if base_branch doesn't exist
        base_check = _run_git(["rev-parse", "--verify", base_branch], repo)
        start_point = base_branch if base_check.returncode == 0 else "HEAD"
        res = _run_git(
            ["worktree", "add", "-b", branch_name, str(worktree_dir), start_point],
            repo,
        )

    if res.returncode != 0:
        raise RuntimeError(f"Falha ao criar worktree Git: {res.stderr.strip()}")

    return branch_name, worktree_dir


def commit_and_create_pr(
    worktree_path: Path,
    branch_name: str,
    base_branch: str,
    title: str,
    body: str,
    github_repo: str = "",
) -> tuple[str, str]:
    """Commit changes in the worktree and open a PR if configured, else return local branch ref."""
    status = _run_git(["status", "--porcelain"], worktree_path)
    if status.stdout.strip():
        _run_git(["add", "-A"], worktree_path)
        _run_git(["commit", "-m", f"ai: {title}"], worktree_path)

    diff_stat = _run_git(["diff", "--stat", f"{base_branch}..HEAD"], worktree_path)
    diff_summary = diff_stat.stdout.strip() or "Nenhuma alteração de arquivo registrada."

    # 1. Try GitHub CLI (`gh`) if installed and github_repo is set
    if github_repo and shutil.which("gh"):
        push_res = _run_git(["push", "-u", "origin", branch_name], worktree_path)
        if push_res.returncode == 0:
            pr_res = subprocess.run(
                [
                    "gh",
                    "pr",
                    "create",
                    "--repo",
                    github_repo,
                    "--head",
                    branch_name,
                    "--base",
                    base_branch,
                    "--title",
                    title,
                    "--body",
                    body,
                ],
                cwd=str(worktree_path),
                capture_output=True,
                text=True,
                check=False,
            )
            if pr_res.returncode == 0:
                return pr_res.stdout.strip(), diff_summary

    # 2. Try GitHub REST API if GITHUB_TOKEN is configured
    if github_repo and settings.github_token:
        push_res = _run_git(["push", "-u", "origin", branch_name], worktree_path)
        if push_res.returncode == 0:
            resp = httpx.post(
                f"https://api.github.com/repos/{github_repo}/pulls",
                headers={
                    "Authorization": f"Bearer {settings.github_token}",
                    "Accept": "application/vnd.github+json",
                },
                json={
                    "title": title,
                    "body": body,
                    "head": branch_name,
                    "base": base_branch,
                },
                timeout=15.0,
            )
            if resp.status_code in (200, 201):
                return resp.json().get("html_url", f"local://branch/{branch_name}"), diff_summary

    return f"local://branch/{branch_name}", diff_summary

