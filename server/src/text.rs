use serde_json::{json, Value};
use soplang_frontend::frontend::{Lexer, Token, TokenType};
pub fn position(text: &str, offset: usize) -> Value {
    let offset = offset.min(text.len());
    let before = &text[..text.floor_char_boundary(offset)];
    let line = before.bytes().filter(|b| *b == b'\n').count();
    let character = before
        .rsplit('\n')
        .next()
        .unwrap_or("")
        .encode_utf16()
        .count();
    json!({"line":line,"character":character})
}
pub fn offset(text: &str, p: &Value) -> usize {
    let line = p["line"].as_u64().unwrap_or(0) as usize;
    let character = p["character"].as_u64().unwrap_or(0) as usize;
    let start = text
        .split_inclusive('\n')
        .take(line)
        .map(str::len)
        .sum::<usize>()
        .min(text.len());
    let mut count = 0;
    for (i, ch) in text[start..].char_indices() {
        if ch == '\n' || count >= character {
            return start + i;
        }
        count += ch.len_utf16();
        if count > character {
            return start + i;
        }
    }
    text.len()
}
pub fn scalar_offset(text: &str, line: usize, col: usize) -> usize {
    let start = text
        .split_inclusive('\n')
        .take(line.saturating_sub(1))
        .map(str::len)
        .sum::<usize>()
        .min(text.len());
    start
        + text[start..]
            .split('\n')
            .next()
            .unwrap_or("")
            .chars()
            .take(col.saturating_sub(1))
            .map(char::len_utf8)
            .sum::<usize>()
}
pub fn range(text: &str, start: usize, end: usize) -> Value {
    json!({"start":position(text,start),"end":position(text,end)})
}
pub fn token_end(t: &Token) -> usize {
    t.start + t.lexeme.len() + if t.kind == TokenType::String { 2 } else { 0 }
}
/// Strings and comments retain their exact bytes; offsets remain compiler byte offsets.
pub fn protected(text: &str) -> Vec<(usize, usize)> {
    soplang_frontend::frontend::trivia::protected_ranges(text)
        .into_iter()
        .map(|range| (range.start, range.end))
        .collect()
}
pub fn in_protected(text: &str, offset: usize) -> bool {
    protected(text).iter().any(|(a, b)| {
        *a < offset
            && (offset < *b
                || offset == *b
                    && text.get(*a..*b).is_some_and(|s| {
                        s.starts_with("//")
                            || s.starts_with("/*") && !s.ends_with("*/")
                            || s.starts_with('"') && !s.ends_with('"')
                            || s.starts_with('\'') && !s.ends_with('\'')
                    }))
    })
}
pub fn tokens(text: &str) -> Vec<Token> {
    Lexer::new(text).tokenize().unwrap_or_default()
}
