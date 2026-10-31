use super::{MAX_CONTENT_BYTES, save_to_directory};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
};

static NEXT_DIRECTORY: AtomicUsize = AtomicUsize::new(0);

struct TestDirectory(PathBuf);

impl TestDirectory {
    fn new() -> Self {
        let root = std::env::temp_dir();
        loop {
            let path = root.join(format!(
                "reed-preview-export-{}-{}",
                std::process::id(),
                NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed)
            ));
            match fs::create_dir(&path) {
                Ok(()) => return Self(path),
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => panic!("create temporary test directory: {error}"),
            }
        }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).expect("remove temporary test directory");
    }
}

#[test]
fn saves_utf8_content_exactly_and_returns_only_the_filename() {
    let directory = TestDirectory::new();
    let content = "中文 Reed 🦀\n第二行\r\n\0末尾";
    let name = save_to_directory(&directory.0, "预览.JSON", content).unwrap();
    assert_eq!(name, "预览.JSON");
    assert_eq!(
        fs::read(directory.0.join(name)).unwrap(),
        content.as_bytes()
    );
}

#[test]
fn never_overwrites_and_uses_the_next_available_numbered_suffix() {
    let directory = TestDirectory::new();
    fs::write(directory.0.join("notes.v1.md"), "original").unwrap();
    fs::write(directory.0.join("notes.v1 (1).md"), "previous export").unwrap();
    let name = save_to_directory(&directory.0, "notes.v1.md", "new export").unwrap();
    assert_eq!(name, "notes.v1 (2).md");
    assert_eq!(
        fs::read_to_string(directory.0.join("notes.v1.md")).unwrap(),
        "original"
    );
    assert_eq!(
        fs::read_to_string(directory.0.join("notes.v1 (1).md")).unwrap(),
        "previous export"
    );
    assert_eq!(
        fs::read_to_string(directory.0.join(name)).unwrap(),
        "new export"
    );
}

#[test]
fn rejects_invalid_names_and_extensions_before_creating_any_file() {
    let directory = TestDirectory::new();
    for name in [
        "",
        ".hidden.json",
        ".",
        "..",
        "../escape.json",
        "nested/file.txt",
        "nested\\file.txt",
        "line\n.txt",
        "nul\0.txt",
        "control\u{7f}.txt",
        "file",
        "file.exe",
        "file.txt.exe",
        "file.json ",
        "file.txt.",
        "C:escape.json",
        "CON.txt",
        "nul.json",
        "LPT1.md",
    ] {
        assert_eq!(
            save_to_directory(&directory.0, name, "content"),
            Err("invalid-name".into()),
            "{name:?}"
        );
    }
    assert_eq!(fs::read_dir(&directory.0).unwrap().count(), 0);
}

#[test]
fn accepts_each_allowed_extension_without_changing_the_name() {
    let directory = TestDirectory::new();
    for name in [
        "report.json",
        "report.md",
        "report.txt",
        "mixed-case.Md",
        "upper-case.TXT",
    ] {
        assert_eq!(save_to_directory(&directory.0, name, "ok").unwrap(), name);
    }
}

#[test]
fn enforces_one_mib_in_utf8_bytes_and_accepts_the_exact_limit() {
    let directory = TestDirectory::new();
    let limit = "a".repeat(MAX_CONTENT_BYTES);
    assert!(save_to_directory(&directory.0, "limit.txt", &limit).is_ok());
    assert_eq!(
        fs::metadata(directory.0.join("limit.txt")).unwrap().len(),
        MAX_CONTENT_BYTES as u64
    );
    let oversized = "é".repeat(MAX_CONTENT_BYTES / 2 + 1);
    assert_eq!(
        save_to_directory(&directory.0, "oversized.txt", &oversized),
        Err("too-large".into())
    );
    assert!(!directory.0.join("oversized.txt").exists());
}

#[test]
fn missing_directory_fails_without_creating_it_or_changing_existing_files() {
    let directory = TestDirectory::new();
    let original = directory.0.join("keep.txt");
    fs::write(&original, "keep").unwrap();
    let missing = directory.0.join("missing");
    assert_eq!(
        save_to_directory(&missing, "export.txt", "new"),
        Err("write-failed".into())
    );
    assert!(!missing.exists());
    assert_eq!(fs::read_to_string(original).unwrap(), "keep");
}

#[test]
fn stops_after_ninety_nine_suffixes_and_preserves_all_existing_files() {
    let directory = TestDirectory::new();
    fs::write(directory.0.join("export.json"), "keep").unwrap();
    for index in 1..=99 {
        fs::write(directory.0.join(format!("export ({index}).json")), "keep").unwrap();
    }
    assert_eq!(
        save_to_directory(&directory.0, "export.json", "new"),
        Err("write-failed".into())
    );
    assert_eq!(fs::read_dir(&directory.0).unwrap().count(), 100);
    for entry in fs::read_dir(&directory.0).unwrap() {
        assert_eq!(fs::read_to_string(entry.unwrap().path()).unwrap(), "keep");
    }
}
