use crate::{format, text, Server, Snapshot};
use serde_json::{json, Value};
use soplang_frontend::{
    analysis::index::{Index, Symbol},
    frontend::TokenType as K,
};
use std::collections::{HashMap, HashSet};
fn catalog() -> &'static Value {
    static C: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    C.get_or_init(|| serde_json::from_str(include_str!("../../language/catalog.json")).unwrap())
}
fn entries() -> &'static Vec<Value> {
    catalog()["entries"].as_array().unwrap()
}
fn entry(name: &str, receiver: &str) -> Option<&'static Value> {
    entries().iter().find(|e| {
        e["receiver"] == receiver
            && (e["name"] == name || e["aliases"].as_array().unwrap().iter().any(|a| a == name))
    })
}
fn signature(symbol: &Symbol) -> String {
    if let Some(params) = &symbol.parameters {
        format!("{}({}): {}", symbol.name, params.join(", "), symbol.returns)
    } else {
        format!("{}: {}", symbol.name, symbol.ty)
    }
}
fn catalog_signature(e: &Value, name: &str) -> String {
    format!(
        "{}({}): {}",
        name,
        e["parameters"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s.as_str().unwrap())
            .collect::<Vec<_>>()
            .join(", "),
        e["returns"].as_str().unwrap()
    )
}
fn catalog_docs(e: &Value, name: &str) -> String {
    format!(
        "{}{}",
        e["documentation"].as_str().unwrap(),
        if e["name"] != name {
            format!(
                "\nCompatibility spelling of {}. Keep its documented receiver and return contract.",
                e["name"].as_str().unwrap()
            )
        } else {
            String::new()
        }
    )
}
fn symbol_completion(s: &Symbol) -> Value {
    json!({"label":s.name,"kind":if s.kind==5{7}else if s.parameters.is_some(){3}else if s.constant{21}else{6},"detail":signature(s),"documentation":{"kind":"plaintext","value":format!("Declared in {}",s.location.path.display())}})
}
fn catalog_completion(e: &Value, name: &str) -> Value {
    json!({"label":name,"kind":if e["receiver"]=="keyword"{14}else{3},"detail":if e["receiver"]=="keyword"{name.into()}else{catalog_signature(e,name)},"documentation":{"kind":"plaintext","value":catalog_docs(e,name)}})
}
pub fn capabilities() -> Value {
    json!({
     "positionEncoding":"utf-16","textDocumentSync":{"openClose":true,"change":1,"save":false},
     "completionProvider":{"triggerCharacters":[".","\"","/"]},"hoverProvider":true,"signatureHelpProvider":{"triggerCharacters":["(",","],"retriggerCharacters":[","]},
     "definitionProvider":true,"declarationProvider":true,"referencesProvider":true,"documentHighlightProvider":true,"documentSymbolProvider":true,"workspaceSymbolProvider":true,
     "renameProvider":{"prepareProvider":true},"documentFormattingProvider":true,"documentRangeFormattingProvider":true,"foldingRangeProvider":true,"selectionRangeProvider":true,
     "documentLinkProvider":{"resolveProvider":false},"semanticTokensProvider":{"legend":{"tokenTypes":["variable","function","class","method","parameter"],"tokenModifiers":["declaration","readonly"]},"full":true},
     "workspace":{"workspaceFolders":{"supported":true,"changeNotifications":true},"fileOperations":{"didRename":{"filters":[{"scheme":"file","pattern":{"glob":"**/*.{sop,so}"}}]}}}
    })
}
fn current<'a>(
    server: &'a Server,
    p: &Value,
) -> Option<(&'a crate::Document, &'a Snapshot, usize)> {
    let uri = p["textDocument"]["uri"].as_str()?;
    let doc = server.docs.get(uri)?;
    if doc.rejected {
        return None;
    }
    let snapshot = server.snapshots.get(uri)?;
    let offset = text::offset(&doc.text, &p["position"]);
    Some((doc, snapshot, offset))
}
fn expression_type(
    index: &Index,
    path: &std::path::Path,
    tokens: &[soplang_frontend::frontend::Token],
    end: usize,
    scope: usize,
    depth: usize,
) -> String {
    if depth > 32 {
        return "door".into();
    }
    let Some(token) = tokens.get(end) else {
        return "door".into();
    };
    if matches!(token.kind, K::RParen | K::RBracket | K::RBrace) {
        let (left, right) = match token.kind {
            K::RParen => (K::LParen, K::RParen),
            K::RBracket => (K::LBracket, K::RBracket),
            _ => (K::LBrace, K::RBrace),
        };
        let mut nesting = 0;
        let mut open = None;
        for i in (0..=end).rev() {
            if tokens[i].kind == right {
                nesting += 1;
            } else if tokens[i].kind == left {
                nesting -= 1;
                if nesting == 0 {
                    open = Some(i);
                    break;
                }
            }
        }
        let Some(open) = open else {
            return "door".into();
        };
        if token.kind == K::RBrace {
            return "walax".into();
        }
        if token.kind == K::RBracket {
            if open > 0
                && matches!(
                    tokens[open - 1].kind,
                    K::Identifier | K::String | K::RParen | K::RBracket
                )
            {
                return if expression_type(index, path, tokens, open - 1, scope, depth + 1)
                    == "qoraal"
                {
                    "qoraal".into()
                } else {
                    "door".into()
                };
            }
            return "teed".into();
        }
        if open > 0 {
            let name = &tokens[open - 1];
            if open > 1 && tokens[open - 2].kind == K::Cusub {
                return name.lexeme.clone();
            }
            if open > 2 && tokens[open - 2].kind == K::Dot {
                let ty = expression_type(index, path, tokens, open - 3, scope, depth + 1);
                if let Some(method) = index.method(&ty, &name.lexeme) {
                    return method.returns.clone();
                }
                return entry(&name.lexeme, &ty)
                    .and_then(|e| e["returns"].as_str())
                    .unwrap_or("door")
                    .into();
            }
            if let Some(symbol) = index.resolve(&name.lexeme, scope, name.start, path) {
                return symbol.returns.clone();
            }
            if let Some(builtin) = entry(&name.lexeme, "global") {
                return builtin["returns"].as_str().unwrap_or("door").into();
            }
        }
        return if end > open + 1 {
            expression_type(index, path, tokens, end - 1, scope, depth + 1)
        } else {
            "door".into()
        };
    }
    index.receiver_type(path, token.start, scope)
}
fn receiver(
    index: &Index,
    path: &std::path::Path,
    tokens: &[soplang_frontend::frontend::Token],
    before: usize,
) -> Option<String> {
    let dot = tokens.iter().rposition(|t| t.start < before)?;
    if tokens[dot].kind != K::Dot {
        return None;
    }
    Some(expression_type(
        index,
        path,
        tokens,
        dot.checked_sub(1)?,
        index.scope_at(path, before),
        0,
    ))
}
fn callable(
    server: &Server,
    doc: &crate::Document,
    snapshot: &Snapshot,
    offset: usize,
) -> Option<(String, Vec<String>, String, usize)> {
    let tokens = text::tokens(&doc.text);
    let mut stack: Vec<(usize, usize)> = vec![];
    for (i, t) in tokens
        .iter()
        .enumerate()
        .take_while(|(_, t)| t.start < offset)
    {
        match t.kind {
            K::LParen | K::LBracket | K::LBrace => stack.push((i, 0)),
            K::RParen | K::RBracket | K::RBrace => {
                stack.pop();
            }
            K::Comma => {
                if let Some((_, count)) = stack.last_mut() {
                    *count += 1;
                }
            }
            _ => (),
        }
    }
    let &(open, active) = stack
        .iter()
        .rev()
        .find(|(i, _)| tokens[*i].kind == K::LParen)?;
    let target = tokens.get(open.checked_sub(1)?)?;
    if let Some(occurrence) = snapshot.index.at(&doc.path, target.start) {
        if let Some(symbol) = snapshot.index.symbol(&occurrence.symbol) {
            if let Some(params) = &symbol.parameters {
                return Some((
                    signature(symbol),
                    params.clone(),
                    format!("Declared in {}", symbol.location.path.display()),
                    active,
                ));
            }
            if symbol.kind == 5 {
                if let Some(constructor) = snapshot.index.method(&symbol.name, "dhis") {
                    return Some((
                        format!(
                            "cusub {}({})",
                            symbol.name,
                            constructor.parameters.as_ref()?.join(", ")
                        ),
                        constructor.parameters.clone()?,
                        "Construct an instance using the nearest dhis or dhaw constructor.".into(),
                        active,
                    ));
                }
                return Some((
                    format!("cusub {}()", symbol.name),
                    vec![],
                    "Construct an instance.".into(),
                    0,
                ));
            }
        }
    }
    let recv = if open >= 2 && tokens[open - 2].kind == K::Dot {
        receiver(
            &snapshot.index,
            &doc.path,
            &tokens[..open - 1],
            target.start,
        )
    } else {
        None
    };
    let e = entry(&target.lexeme, recv.as_deref().unwrap_or("global"))?;
    let _ = server;
    Some((
        catalog_signature(e, &target.lexeme),
        e["parameters"]
            .as_array()?
            .iter()
            .filter_map(|v| v.as_str().map(str::to_owned))
            .collect(),
        catalog_docs(e, &target.lexeme),
        active,
    ))
}
fn document_symbol_range(doc: &crate::Document, index: &Index, symbol: &Symbol) -> Value {
    let Some(tokens) = index.tokens.get(&doc.path) else {
        return text::range(&doc.text, symbol.location.start, symbol.location.end);
    };
    let Some(name) = tokens.iter().position(|t| t.start == symbol.location.start) else {
        return text::range(&doc.text, symbol.location.start, symbol.location.end);
    };
    let start = if matches!(symbol.kind, 5 | 6 | 12) {
        tokens
            .get(name.wrapping_sub(1))
            .map(|t| t.start)
            .unwrap_or(symbol.location.start)
    } else {
        symbol.location.start
    };
    let mut end = symbol.location.end;
    if matches!(symbol.kind, 5 | 6 | 12) {
        if let Some(open) = tokens
            .iter()
            .enumerate()
            .skip(name + 1)
            .find(|(_, t)| t.kind == K::LBrace)
            .map(|(i, _)| i)
        {
            let mut depth = 0;
            for token in &tokens[open..] {
                match token.kind {
                    K::LBrace => depth += 1,
                    K::RBrace => {
                        depth -= 1;
                        if depth == 0 {
                            end = text::token_end(token);
                            break;
                        }
                    }
                    _ => (),
                }
            }
        }
    }
    text::range(&doc.text, start, end)
}
fn import_completions(server: &Server, doc: &crate::Document, offset: usize) -> Option<Value> {
    let (start, end) = text::protected(&doc.text).into_iter().find(|(a, b)| {
        *a < offset
            && offset <= *b
            && (doc.text.as_bytes()[*a] == b'"' || doc.text.as_bytes()[*a] == b'\'')
    })?;
    let prefix_tokens = text::tokens(&doc.text[..start]);
    if !prefix_tokens
        .iter()
        .rev()
        .find(|t| t.kind != K::Eof)
        .is_some_and(|t| t.kind == K::Keen)
    {
        return None;
    }
    let end = offset.min(end);
    let prefix = &doc.text[start + 1..end];
    if prefix.ends_with('"') || prefix.ends_with('\'') {
        return None;
    }
    let parent = doc.path.parent()?;
    let split = prefix.rfind('/').map(|i| i + 1).unwrap_or(0);
    let directory = parent.join(&prefix[..split]);
    let directory = soplang_frontend::analysis::source_identity(&directory);
    if !server.trusted && !server.roots.iter().any(|root| directory.starts_with(root)) {
        return Some(json!([]));
    }
    let mut files = HashMap::<String, bool>::new();
    if let Ok(entries) = std::fs::read_dir(&directory) {
        for entry in entries.flatten().take(256) {
            let path = entry.path();
            if path.is_dir()
                || path
                    .extension()
                    .is_some_and(|ext| ext == "sop" || ext == "so")
            {
                files.insert(
                    entry.file_name().to_string_lossy().into_owned(),
                    path.is_dir(),
                );
            }
        }
    }
    for open in server.docs.values() {
        if open.path.parent() == Some(directory.as_path()) {
            if let Some(name) = open.path.file_name() {
                files.insert(name.to_string_lossy().into_owned(), false);
            }
        }
    }
    let mut files: Vec<_> = files.into_iter().collect();
    files.sort_unstable();
    Some(json!(files.into_iter().map(|(name,directory)|{let label=format!("{}{}",name,if directory{"/"}else{""});json!({"label":label,"kind":if directory{19}else{17},"textEdit":{"range":text::range(&doc.text,start+1+split,offset),"newText":label}})}).collect::<Vec<_>>()))
}
pub fn request(server: &Server, method: &str, p: &Value) -> Result<Value, (i32, String)> {
    if method == "workspace/symbol" {
        let query = p["query"].as_str().unwrap_or("").to_lowercase();
        let mut seen = HashSet::new();
        let mut symbols = vec![];
        for snapshot in server.snapshots.values() {
            for s in &snapshot.index.symbols {
                if s.name.to_lowercase().contains(&query) && seen.insert(s.id.clone()) {
                    symbols.push(json!({"name":s.name,"kind":s.kind,"location":server.location(&s.location),"containerName":s.owner}));
                    if symbols.len() >= 1000 {
                        return Ok(json!(symbols));
                    }
                }
            }
        }
        return Ok(json!(symbols));
    }
    let Some((doc, snapshot, offset)) = current(server, p) else {
        return Ok(Value::Null);
    };
    let index = &snapshot.index;
    let tokens = index
        .tokens
        .get(&doc.path)
        .cloned()
        .unwrap_or_else(|| text::tokens(&doc.text));
    let occurrence = index.at(&doc.path, offset);
    let symbol = occurrence.and_then(|o| index.symbol(&o.symbol));
    match method {
  "textDocument/completion"=>{
   if let Some(items)=import_completions(server,doc,offset){return Ok(items);}
   if text::in_protected(&doc.text,offset){return Ok(json!([]));}
   let current_word=tokens.iter().find(|t|t.start<=offset&&offset<=text::token_end(t)&&matches!(t.kind,K::Identifier|K::Kuceli));
   let before=current_word.map(|t|t.start).unwrap_or(offset);
   let recv=receiver(index,&doc.path,&tokens,before);
   let mut items=vec![];let mut seen=HashSet::new();
   if let Some(recv)=recv{
    let mut class=Some(recv.as_str());let mut parents=HashSet::new();while let Some(ty)=class {if !parents.insert(ty){break;}for s in index.symbols.iter().filter(|s|s.owner.as_deref()==Some(ty)){if seen.insert(s.name.clone()){items.push(symbol_completion(s));}}class=index.parents.get(ty).map(String::as_str);}
    for e in entries().iter().filter(|e|e["receiver"]==recv){for name in std::iter::once(e["name"].as_str().unwrap()).chain(e["aliases"].as_array().unwrap().iter().map(|a|a.as_str().unwrap())){if seen.insert(name.to_owned()){items.push(catalog_completion(e,name));}}}
   }else{
    for s in index.visible(&doc.path,offset){if seen.insert(s.name.clone()){items.push(symbol_completion(s));}}
    let constructors=tokens.iter().rev().find(|t|t.start<before).is_some_and(|t|t.kind==K::Cusub);
    if constructors {items.retain(|v|v["kind"]==7);}else{for e in entries().iter().filter(|e|e["receiver"]=="global"||e["receiver"]=="keyword"){for name in std::iter::once(e["name"].as_str().unwrap()).chain(e["aliases"].as_array().unwrap().iter().map(|a|a.as_str().unwrap())){if seen.insert(name.to_owned()){items.push(catalog_completion(e,name));}}}}
   }Ok(json!({"isIncomplete":false,"items":items}))
  },
  "textDocument/hover"=>{
   if let Some(symbol)=symbol{return Ok(json!({"contents":{"kind":"plaintext","value":format!("{}\nDeclared in {}",signature(symbol),symbol.location.path.display())},"range":server.location(&occurrence.unwrap().location)["range"]}));}
   if text::in_protected(&doc.text,offset){return Ok(Value::Null);}
   let Some(token)=tokens.iter().find(|t|t.start<=offset&&offset<text::token_end(t))else{return Ok(Value::Null)};
   let recv=receiver(index,&doc.path,&tokens,token.start);
   let e=entry(&token.lexeme,recv.as_deref().unwrap_or("global")).or_else(||if recv.is_none(){entry(&token.lexeme,"keyword")}else{None});
   Ok(e.map(|e|json!({"contents":{"kind":"plaintext","value":format!("{}\n{}",if e["receiver"]=="keyword"{token.lexeme.clone()}else{catalog_signature(e,&token.lexeme)},catalog_docs(e,&token.lexeme))},"range":text::range(&doc.text,token.start,text::token_end(token))})).unwrap_or(Value::Null))
  },
  "textDocument/signatureHelp"=>{if text::in_protected(&doc.text,offset){return Ok(Value::Null);}Ok(callable(server,doc,snapshot,offset).map(|(label,params,documentation,active)|{let active=active.min(params.len().saturating_sub(1));json!({"signatures":[{"label":label,"documentation":{"kind":"plaintext","value":documentation},"parameters":params.iter().map(|s|json!({"label":s})).collect::<Vec<_>>() }],"activeSignature":0,"activeParameter":active})}).unwrap_or(Value::Null))},
  "textDocument/definition"|"textDocument/declaration"=>Ok(symbol.map(|s|json!([server.location(&s.location)])).unwrap_or(Value::Null)),
  "textDocument/references"|"textDocument/documentHighlight"=>{let Some(symbol)=symbol else{return Ok(json!([]))};let declarations=p["context"]["includeDeclaration"].as_bool().unwrap_or(false);let highlights=method.ends_with("documentHighlight");let mut seen=HashSet::new();let mut result=vec![];
   for snapshot in server.snapshots.values(){for occurrence in &snapshot.index.occurrences{if occurrence.symbol==symbol.id&&(declarations||!occurrence.declaration||highlights)&&(!highlights||occurrence.location.path==doc.path)&&seen.insert(occurrence.location.clone()){let location=server.location(&occurrence.location);result.push(if highlights {json!({"range":location["range"],"kind":if occurrence.write{3}else{2}})}else{location});}}}Ok(json!(result))},
  "textDocument/prepareRename"|"textDocument/rename"=>{
   let Some(symbol)=symbol else{return Err((-32602,"No resolved symbol at this position".into()))};
   if symbol.scope==0&&!server.index_complete{return Err((-32602,"Workspace indexing limits prevent a complete rename".into()));}
   if symbol.owner.is_some()||symbol.name=="nafta"||symbol.name=="waalid"{return Err((-32602,"Dynamic member and implicit receiver renaming is not safe".into()));}
   if snapshot.analysis.error.is_some(){return Err((-32602,"Fix compiler errors before renaming this symbol".into()));}
   if method.ends_with("prepareRename"){return Ok(json!({"range":server.location(&occurrence.unwrap().location)["range"],"placeholder":symbol.name}));}
   let new=p["newName"].as_str().unwrap_or("");
   if entry(new,"global").is_some()||entry(new,"keyword").is_some(){return Err((-32602,"Rename to a built-in or contextual syntax name is not safe".into()));}
   let new_tokens=text::tokens(new);
   if new_tokens.len()!=2||new_tokens[0].kind!=K::Identifier||new_tokens[0].lexeme!=new{return Err((-32602,"Use a valid, nonreserved Soplang identifier".into()));}
   let mut edits:HashMap<String,Vec<Value>>=HashMap::new();let mut seen=HashSet::new();
   for snap in server.snapshots.values(){for occurrence in snap.index.occurrences.iter().filter(|o|o.symbol==symbol.id){
    if snap.analysis.error.is_some(){return Err((-32602,"A dependent source has compiler errors; rename is uncertain".into()));}
    if !snap.index.rename_preserves_bindings(&symbol.id,new){return Err((-32602,"Rename would collide with or capture another symbol".into()));}
    if seen.insert(occurrence.location.clone()){let location=server.location(&occurrence.location);edits.entry(location["uri"].as_str().unwrap().into()).or_default().push(json!({"range":location["range"],"newText":new}));}
   }}
   let mut changes=vec![];for (uri,edits) in edits {let version=server.docs.get(&uri).map(|d|d.version);if version.is_none(){let file=crate::path(&uri);let expected=server.snapshots.values().flat_map(|s|&s.analysis.files).find(|f|f.path==file).map(|f|&f.text);if std::fs::read_to_string(&file).ok().as_ref()!=expected {return Err((-32801,"A source file changed on disk; retry after analysis".into()));}}changes.push(json!({"textDocument":{"uri":uri,"version":version},"edits":edits}));}Ok(json!({"documentChanges":changes}))
  },
  "textDocument/documentSymbol"=>Ok(json!(index.symbols.iter().filter(|s|s.location.path==doc.path).map(|s|{let selection=server.location(&s.location)["range"].clone();json!({"name":s.name,"detail":signature(s),"kind":s.kind,"range":document_symbol_range(doc,index,s),"selectionRange":selection})}).collect::<Vec<_>>())),
  "textDocument/formatting"=>Ok(json!(format::edits(&doc.text,None,&p["options"]))),
  "textDocument/rangeFormatting"=>Ok(json!(format::edits(&doc.text,Some(&p["range"]),&p["options"]))),
  "textDocument/documentLink"=>{let mut links=vec![];for pair in tokens.windows(2){if pair[0].kind==K::Keen&&pair[1].kind==K::String {let target=doc.path.parent().unwrap_or(std::path::Path::new(".")).join(&pair[1].lexeme);links.push(json!({"range":text::range(&doc.text,pair[1].start+1,text::token_end(&pair[1])-1),"target":crate::uri(&target)}));}}Ok(json!(links))},
  "textDocument/foldingRange"|"textDocument/selectionRange"=>{
   let mut stack=vec![];let mut pairs=vec![];for t in &tokens {match t.kind {K::LBrace|K::LParen|K::LBracket=>stack.push(t),K::RBrace|K::RParen|K::RBracket=>if let Some(start)=stack.pop(){pairs.push((start.start,text::token_end(t)));},_=>()}}
   if method.ends_with("foldingRange"){let mut ranges=vec![];for (start,end) in pairs{let begin=text::position(&doc.text,start);let end=text::position(&doc.text,end);if begin["line"]!=end["line"]{ranges.push(json!({"startLine":begin["line"],"startCharacter":begin["character"],"endLine":end["line"],"endCharacter":end["character"]}));}}return Ok(json!(ranges));}
   let result=p["positions"].as_array().map(|positions|positions.iter().map(|pos|{let offset=text::offset(&doc.text,pos);let mut ranges=vec![(0,doc.text.len())];ranges.extend(pairs.iter().filter(|(a,b)|*a<=offset&&offset<=*b).copied());if let Some(t)=tokens.iter().find(|t|t.start<=offset&&offset<=text::token_end(t)){ranges.push((t.start,text::token_end(t)));}ranges.sort_by_key(|(a,b)|std::cmp::Reverse(b-a));ranges.dedup();let mut parent=Value::Null;for (a,b) in ranges{let mut selected=json!({"range":text::range(&doc.text,a,b)});if !parent.is_null(){selected["parent"]=parent;}parent=selected;}parent}).collect::<Vec<_>>()).unwrap_or_default();Ok(json!(result))
  },
  "textDocument/semanticTokens/full"=>{
   let mut classified=vec![];for o in index.occurrences.iter().filter(|o|o.location.path==doc.path){if let Some(s)=index.symbol(&o.symbol){let pos=text::position(&doc.text,o.location.start);let kind=if s.parameter{4}else if s.owner.is_some(){3}else if s.kind==5{2}else if s.parameters.is_some(){1}else{0};let modifiers=usize::from(o.declaration)|if s.constant{2}else{0};let length=doc.text[o.location.start..o.location.end].encode_utf16().count();classified.push((pos["line"].as_u64().unwrap(),pos["character"].as_u64().unwrap(),length,kind,modifiers));}}
   classified.sort_unstable();let mut data=vec![];let(mut last_line,mut last_char)=(0,0);for(line,ch,len,kind,modifiers)in classified{data.extend([line-last_line,if line==last_line{ch-last_char}else{ch},len as u64,kind,modifiers as u64]);last_line=line;last_char=ch;}Ok(json!({"data":data}))
  },
  _=>Err((-32601,format!("Unsupported method: {method}")))
 }
}
