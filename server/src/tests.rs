use super::*;
#[test]
fn utf16_roundtrip_and_scalar_ranges() {
    let source = "\tqor(\"😀\")\r\né=1\n";
    for (i, _) in source.char_indices() {
        let p = text::position(source, i);
        assert_eq!(text::offset(source, &p), i);
    }
    assert_eq!(
        text::position(source, text::scalar_offset(source, 1, 10))["character"],
        10
    );
}
#[test]
fn overlays_do_not_execute_imports() {
    let root = Path::new("/tmp/overlay-root.sop");
    let library = PathBuf::from("/tmp/overlay-library.sop");
    let mut overlays = HashMap::new();
    overlays.insert(
        library,
        "qor(gelin())\nhawl add(abn a, abn b): abn { celi a+b }".into(),
    );
    let result = analysis::check_source(
        "keen \"overlay-library.sop\"\nqor(add(1,2))",
        root,
        false,
        Limits::default(),
        &|p| analysis::overlay_loader(&overlays, p),
        &|| false,
    );
    assert!(result.error.is_none(), "{:?}", result.error);
    assert_eq!(result.files.len(), 2);
    let index = Index::build(&result.files);
    assert!(index
        .symbols
        .iter()
        .any(|s| s.name == "add" && s.location.path.ends_with("overlay-library.sop")));
}
#[test]
fn non_repl_semantics_and_limits() {
    let result = analysis::check_source(
        "door x=1 door x=2",
        Path::new("/tmp/a.sop"),
        false,
        Limits::default(),
        &|_| unreachable!(),
        &|| false,
    );
    assert_eq!(result.error.unwrap().code(), Some("E020"));
    let result = analysis::check_source(
        "qor(1)",
        Path::new("/tmp/a.sop"),
        false,
        Limits::default(),
        &|_| unreachable!(),
        &|| true,
    );
    assert_eq!(result.error.unwrap().code(), Some("EDITOR_LIMIT"));
}
#[test]
fn formatter_preserves_multiline_literal_and_comments() {
    let source="haddii (run) {\nqoraal s='a+b\n   https://example.com'\n/* comment\n  keep this */\nqor(s == 'a+b')\n}\n";
    let edits = format::edits(source, None, &json!({"tabSize":2,"insertSpaces":true}));
    assert!(edits
        .iter()
        .all(|e| e["range"]["start"]["line"] != 2 && e["range"]["start"]["line"] != 4));
    assert!(!edits.is_empty());
}
#[test]
fn framing_rejects_oversized_messages() {
    let input = b"Content-Length: 999999999\r\n\r\n";
    assert!(read_message(&mut io::Cursor::new(input)).is_err());
}
