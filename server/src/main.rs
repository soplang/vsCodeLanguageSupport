mod format;
mod providers;
mod text;
use serde_json::{json, Value};
use soplang_frontend::analysis::{self, index::Index, Analysis, Limits};
use std::{
    collections::{HashMap, HashSet},
    io::{self, BufRead, Write},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc, Arc, Mutex,
    },
    time::{Duration, Instant},
};
use url::Url;
const MAX_MESSAGE: usize = 16 * 1024 * 1024;
fn workspace_sources(roots: &[PathBuf], limit: usize) -> (Vec<(String, Document)>, bool) {
    let mut complete = true;
    let mut sources = Vec::new();
    let mut pending: Vec<(PathBuf, usize)> = roots.iter().cloned().map(|p| (p, 0)).collect();
    let mut entries_seen = 0;
    let mut bytes = 0;
    while let Some((directory, depth)) = pending.pop() {
        if depth > 8 || sources.len() >= 128 || entries_seen >= 8192 {
            complete = false;
            continue;
        }
        let Ok(entries) = std::fs::read_dir(directory) else {
            complete = false;
            continue;
        };
        for entry in entries.flatten() {
            entries_seen += 1;
            if entries_seen >= 8192 || sources.len() >= 128 {
                complete = false;
                break;
            }
            let Ok(kind) = entry.file_type() else {
                continue;
            };
            let path = entry.path();
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if kind.is_dir() {
                if !name.starts_with('.')
                    && !matches!(name.as_ref(), "node_modules" | "target" | "bin" | "vendor")
                {
                    pending.push((path, depth + 1));
                }
                continue;
            }
            if !kind.is_file() || !path.extension().is_some_and(|e| e == "sop" || e == "so") {
                continue;
            }
            let Ok(meta) = entry.metadata() else {
                continue;
            };
            if meta.len() > limit as u64 || bytes + meta.len() as usize > 8 * 1024 * 1024 {
                complete = false;
                continue;
            }
            if let Ok(text) = std::fs::read_to_string(&path) {
                if text.contains('\0') {
                    continue;
                }
                bytes += text.len();
                let path = analysis::source_identity(&path);
                sources.push((
                    uri(&path),
                    Document {
                        text,
                        path,
                        version: 0,
                        rejected: false,
                    },
                ));
            }
        }
    }
    (sources, complete)
}
#[derive(Clone)]
pub struct Document {
    pub text: String,
    pub version: i64,
    pub path: PathBuf,
    pub rejected: bool,
}
pub struct Snapshot {
    pub analysis: Analysis,
    pub index: Index,
}
pub struct Server {
    pub docs: HashMap<String, Document>,
    pub snapshots: HashMap<String, Snapshot>,
    pub enabled: bool,
    pub strict: bool,
    pub trusted: bool,
    pub limits: Limits,
    pub published: HashSet<String>,
    pub generation: Arc<AtomicU64>,
    pub roots: Vec<PathBuf>,
    pub built_generation: Option<u64>,
    pub settings: Vec<(PathBuf, bool, bool)>,
    pub index_complete: bool,
}
pub fn uri(path: &Path) -> String {
    Url::from_file_path(path)
        .map(|u| u.to_string())
        .unwrap_or_else(|_| path.to_string_lossy().into_owned())
}
pub fn path(value: &str) -> PathBuf {
    if let Ok(url) = Url::parse(value) {
        if let Ok(path) = url.to_file_path() {
            return analysis::source_identity(&path);
        }
    }
    PathBuf::from(value)
}
fn write(value: Value) {
    let body = serde_json::to_vec(&value).unwrap();
    let mut out = io::stdout().lock();
    let _ = write!(out, "Content-Length: {}\r\n\r\n", body.len());
    let _ = out.write_all(&body);
    let _ = out.flush();
}
fn notify(method: &str, params: Value) {
    write(json!({"jsonrpc":"2.0","method":method,"params":params}));
}
fn response(id: &Value, result: Value) {
    write(json!({"jsonrpc":"2.0","id":id,"result":result}));
}
fn error(id: &Value, code: i32, message: &str) {
    write(json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":message}}));
}
fn read_message(input: &mut impl BufRead) -> io::Result<Option<Value>> {
    let mut length = None;
    let mut header_bytes = 0;
    loop {
        let mut line = String::new();
        if input.read_line(&mut line)? == 0 {
            return Ok(None);
        }
        header_bytes += line.len();
        if header_bytes > 8192 {
            return Err(io::Error::other("Header limit"));
        }
        if line == "\r\n" || line == "\n" {
            break;
        }
        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("Content-Length") {
                length = value.trim().parse::<usize>().ok();
            }
        }
    }
    let length = length
        .filter(|n| *n <= MAX_MESSAGE)
        .ok_or_else(|| io::Error::other("Message limit"))?;
    let mut bytes = vec![0; length];
    input.read_exact(&mut bytes)?;
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(io::Error::other)
}
impl Server {
    fn rebuild(&mut self, expected: u64) {
        if self.built_generation == Some(expected) {
            return;
        }
        let overlays: HashMap<PathBuf, String> = self
            .docs
            .values()
            .map(|doc| (doc.path.clone(), doc.text.clone()))
            .collect();
        let mut snapshots = HashMap::new();
        let mut entries: Vec<(String, Document)> = self
            .docs
            .iter()
            .map(|(u, d)| (u.clone(), d.clone()))
            .collect();
        let open_paths: HashSet<_> = self.docs.values().map(|d| d.path.clone()).collect();
        let (workspace, index_complete) =
            workspace_sources(&self.roots, self.limits.max_file_bytes);
        self.index_complete = index_complete;
        entries.extend(
            workspace
                .into_iter()
                .filter(|(_, d)| !open_paths.contains(&d.path)),
        );
        let mut retained_bytes = 0usize;
        for (uri, doc) in &entries {
            if self.generation.load(Ordering::SeqCst) != expected {
                return;
            }
            let loader = |p: &Path| {
                if !self.trusted
                    && !self.roots.iter().any(|root| p.starts_with(root))
                    && !overlays.contains_key(p)
                {
                    return Err("Import outside workspace requires Workspace Trust".into());
                }
                if let Some(text) = overlays.get(p) {
                    return Ok(text.clone());
                }
                let meta = std::fs::metadata(p)
                    .map_err(|_| format!("Faylka '{}' ma helin", p.display()))?;
                if meta.len() > self.limits.max_file_bytes as u64 {
                    return Err("Import exceeds analysis size limit".into());
                }
                analysis::overlay_loader(&overlays, p)
            };
            let cancelled = || self.generation.load(Ordering::SeqCst) != expected;
            let mut analysis = analysis::check_source(
                &doc.text,
                &doc.path,
                self.settings
                    .iter()
                    .filter(|(path, _, _)| doc.path.starts_with(path))
                    .max_by_key(|(path, _, _)| path.as_os_str().len())
                    .map(|(_, strict, _)| *strict)
                    .unwrap_or(self.strict),
                self.limits,
                &loader,
                &cancelled,
            );
            if doc.rejected {
                analysis.error = Some(soplang_frontend::error::import_error_ex(
                    "Document exceeds editor memory limit",
                    1,
                    1,
                    soplang_frontend::error::ErrorMeta::default()
                        .with_code("EDITOR_LIMIT")
                        .with_file(doc.path.clone()),
                ));
            }
            let index = Index::build(&analysis.files);
            let bytes = analysis.files.iter().map(|f| f.text.len()).sum::<usize>();
            if retained_bytes + bytes <= 32 * 1024 * 1024 {
                retained_bytes += bytes;
                snapshots.insert(uri.clone(), Snapshot { analysis, index });
            } else {
                self.index_complete = false;
            }
        }
        if self.generation.load(Ordering::SeqCst) != expected {
            return;
        }
        self.snapshots = snapshots;
        self.built_generation = Some(expected);
    }
    fn publish(&mut self) {
        let mut grouped: HashMap<String, Vec<Value>> =
            self.docs.keys().map(|key| (key.clone(), vec![])).collect();
        {
            for (entry, snapshot) in &self.snapshots {
                if let Some(error) = &snapshot.analysis.error {
                    let Some(doc) = self.docs.get(entry) else {
                        continue;
                    };
                    if !self
                        .settings
                        .iter()
                        .filter(|(path, _, _)| doc.path.starts_with(path))
                        .max_by_key(|(path, _, _)| path.as_os_str().len())
                        .map(|(_, _, enabled)| *enabled)
                        .unwrap_or(self.enabled)
                    {
                        continue;
                    }
                    let file = error.meta().file.as_deref().unwrap_or(&doc.path);
                    let target = self
                        .docs
                        .iter()
                        .find(|(_, d)| d.path == file)
                        .map(|(u, _)| u.clone())
                        .unwrap_or_else(|| uri(file));
                    let source = snapshot
                        .analysis
                        .files
                        .iter()
                        .find(|f| f.path == file)
                        .map(|f| f.text.as_str())
                        .unwrap_or(&doc.text);
                    let (line, col) = error.location();
                    let start = text::scalar_offset(source, line, col);
                    let end = text::scalar_offset(
                        source,
                        error.meta().end_line.unwrap_or(line),
                        error.meta().end_col.unwrap_or(col) + 1,
                    );
                    let diagnostic = json!({"range":text::range(source,start,end),"severity":1,"code":error.code().unwrap_or("SOPLANG"),"source":"soplang","message":format!("{}{}",error,error.hint().map(|h|format!("\n{h}")).unwrap_or_default())});
                    let diagnostics = grouped.entry(target).or_default();
                    if !diagnostics.contains(&diagnostic) {
                        diagnostics.push(diagnostic);
                    }
                }
            }
        }
        for old in &self.published {
            grouped.entry(old.clone()).or_default();
        }
        self.published.clear();
        for (uri, diagnostics) in grouped {
            if !diagnostics.is_empty() {
                self.published.insert(uri.clone());
            }
            let version = self.docs.get(&uri).map(|d| d.version);
            notify(
                "textDocument/publishDiagnostics",
                json!({"uri":uri,"version":version,"diagnostics":diagnostics}),
            );
        }
    }
    pub fn source(&self, location: &analysis::index::Location) -> Option<&str> {
        self.docs
            .values()
            .find(|doc| doc.path == location.path)
            .map(|doc| doc.text.as_str())
            .or_else(|| {
                self.snapshots
                    .values()
                    .flat_map(|s| &s.analysis.files)
                    .find(|f| f.path == location.path)
                    .map(|f| f.text.as_str())
            })
    }
    pub fn location(&self, location: &analysis::index::Location) -> Value {
        let text = self.source(location).unwrap_or("");
        let target = self
            .docs
            .iter()
            .find(|(_, d)| d.path == location.path)
            .map(|(u, _)| u.clone())
            .unwrap_or_else(|| uri(&location.path));
        json!({"uri":target,"range":text::range(text,location.start,location.end)})
    }
}
fn main() {
    let generation = Arc::new(AtomicU64::new(0));
    let reader_generation = generation.clone();
    let (tx, rx) = mpsc::sync_channel(8);
    let cancelled = Arc::new(Mutex::new(HashSet::<String>::new()));
    let reader_cancelled = cancelled.clone();
    std::thread::spawn(move || {
        let mut input = io::BufReader::new(io::stdin());
        while let Ok(Some(message)) = read_message(&mut input) {
            let method = message["method"].as_str().unwrap_or("");
            if matches!(
                method,
                "textDocument/didOpen"
                    | "textDocument/didChange"
                    | "textDocument/didClose"
                    | "workspace/didChangeWatchedFiles"
                    | "workspace/didRenameFiles"
                    | "workspace/didChangeConfiguration"
                    | "workspace/didChangeWorkspaceFolders"
                    | "soplang/documentConfiguration"
            ) {
                reader_generation.fetch_add(1, Ordering::SeqCst);
            }
            if method == "$/cancelRequest" {
                let mut cancelled = reader_cancelled.lock().unwrap();
                if cancelled.len() >= 1024 {
                    cancelled.clear();
                }
                cancelled.insert(message["params"]["id"].to_string());
            }
            let serial = reader_generation.load(Ordering::SeqCst);
            if tx.send((message, serial)).is_err() {
                break;
            }
        }
    });
    let mut server = Server {
        docs: HashMap::new(),
        snapshots: HashMap::new(),
        enabled: true,
        strict: false,
        trusted: false,
        limits: Limits::default(),
        published: HashSet::new(),
        generation,
        roots: vec![],
        built_generation: None,
        settings: vec![],
        index_complete: true,
    };
    let mut pending: Option<Instant> = None;
    let mut dirty = false;
    let mut shutdown = false;
    let mut applied_generation = 0;
    loop {
        let (message, serial) = match rx.recv_timeout(Duration::from_millis(20)) {
            Ok(m) => m,
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if pending.is_some_and(|when| Instant::now() >= when)
                    && applied_generation == server.generation.load(Ordering::SeqCst)
                {
                    let expected = applied_generation;
                    server.rebuild(expected);
                    if expected == server.generation.load(Ordering::SeqCst) {
                        server.publish();
                        pending = None;
                        dirty = false;
                    }
                }
                continue;
            }
            Err(_) => break,
        };
        applied_generation = serial;
        let method = message["method"].as_str().unwrap_or("");
        let p = &message["params"];
        let id = &message["id"];
        if method == "exit" {
            std::process::exit(if shutdown { 0 } else { 1 });
        }
        if method == "$/cancelRequest" {
            continue;
        }
        if !id.is_null() && shutdown {
            error(id, -32600, "Server is shut down");
            continue;
        }
        match method {
            "initialize" => {
                server.trusted = p["initializationOptions"]["trusted"]
                    .as_bool()
                    .unwrap_or(false);
                server.roots = p["workspaceFolders"]
                    .as_array()
                    .map(|folders| {
                        folders
                            .iter()
                            .filter_map(|f| f["uri"].as_str().map(path))
                            .collect()
                    })
                    .unwrap_or_default();
                if server.roots.is_empty() {
                    if let Some(root) = p["rootUri"].as_str() {
                        server.roots.push(path(root));
                    }
                }
                response(
                    id,
                    json!({"serverInfo":{"name":"soplang-lsp","version":"3.0.0-frontend.e72c666"},"capabilities":providers::capabilities()}),
                );
            }
            "initialized" => (),
            "shutdown" => {
                shutdown = true;
                response(id, Value::Null);
            }
            "textDocument/didOpen" => {
                let d = &p["textDocument"];
                if let (Some(u), Some(text)) = (d["uri"].as_str(), d["text"].as_str()) {
                    if server.docs.len() < 128 || server.docs.contains_key(u) {
                        let rejected = text.len() > 4 * 1024 * 1024
                            || server.docs.values().map(|d| d.text.len()).sum::<usize>()
                                + text.len()
                                > 16 * 1024 * 1024;
                        server.docs.insert(
                            u.into(),
                            Document {
                                text: if rejected { String::new() } else { text.into() },
                                path: path(u),
                                version: d["version"].as_i64().unwrap_or(0),
                                rejected,
                            },
                        );
                        dirty = true;
                    }
                }
            }
            "textDocument/didChange" => {
                let retained = server.docs.values().map(|d| d.text.len()).sum::<usize>();
                if let Some(doc) = p["textDocument"]["uri"]
                    .as_str()
                    .and_then(|u| server.docs.get_mut(u))
                {
                    let version = p["textDocument"]["version"]
                        .as_i64()
                        .unwrap_or(doc.version + 1);
                    if version > doc.version {
                        if let Some(changes) = p["contentChanges"].as_array() {
                            for change in changes {
                                if let Some(text) = change["text"].as_str() {
                                    if change["range"].is_null() {
                                        doc.rejected = text.len() > 4 * 1024 * 1024
                                            || retained.saturating_sub(doc.text.len()) + text.len()
                                                > 16 * 1024 * 1024;
                                        doc.text = if doc.rejected {
                                            String::new()
                                        } else {
                                            text.into()
                                        };
                                    } else {
                                        let start =
                                            text::offset(&doc.text, &change["range"]["start"]);
                                        let end = text::offset(&doc.text, &change["range"]["end"]);
                                        if start <= end {
                                            doc.text.replace_range(start..end, text);
                                        }
                                    }
                                }
                            }
                        }
                        doc.version = version;
                        dirty = true;
                    }
                }
            }
            "textDocument/didClose" => {
                if let Some(u) = p["textDocument"]["uri"].as_str() {
                    server.docs.remove(u);
                    server.snapshots.remove(u);
                    notify(
                        "textDocument/publishDiagnostics",
                        json!({"uri":u,"diagnostics":[]}),
                    );
                    server.published.remove(u);
                    dirty = true;
                }
            }
            "soplang/documentConfiguration" => {
                server.settings = p["resources"]
                    .as_array()
                    .map(|entries| {
                        entries
                            .iter()
                            .filter_map(|e| {
                                e["uri"].as_str().map(|uri| {
                                    (
                                        path(uri),
                                        e["strict"].as_bool().unwrap_or(false),
                                        e["enableDiagnostics"].as_bool().unwrap_or(true),
                                    )
                                })
                            })
                            .collect()
                    })
                    .unwrap_or_default();
                dirty = true;
            }
            "workspace/didChangeConfiguration" => {
                let s = &p["settings"]["soplang"];
                server.enabled = s["enableDiagnostics"].as_bool().unwrap_or(true);
                server.strict = s["strict"].as_bool().unwrap_or(false);
                server.limits.max_file_bytes = s["analysis"]["maxFileBytes"]
                    .as_u64()
                    .or_else(|| s["analysis.maxFileBytes"].as_u64())
                    .unwrap_or(1048576)
                    .clamp(1024, 4194304) as usize;
                dirty = true;
            }
            "workspace/didChangeWatchedFiles" | "workspace/didRenameFiles" => {
                dirty = true;
            }
            "workspace/didChangeWorkspaceFolders" => {
                if let Some(removed) = p["event"]["removed"].as_array() {
                    for folder in removed {
                        if let Some(uri) = folder["uri"].as_str() {
                            let path = path(uri);
                            server.roots.retain(|p| p != &path);
                        }
                    }
                }
                if let Some(added) = p["event"]["added"].as_array() {
                    for folder in added {
                        if let Some(uri) = folder["uri"].as_str() {
                            server.roots.push(path(uri));
                        }
                    }
                }
                dirty = true;
            }
            "textDocument/didSave" => (),
            _ if !id.is_null() => {
                if cancelled.lock().unwrap().remove(&id.to_string()) {
                    error(id, -32800, "Request cancelled");
                    continue;
                }
                let expected = applied_generation;
                if dirty {
                    server.rebuild(expected);
                }
                if expected != server.generation.load(Ordering::SeqCst) {
                    error(id, -32801, "Document changed during request");
                    continue;
                }
                match providers::request(&server, method, p) {
                    Ok(result) => {
                        if cancelled.lock().unwrap().remove(&id.to_string()) {
                            error(id, -32800, "Request cancelled");
                        } else if expected == server.generation.load(Ordering::SeqCst) {
                            response(id, result);
                        } else {
                            error(id, -32801, "Document changed during request");
                        }
                    }
                    Err((code, message)) => error(id, code, &message),
                }
            }
            _ => (),
        }
        if dirty {
            pending = Some(Instant::now() + Duration::from_millis(120));
        }
    }
}
#[cfg(test)]
mod tests;
