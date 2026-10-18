use crate::text;
use serde_json::{json, Value};
use soplang_frontend::frontend::{parse_source, TokenType as K};
/// Deliberately conservative: indentation only. Token spelling, comments, EOLs,
/// line breaks, and literal bytes are invariant. Range edits stay inside selection.
pub fn edits(source: &str, selection: Option<&Value>, options: &Value) -> Vec<Value> {
    if source.len() > 4 * 1024 * 1024 {
        return vec![];
    }
    let preflight = text::tokens(source);
    let mut nesting = 0usize;
    let mut operators = 0usize;
    for token in &preflight {
        match token.kind {
            K::LBrace | K::LBracket | K::LParen => nesting += 1,
            K::RBrace | K::RBracket | K::RParen => {
                nesting = nesting.saturating_sub(1);
                operators = 0;
            }
            K::Plus | K::Minus | K::Not | K::Star | K::Slash | K::And | K::Or => operators += 1,
            K::Assign | K::Comma | K::Semicolon => operators = 0,
            _ => (),
        }
        if nesting > 128 || operators > 512 || preflight.len() > 100_000 {
            return vec![];
        }
    }
    if parse_source(source, None).is_err() {
        return vec![];
    }
    let tokens = text::tokens(source);
    let protected = text::protected(source);
    let tab = options["tabSize"].as_u64().unwrap_or(4).clamp(1, 16) as usize;
    let unit = if options["insertSpaces"].as_bool().unwrap_or(true) {
        " ".repeat(tab)
    } else {
        "\t".into()
    };
    let begin = selection
        .map(|s| text::offset(source, &s["start"]))
        .unwrap_or(0);
    let end = selection
        .map(|s| text::offset(source, &s["end"]))
        .unwrap_or(source.len());
    let mut result = vec![];
    let mut depth = 0usize;
    let mut cursor = 0;
    let mut token_index = 0;
    for line in source.split_inclusive('\n') {
        let leading = line.len() - line.trim_start_matches([' ', '\t']).len();
        let content = line.trim_start_matches([' ', '\t']);
        let line_end = cursor + line.len();
        let first = tokens
            .iter()
            .find(|t| t.start >= cursor && t.start < line_end);
        let closes = usize::from(
            first.is_some_and(|t| matches!(t.kind, K::RBrace | K::RBracket | K::RParen)),
        );
        if cursor >= begin
            && cursor < end
            && cursor + leading <= end
            && !content.trim().is_empty()
            && !protected.iter().any(|(a, b)| *a < cursor && cursor < *b)
        {
            let indent = unit.repeat(depth.saturating_sub(closes).min(128));
            if line[..leading] != indent {
                result.push(
                    json!({"range":text::range(source,cursor,cursor+leading),"newText":indent}),
                );
            }
        }
        while let Some(token) = tokens.get(token_index).filter(|t| t.start < line_end) {
            match token.kind {
                K::LBrace | K::LBracket | K::LParen => depth += 1,
                K::RBrace | K::RBracket | K::RParen => depth = depth.saturating_sub(1),
                _ => (),
            }
            token_index += 1;
        }
        cursor = line_end;
    }
    result
}
