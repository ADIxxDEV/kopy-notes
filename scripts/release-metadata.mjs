import {createHash} from 'node:crypto';
import {appendFileSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function releaseMetadata(version, ref) {
  if (!/^\d+\.\d+\.\d+(?:-dev\.\d+)?$/.test(version)) {
    throw new Error('Release versions must be X.Y.Z or X.Y.Z-dev.N.');
  }
  if (ref !== `refs/tags/v${version}`) {
    throw new Error('Select a version tag for manual dispatch; its tag must match package.json. Branch releases are not allowed.');
  }
  return {version, development: version.includes('-dev.')};
}

export function writeReleaseAssets(directory, metadata) {
  const android = metadata.development ? 'debug' : 'signed';
  const expected = [
    `kopy-notes-${metadata.version}-android-${android}.apk`,
    `kopy-notes-${metadata.version}-web.zip`,
    `kopy-notes-${metadata.version}-windows-unsigned.exe`,
  ].sort();
  const actual = readdirSync(directory).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected exactly the APK, web ZIP and unsigned EXE. Found: ${actual.join(', ')}`);
  }
  const sums = expected.map(name => `${createHash('sha256').update(readFileSync(path.join(directory, name))).digest('hex')}  ${name}`).join('\n');
  writeFileSync(path.join(directory, 'SHA256SUMS.txt'), `${sums}\n`);
  const androidNotice = metadata.development
    ? 'Android APK is a development debug build signed with a temporary debug key. It is not signed with the stable release key. Debug builds from different workflow runs may require uninstalling the previous app; export your notes before uninstalling.'
    : 'Android APK is signed with the configured stable Android release key.';
  writeFileSync('release-notes.md', `Preview release for testing.\n\n${androidNotice}\n\nWindows installer is unsigned; Windows may show a SmartScreen warning. Neither Android nor Windows artifacts are claimed to be production trusted or store approved.\n\nThe web ZIP contains the built web app and project documentation. SHA256SUMS.txt covers the APK, EXE and web ZIP. Download all three files to the same directory and run \`sha256sum -c SHA256SUMS.txt\` to verify them.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const {version} = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const metadata = releaseMetadata(version, process.env.GITHUB_REF);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${metadata.version}\ndevelopment=${metadata.development}\n`);
  }
  if (process.argv[2]) writeReleaseAssets(process.argv[2], metadata);
  console.log(`Validated ${metadata.development ? 'development debug' : 'stable signed'} release: v${version}`);
}
