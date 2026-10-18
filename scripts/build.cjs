const esbuild = require('esbuild');
esbuild.buildSync({entryPoints:['src/extension.ts'],bundle:true,platform:'node',format:'cjs',target:'node20',external:['vscode'],outfile:'out/extension.js',sourcemap:false,minify:true,supported:{"template-literal":false}});
