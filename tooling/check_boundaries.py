"""Check declared dependencies and literal local imports, not a JS/TS compiler."""

from collections import deque
from pathlib import Path
import json
import re
import subprocess
import sys
import tomllib


SOURCE_EXTENSIONS = (".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cts", ".cjs")
DEPENDENCY_TABLES = (
    "dependencies", "devDependencies", "peerDependencies", "optionalDependencies",
)
DEFAULT_PACKAGES = {
    "@reed/client": "packages/client",
    "@reed/ui": "packages/ui",
    "@reed/web": "apps/web",
    "@reed/desktop": "apps/desktop",
}
SHARED_MODULES = {"packages/client", "packages/ui", "apps/web"}
IGNORED_DIRECTORIES = {"node_modules", "dist", "target", ".git"}
TEST_ONLY_PACKAGES = {
    "vitest", "node:test", "@jest/globals", "jest",
    "@playwright/test", "@testing-library/react", "@testing-library/dom",
    "@testing-library/user-event",
    "mocha", "jasmine", "ava", "tap", "tape",
}

def parse_imports(sources: dict[Path, str]) -> dict[Path, list[tuple[str, int]]]:
    """Use the project's pinned TypeScript parser, without executing source code."""
    if not sources:
        return {}
    parser = Path(__file__).with_name("frontend_imports.mjs")
    result = subprocess.run(
        ["node", str(parser)],
        input=json.dumps({str(path): source for path, source in sources.items()}),
        text=True, capture_output=True, timeout=30,
    )
    if result.returncode:
        raise ValueError(result.stderr.strip() or "Frontend import parse failed")
    parsed = json.loads(result.stdout)
    return {path: parsed[str(path)] for path in sources}


def owner(root: Path, path: Path) -> str | None:
    if not path.is_relative_to(root):
        return None
    parts = path.relative_to(root).parts
    if len(parts) >= 2 and parts[0] in {"apps", "packages"}:
        return "/".join(parts[:2])
    return None


def forbidden_direction(source: str | None, target: str | None) -> bool:
    if not target:
        return False
    if source == "packages/client":
        return target == "packages/ui" or target.startswith("apps/")
    if source == "packages/ui":
        return target.startswith("apps/")
    return (source, target) in {("apps/web", "apps/desktop"), ("apps/desktop", "apps/web")}


def test_only_package(reference: str) -> bool:
    return any(
        reference == name or reference.startswith(name + "/")
        for name in TEST_ONLY_PACKAGES
    )


def test_module(root: Path, path: Path) -> bool:
    return bool(
        {"test", "tests", "__tests__"}.intersection(path.relative_to(root).parts)
        or re.search(r"\.(?:test|spec)(?:\.|$)", path.name)
    )


def workspace_packages(root: Path) -> tuple[dict[str, Path], dict[Path, dict]]:
    packages = {name: root / path for name, path in DEFAULT_PACKAGES.items()}
    manifests = {}
    for group in ("apps", "packages"):
        for manifest in sorted((root / group).glob("*/package.json")):
            value = json.loads(manifest.read_text())
            manifests[manifest.parent] = value
            # A changed workspace name replaces its conventional fallback name.
            packages = {
                name: path for name, path in packages.items() if path != manifest.parent
            }
            if isinstance(value.get("name"), str):
                packages[value["name"]] = manifest.parent
            else:
                packages.update({
                    name: root / path
                    for name, path in DEFAULT_PACKAGES.items()
                    if root / path == manifest.parent
                })
    return packages, manifests


def resolve_source(base: Path) -> Path:
    candidates = [base]
    if base.suffix in SOURCE_EXTENSIONS:
        candidates.extend(base.with_suffix(extension) for extension in SOURCE_EXTENSIONS)
    else:
        candidates.extend(Path(str(base) + extension) for extension in SOURCE_EXTENSIONS)
        candidates.extend(base / f"index{extension}" for extension in SOURCE_EXTENSIONS)
    return next((path for path in candidates if path.is_file()), base)


def resolve_reference(
    root: Path, source: Path, reference: str, packages: dict[str, Path],
) -> Path | None:
    if reference.startswith("."):
        base = (source.parent / reference).resolve()
    else:
        package = next((
            name for name in sorted(packages, key=len, reverse=True)
            if reference == name or reference.startswith(name + "/")
        ), None)
        if package is None:
            return None
        suffix = reference[len(package):].lstrip("/")
        base = packages[package] / (
            suffix if suffix.startswith("src/") else f"src/{suffix or 'index'}"
        )
    return resolve_source(base) if base.is_relative_to(root) else None


