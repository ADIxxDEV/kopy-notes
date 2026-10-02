"""Create web and source archives after npm run build."""
from pathlib import Path
import hashlib
import json
import zipfile

root=Path(__file__).resolve().parents[1]
if not (root/'dist/index.html').is_file():
 raise SystemExit('Run npm run build first.')
output=root/'release';output.mkdir(exist_ok=True)
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
web=output/f'kopy-notes-web-{version}.zip'
source=output/f'kopy-notes-source-{version}.zip'
with zipfile.ZipFile(web,'w',zipfile.ZIP_DEFLATED) as archive:
 for directory in ['dist','docs']:
  for path in (root/directory).rglob('*'):
   if path.is_file():archive.write(path,path.relative_to(root))
 for name in ['LICENSE','README.md','THIRD_PARTY.md']:
  archive.write(root/name,name)
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as archive:
 for directory in ['src','public','branding','desktop','docs','scripts','test','.github']:
  for path in (root/directory).rglob('*'):
   if path.is_file() and '__pycache__' not in path.parts:
    archive.write(path,Path('kopy-notes')/path.relative_to(root))
 for name in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','capacitor.config.ts','playwright.config.ts','index.html','LICENSE','README.md','THIRD_PARTY.md','CHANGELOG.md','CONTRIBUTING.md','SECURITY.md','.gitignore']:
  archive.write(root/name,Path('kopy-notes')/name)
(output/'SHA256SUMS.txt').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name for p in [web,source])+'\n',encoding='utf-8')
print('Prepared web/source archives and SHA256SUMS.txt')
