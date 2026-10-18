const {execFileSync}=require('child_process');
const fs=require('fs');
const target=process.env.CARGO_BUILD_TARGET;
execFileSync('cargo',['build','--release','--locked','--manifest-path','server/Cargo.toml',...(target?['--target',target]:[])],{stdio:'inherit'});
const suffix=(target?target.includes('windows'):process.platform==='win32')?'.exe':'';
const platform=process.env.VSCE_TARGET || `${process.platform}-${process.arch}`;
fs.mkdirSync(`bin/${platform}`,{recursive:true});
fs.copyFileSync(`server/target/${target?target+'/':''}release/soplang-lsp${suffix}`,`bin/${platform}/soplang-lsp${suffix}`);
if (!suffix) fs.chmodSync(`bin/${platform}/soplang-lsp`,0o755);
