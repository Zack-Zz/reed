"""Enforce declared dependency/import boundaries; not a substitute for builds."""
from pathlib import Path
import json
import re
import sys
import tomllib


def check_repository(root: Path) -> list[str]:
    issues = []
    workspace_path = root / "Cargo.toml"
    workspace_dependencies = tomllib.loads(workspace_path.read_text()).get("workspace", {}).get("dependencies", {}) if workspace_path.exists() else {}
    rules = {
        "crates/reed-core/Cargo.toml": lambda name: True,
        "crates/reed-protocol/Cargo.toml": lambda name: name not in {"serde", "serde_json", "ts-rs"},
        "crates/reed-runtime/Cargo.toml": lambda name: name.startswith("tauri") or name == "reed-desktop",
        "apps/desktop/src-tauri/Cargo.toml": lambda name: name in {"reed-runtime", "reed-core"},
    }
    for relative, forbidden in rules.items():
        path = root / relative
        if not path.is_file():
            continue
        manifest = tomllib.loads(path.read_text())
        tables = [manifest, *manifest.get("target", {}).values()]
        for table in tables:
            for key in ("dependencies", "build-dependencies", "dev-dependencies"):
                for alias, value in table.get(key, {}).items():
                    if isinstance(value, dict) and value.get("workspace") is True:
                        value = workspace_dependencies.get(alias, value)
                    name = value.get("package", alias) if isinstance(value, dict) else alias
                    if forbidden(name):
                        issues.append(f"{relative}: forbidden {key} dependency {name}")
    for package in ("packages/client", "packages/ui", "apps/web"):
        path = root / package
        manifest_path = path / "package.json"
        if manifest_path.exists():
            manifest = json.loads(manifest_path.read_text())
            for key in ("dependencies", "devDependencies"):
                for dependency in manifest.get(key, {}):
                    if dependency.startswith("@tauri-apps/"):
                        issues.append(f"{package}: native SDK dependency {dependency}")
        for file in (path / "src").rglob("*"):
            if file.suffix in {".ts", ".tsx", ".js", ".jsx"}:
                if re.search(r"(?:from\s*|import\s*(?:\(\s*)?|require\s*\()[\"']@tauri-apps/", file.read_text()):
                    issues.append(f"{file.relative_to(root)}: native SDK import in shared code")
    return issues


if __name__ == "__main__":
    issues = check_repository(Path(__file__).resolve().parents[1])
    for issue in issues:
        print(issue)
    if not issues:
        print("PASS: declared Core/protocol/runtime/shell dependencies and shared frontend imports.")
    sys.exit(bool(issues))
