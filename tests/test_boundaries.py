"""Meaningful negative fixtures for forbidden architectural dependencies."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("boundaries", Path(__file__).parents[1] / "tooling/check_boundaries.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, name, text):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)

    def test_domain_rejects_renamed_desktop_dependency(self):
        self.write("crates/reed-core/Cargo.toml", '[dependencies]\nwindowing = { package = "tauri", version = "2" }\n')
        self.assertTrue(module.check_repository(self.root))

    def test_shell_rejects_embedding_the_runtime(self):
        self.write("apps/desktop/src-tauri/Cargo.toml", '[dependencies]\nreed-runtime = { path = "../../../crates/reed-runtime" }\n')
        self.assertTrue(module.check_repository(self.root))

    def test_shared_ui_rejects_native_sdk_import(self):
        self.write("packages/ui/src/bad.ts", 'import { invoke } from "@tauri-apps/api/core";')
        self.assertTrue(module.check_repository(self.root))

    def test_workbench_mock_rejects_native_sdk_import(self):
        self.write("packages/ui/src/mock/bad.jsx", 'import { invoke } from "@tauri-apps/api/core";')
        self.assertTrue(module.check_repository(self.root))

    def test_workbench_rejects_static_mock_dependency(self):
        self.write("packages/ui/src/workbench/bad.tsx", "import { reduce } from '../mock/model.js';")
        self.assertTrue(module.check_repository(self.root))

    def test_shell_may_explicitly_compose_a_mock_adapter(self):
        self.write("apps/web/src/main.tsx", "import { createMockWorkbenchRuntime } from '@reed/ui/mock';")
        self.assertEqual(module.check_repository(self.root), [])

    def test_protocol_does_not_own_domain_rules(self):
        self.write("crates/reed-protocol/Cargo.toml", '[dependencies]\nreed-core = { path = "../reed-core" }\n')
        self.assertTrue(module.check_repository(self.root))

    def test_shell_adapter_may_import_native_sdk(self):
        self.write("apps/desktop/src/main.ts", 'import { invoke } from "@tauri-apps/api/core";')
        self.assertEqual(module.check_repository(self.root), [])


    def test_workspace_alias_does_not_hide_native_dependency(self):
        self.write("Cargo.toml", '[workspace.dependencies]\nserde = { package = "tauri", version = "2" }\n')
        self.write("crates/reed-protocol/Cargo.toml", '[dependencies]\nserde = { workspace = true }\n')
        self.assertTrue(module.check_repository(self.root))

    def test_side_effect_import_still_counts_as_native_sdk(self):
        self.write("packages/ui/src/bad.ts", "import '@tauri-apps/api/core';")
        self.assertTrue(module.check_repository(self.root))

    def test_client_rejects_ui_and_apps_in_all_dependency_tables(self):
        for table in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
            for dependency in ("@reed/ui", "@reed/web", "@reed/desktop"):
                with self.subTest(table=table, dependency=dependency):
                    self.write("packages/client/package.json", json.dumps({"name": "@reed/client", table: {dependency: "*"}}))
                    self.assertTrue(module.check_repository(self.root))

    def test_ui_rejects_a_new_application_package_by_its_actual_name(self):
        self.write("apps/inspector/package.json", json.dumps({"name": "@example/inspector"}))
        self.write("packages/ui/package.json", json.dumps({"name": "@reed/ui", "peerDependencies": {"@example/inspector": "*"}}))
        self.assertTrue(module.check_repository(self.root))

    def test_local_and_npm_alias_dependencies_cannot_hide_forbidden_modules(self):
        for value in ("npm:@reed/ui@0.1.0", "npm:@reed/ui", "file:../ui", "link:../ui"):
            with self.subTest(value=value):
                self.write("packages/client/package.json", json.dumps({"optionalDependencies": {"alias": value}}))
                self.assertTrue(module.check_repository(self.root))

    def test_native_sdk_is_rejected_in_peer_and_optional_dependencies(self):
        for table in ("peerDependencies", "optionalDependencies"):
            with self.subTest(table=table):
                self.write("packages/ui/package.json", json.dumps({table: {"native": "npm:@tauri-apps/api@2"}}))
                self.assertTrue(module.check_repository(self.root))

    def test_client_source_rejects_ui_by_name_or_relative_path(self):
        for statement in (
            "import { Widget } from '@reed/ui';",
            "export type { Widget } from '../../ui/src/index.js';",
            "const ui = require('@reed/ui');",
            "const ui = import('@reed/ui');",
        ):
            with self.subTest(statement=statement):
                self.write("packages/client/src/bad.ts", statement)
                self.assertTrue(module.check_repository(self.root))

    def test_client_and_ui_reject_source_imports_from_any_app(self):
        for package in ("client", "ui"):
            with self.subTest(package=package):
                path = f"packages/{package}/src/bad.ts"
                self.write(path, "export * from '../../../apps/inspector/src/view';")
                self.assertTrue(module.check_repository(self.root))
                (self.root / path).unlink()

    def test_web_and_desktop_cannot_depend_on_each_other(self):
        for source, target in (("web", "desktop"), ("desktop", "web")):
            with self.subTest(source=source, target=target):
                self.write(f"apps/{source}/package.json", json.dumps({"name": f"@reed/{source}", "dependencies": {f"@reed/{target}": "*"}}))
                self.assertTrue(module.check_repository(self.root))
                self.write(f"apps/{source}/package.json", json.dumps({"name": f"@reed/{source}"}))
                self.write(f"apps/{source}/src/main.ts", f"import {{ shell }} from '../../{target}/src/main.js';")
                self.assertTrue(module.check_repository(self.root))
                (self.root / f"apps/{source}/src/main.ts").unlink()

    def test_actual_workspace_package_names_are_resolved(self):
        self.write("packages/ui/package.json", json.dumps({"name": "@example/interface"}))
        self.write("packages/client/src/index.ts", "export * from '@example/interface';")
        self.assertTrue(module.check_repository(self.root))

    def test_workbench_rejects_mock_through_a_local_reexport_chain(self):
        self.write("packages/ui/src/workbench/page.tsx", "import { reduce } from '../bridge.js';")
        self.write("packages/ui/src/bridge.ts", "export { reduce } from './mock/model.js';")
        self.write("packages/ui/src/mock/model.js", "export const reduce = () => {}; ")
        issues = module.check_repository(self.root)
        self.assertTrue(issues)
        diagnostic = "\n".join(issues)
        self.assertIn("workbench/page.tsx", diagnostic)
        self.assertIn("bridge.ts", diagnostic)
        self.assertIn("mock/model.js", diagnostic)

    def test_ui_main_entry_rejects_an_indirect_mock_export(self):
        self.write("packages/ui/src/index.ts", "export * from './bridge';")
        self.write("packages/ui/src/bridge/index.ts", "export * from '../mock/index';")
        self.write("packages/ui/src/mock/index.ts", "export const sample = 1;")
        self.assertTrue(module.check_repository(self.root))

    def test_dotted_local_module_names_do_not_hide_a_mock_dependency(self):
        self.write("packages/ui/src/workbench/page.ts", "import { sample } from '../bridge.model';")
        self.write("packages/ui/src/bridge.model.ts", "export { sample } from './mock/model';")
        self.write("packages/ui/src/mock/model.ts", "export const sample = 1;")
        self.assertTrue(module.check_repository(self.root))

    def test_reexports_cannot_hide_native_sdk_imports(self):
        for package in ("packages/client", "packages/ui", "apps/web"):
            with self.subTest(package=package):
                self.write(f"{package}/src/index.ts", "export { invoke } from '@tauri-apps/api/core';")
                self.assertTrue(module.check_repository(self.root))

    def test_local_cycles_report_a_finite_mock_dependency_chain(self):
        self.write("packages/ui/src/workbench/page.ts", "import '../bridge';")
        self.write("packages/ui/src/bridge.ts", "export * from './workbench/page'; export * from './mock/model';")
        self.write("packages/ui/src/mock/model.ts", "export const sample = 1;")
        self.assertTrue(module.check_repository(self.root))

    def test_allowed_shared_dependencies_and_explicit_mock_composition(self):
        for path, name, dependencies in (
            ("packages/client", "@reed/client", {}),
            ("packages/ui", "@reed/ui", {"@reed/client": "*"}),
            ("apps/web", "@reed/web", {"@reed/ui": "*", "@reed/client": "*"}),
            ("apps/desktop", "@reed/desktop", {"@reed/ui": "*", "@reed/client": "*", "@tauri-apps/api": "2"}),
        ):
            self.write(f"{path}/package.json", json.dumps({"name": name, "dependencies": dependencies}))
        self.write("packages/client/src/index.ts", "export const getHealth = () => {}; ")
        self.write("packages/ui/src/index.ts", "export { getHealth } from '@reed/client'; export * from './workbench/ports';")
        self.write("packages/ui/src/workbench/ports.ts", "export interface Port { value: string }")
        self.write("packages/ui/src/mock/index.ts", "import type { Port } from '../workbench/ports'; export const mock = 1;")
        self.write("apps/web/src/main.tsx", "import { mock } from '@reed/ui/mock'; import { getHealth } from '@reed/ui';")
        self.write("apps/desktop/src/main.tsx", "import { mock } from '@reed/ui/mock'; import { invoke } from '@tauri-apps/api/core';")
        self.assertEqual(module.check_repository(self.root), [])

    def test_comments_and_strings_do_not_create_import_edges(self):
        self.write("packages/ui/src/workbench/page.ts", '''
            // import { reduce } from '../mock/model';
            /* export * from '@tauri-apps/api/core'; */
            const example = "import '../mock/model'";
            const otherExample = `export * from '@tauri-apps/api/core'`;
            const name = '../mock/model';
            import(name); // Computed specifiers are outside this static check.
        ''')
        self.assertEqual(module.check_repository(self.root), [])

    def test_regex_literals_do_not_hide_following_literal_imports(self):
        for pattern in (r"/'/", r'''/['"]/''', r'''/\/[/'"]+/g'''):
            with self.subTest(pattern=pattern):
                self.write(
                    "packages/ui/src/component.ts",
                    f"const pattern = {pattern};\nimport '@tauri-apps/api/core';",
                )
                issues = module.check_repository(self.root)
                self.assertTrue(issues)
                self.assertTrue(any("component.ts:2" in issue for issue in issues))

    def test_regex_examples_do_not_create_literal_import_edges(self):
        for pattern in (
            r'''/import "vitest"/''',
            r'''/require\('vitest'\)/''',
            r'''/[/'"]+import "vitest"/g''',
        ):
            with self.subTest(pattern=pattern):
                self.write("packages/ui/src/component.ts", f"const pattern = {pattern};")
                self.assertEqual(module.check_repository(self.root), [])

    def test_division_does_not_hide_following_literal_imports(self):
        for expression in (
            "12 / 4", "total / count", "read() / count", "values[0] / count",
            "total++ / count", "({ value: 1 }).value / count", "value! / count",
            "reader.if() / count", "record.return / count",
        ):
            with self.subTest(expression=expression):
                self.write(
                    "packages/ui/src/component.ts",
                    f"const result = {expression}; import '@tauri-apps/api/core';",
                )
                self.assertTrue(module.check_repository(self.root))

    def test_regex_after_a_statement_block_does_not_hide_an_import(self):
        self.write("packages/ui/src/component.ts", "if (enabled) {} /'/.test(text); import '@tauri-apps/api/core';")
        self.assertTrue(module.check_repository(self.root))

    def test_import_type_expressions_are_ownership_dependencies(self):
        self.write("packages/client/src/index.ts", "type Widget = import('@reed/ui').Widget;")
        self.assertTrue(module.check_repository(self.root))

    def test_invalid_frontend_syntax_is_not_a_successful_boundary_scan(self):
        self.write("packages/ui/src/component.ts", "import { broken from 'module';")
        issues = module.check_repository(self.root)
        self.assertTrue(any("parse" in issue.lower() for issue in issues))

    def test_product_src_rejects_explicit_test_only_imports(self):
        for dependency in ("vitest", "vitest/config", "node:test", "@jest/globals", "@playwright/test", "@testing-library/react", "mocha"):
            with self.subTest(dependency=dependency):
                self.write("packages/ui/src/component.ts", f"export {{ test }} from '{dependency}';")
                self.assertTrue(module.check_repository(self.root))

    def test_product_src_cannot_use_an_npm_alias_for_a_test_framework(self):
        self.write("packages/ui/package.json", json.dumps({"name": "@reed/ui", "devDependencies": {"testkit": "npm:vitest@5"}}))
        self.write("packages/ui/src/component.ts", "import { test } from 'testkit';")
        self.assertTrue(module.check_repository(self.root))

    def test_versionless_npm_aliases_do_not_hide_test_or_native_imports(self):
        for value in ("npm:vitest", "npm:@tauri-apps/api"):
            with self.subTest(value=value):
                self.write("packages/ui/package.json", json.dumps({"name": "@reed/ui", "devDependencies": {"alias": value}}))
                self.write("packages/ui/src/component.ts", "import 'alias';")
                self.assertTrue(module.check_repository(self.root))

    def test_product_src_rejects_imports_of_test_directories_and_files(self):
        for reference in ("../tests/helper", "./test/helper", "./__tests__/helper", "./feature.test", "./feature.spec.js"):
            with self.subTest(reference=reference):
                self.write("packages/ui/src/component.ts", f"import {{ helper }} from '{reference}';")
                self.assertTrue(module.check_repository(self.root))

    def test_test_code_may_import_product_code_and_test_frameworks(self):
        self.write("packages/ui/src/component.ts", "import assert from 'node:assert/strict'; export const valid = true;")
        self.write("packages/ui/tests/component.test.ts", "import { valid } from '../src/component'; import { test } from 'vitest';")
        self.assertEqual(module.check_repository(self.root), [])

    def test_product_src_rejects_test_import_hidden_by_a_local_helper(self):
        self.write("apps/web/src/main.ts", "import './helper';")
        self.write("apps/web/src/helper.ts", "export { test } from 'node:test';")
        issues = module.check_repository(self.root)
        self.assertTrue(issues)
        self.assertTrue(any("src/main.ts" in issue and "src/helper.ts" in issue and "node:test" in issue for issue in issues))

if __name__ == "__main__":
    unittest.main()
