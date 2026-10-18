const fs=require('fs');
const platform=process.env.VSCE_TARGET || `${process.platform}-${process.arch}`;
const path=`bin/${platform}/soplang-lsp${platform.startsWith('win32')?'.exe':''}`;
if (!fs.existsSync(path)) throw Error(`Missing bundled server: ${path}. Run npm run build:server.`);
