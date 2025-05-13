const vscode = require('vscode');

function extractFunctionSignatures(document) {
  const text = document.getText();
  const functionRegex = /hawl\s+(\w+)\s*\(([^)]*)\)/g;
  const signatures = [];

  let match;
  while ((match = functionRegex.exec(text)) !== null) {
    const functionName = match[1];
    const params = match[2].split(',').map(param => param.trim()).filter(Boolean);
    signatures.push({ functionName, params });
  }

  return signatures;
}

function provideSoplangSignatureHelp(document, position, token, context) {

  console.log("Soplang signatureHelp");

  const line = document.lineAt(position.line).text.substring(0, position.character);
  const functionCallMatch = /(\w+)\s*\([^\)]*$/.exec(line);
  if (!functionCallMatch) {
    return null;
  }

  const functionName = functionCallMatch[1];
  const allSignatures = extractFunctionSignatures(document);
  const matchedSignature = allSignatures.find(sig => sig.functionName === functionName);

  if (!matchedSignature) {
    return null;
  }

  const signature = new vscode.SignatureInformation(
    `${functionName}(${matchedSignature.params.join(', ')})`
  );

  signature.parameters = matchedSignature.params.map(param => 
    new vscode.ParameterInformation(param)
  );

  const signatureHelp = new vscode.SignatureHelp();
  signatureHelp.signatures = [signature];
  signatureHelp.activeSignature = 0;

  // Count commas to determine the active parameter
  const commaCount = line.split(',').length - 1;
  signatureHelp.activeParameter = Math.min(commaCount, matchedSignature.params.length - 1);

  return signatureHelp;
} 


module.exports = {
  provideSoplangSignatureHelp,
};
