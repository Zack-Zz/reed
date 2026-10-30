"""Meaningful negative fixtures for forbidden architectural dependencies."""
import importlib.util
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

if __name__ == "__main__":
    unittest.main()
