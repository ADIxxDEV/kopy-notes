import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function privacyFindings(name,source){
  const findings=[];
  if(/(?:^|\/)\.env(?:\.|$)|\.(?:jks|keystore|p12|pfx|pem)$|(?:^|\/)(?:key|local)\.properties$|google-services\.json$/i.test(name))findings.push('private configuration or signing file');
  if(/(?:[A-Z]:\\(?:Users|Documents and Settings)\\[A-Za-z0-9_. -]+\\|\/Users\/[A-Za-z0-9_.-]+\/|\/home\/[A-Za-z0-9_.-]+\/)/i.test(source))findings.push('personal machine path');
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source))findings.push('private key');
  if(/(?:AKIA|ASIA)[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}/.test(source))findings.push('credential pattern');
  if(/\b(?:password|api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"'\s]{16,}["']/i.test(source))findings.push('hardcoded credential candidate');
  return findings;
}
export function scanTree(root){
  const reports=[];const skip=new Set(['.git','node_modules','release','test-results','playwright-report','.vite','.gradle','build']);
  const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(entry.name))continue;const file=path.join(dir,entry.name),name=path.relative(root,file).split(path.sep).join('/');if(entry.isSymbolicLink()){reports.push({name,rules:['symbolic link in release source']});continue;}if(entry.isDirectory()){walk(file);continue;}if(!entry.isFile())continue;
    const fileRules=privacyFindings(name,'');if(fileRules.length){reports.push({name,rules:fileRules});continue;}
    if(!/\.(?:[cm]?[jt]sx?|json|html|css|md|svg|ya?ml|toml|txt|properties|pem|env)$|(?:^|\/)\.env(?:\.|$)/i.test(name))continue;
    const source=fs.readFileSync(file,'utf8');const rules=privacyFindings(name,source);if(source.includes('\0'))rules.push('NUL bytes in source');if(name.startsWith('dist/')&&/sourceMappingURL=/.test(source))rules.push('production source map reference');if(rules.length)reports.push({name,rules});
  }};walk(root);return reports;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),reports=scanTree(root);
  if(reports.length){for(const report of reports)console.error(`${report.name}: ${report.rules.join(', ')}`);process.exitCode=1;}else console.log('Source/build privacy scan passed. No matching credentials, personal paths or production source maps.');
}