def dependency_target(
    directory: Path, name: str, version: object, packages: dict[str, Path],
) -> tuple[str, Path | None]:
    if isinstance(version, str):
        if version.startswith(("file:", "link:")):
            return name, (directory / version.split(":", 1)[1]).resolve()
        alias = re.match(r"^npm:(@[^/]+/[^@]+|[^@]+)(?:@.*)?$", version)
        if alias is None:
            alias = re.match(r"^workspace:(@[^/]+/[^@]+|[^@]+)@", version)
        if alias:
            name = alias[1]
    return name, packages.get(name)


def check_frontend(root: Path) -> list[str]:
    issues = []
    packages, manifests = workspace_packages(root)
    directories = set(packages.values()) | set(manifests)
    import_packages = {}
    import_names = {}
    for directory, manifest in manifests.items():
        source_owner = owner(root, directory)
        import_packages[directory] = dict(packages)
        import_names[directory] = {}
        for table in DEPENDENCY_TABLES:
            for name, version in manifest.get(table, {}).items():
                resolved_name, target = dependency_target(directory, name, version, packages)
                import_names[directory][name] = resolved_name
                if target:
                    import_packages[directory][name] = target
                prefix = f"{directory.relative_to(root)}/package.json: forbidden {table} dependency"
                if (
                    source_owner in SHARED_MODULES
                    and resolved_name.startswith("@tauri-apps/")
                ):
                    issues.append(f"{prefix} {name} -> {resolved_name} (native SDK)")
                elif target and forbidden_direction(source_owner, owner(root, target)):
                    issues.append(f"{prefix} {name} -> {target.relative_to(root)}")

    ui_source = root / "packages/ui/src"
    mock_root = ui_source / "mock"

    def local_module(path: Path) -> bool:
        return (
            path.is_file() and path.suffix in SOURCE_EXTENSIONS
            and not IGNORED_DIRECTORIES.intersection(path.relative_to(root).parts)
        )

    sources = sorted({
        source for directory in directories
        for source in (directory / "src").rglob("*") if local_module(source)
    })
    try:
        imports = parse_imports({path: path.read_text() for path in sources})
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        return issues + [f"Frontend import parse unavailable/failed: {error}. Install the locked npm dependencies before scanning frontend sources."]

    def first_violation(start: Path) -> str | None:
        source_owner = owner(root, start)
        forbid_mock = (
            start.is_relative_to(ui_source / "workbench")
            or (start.parent == ui_source and start.stem == "index")
        )
        queue = deque([(start, [str(start.relative_to(root))])])
        seen = set()
        while queue:
            current, chain = queue.popleft()
            if current in seen:
                continue
            seen.add(current)
            if current not in imports:
                imports.update(parse_imports({current: current.read_text()}))
            for reference, line in imports[current]:
                current_owner = owner(root, current)
                directory = root / current_owner if current_owner else None
                names = import_names.get(directory, {})
                alias = next((
                    name for name in sorted(names, key=len, reverse=True)
                    if reference == name or reference.startswith(name + "/")
                ), None)
                resolved_name = names[alias] + reference[len(alias):] if alias else reference
                target = resolve_reference(
                    root, current, reference, import_packages.get(directory, packages),
                )
                label = str(target.relative_to(root)) if target else reference
                route = chain + [
                    f"{label} (via {reference!r} at {current.relative_to(root)}:{line})"
                ]
                reason = None
                if (
                    source_owner in SHARED_MODULES
                    and resolved_name.startswith("@tauri-apps/")
                ):
                    reason = "native SDK import/re-export in shared code"
                elif target and forbidden_direction(source_owner, owner(root, target)):
                    reason = "frontend dependency direction"
                elif test_only_package(resolved_name) or (target and test_module(root, target)):
                    reason = "product src depends on test code/framework"
                elif forbid_mock and target and target.is_relative_to(mock_root):
                    reason = "product UI depends on mock implementation"
                if reason:
                    return f"{reason}: {' -> '.join(route)}"
                if target and local_module(target):
                    queue.append((target, route))
        return None

    for source in sources:
        try:
            issue = first_violation(source)
        except (OSError, ValueError, subprocess.TimeoutExpired) as error:
            issue = f"Frontend import parse unavailable/failed: {error}"
        if issue:
            issues.append(issue)
    return issues


def check_repository(root: Path) -> list[str]:
    root = root.resolve()
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
    issues.extend(check_frontend(root))
    return issues


if __name__ == "__main__":
    issues = check_repository(Path(__file__).resolve().parents[1])
    for issue in issues:
        print(issue)
    if not issues:
        print("PASS: declared Core/protocol/runtime/shell dependencies and shared frontend imports.")
    sys.exit(bool(issues))
