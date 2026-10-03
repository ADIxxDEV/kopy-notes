import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {releaseMetadata, writeReleaseAssets} from './release-metadata.mjs';

test('release tags distinguish development and stable, and reject unsafe dispatch refs', () => {
  assert.deepEqual(releaseMetadata('0.2.0-dev.2', 'refs/tags/v0.2.0-dev.2'), {version: '0.2.0-dev.2', development: true});
  assert.equal(releaseMetadata('0.2.0', 'refs/tags/v0.2.0').development, false);
  for (const ref of [undefined, 'refs/heads/main', 'refs/tags/v0.2.0', 'refs/tags/v0.2.0-dev.1']) {
    assert.throws(() => releaseMetadata('0.2.0-dev.2', ref), /tag/);
  }
  assert.throws(() => releaseMetadata('0.2.0-beta.1', 'refs/tags/v0.2.0-beta.1'), /versions/);
});

test('release assets require all three platforms and generate matching checksums and signing notices', () => {
  const original = process.cwd();
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'kopy-release-test-'));
  try {
    process.chdir(temporary);
    for (const development of [true, false]) {
      const version = development ? '0.2.0-dev.2' : '0.2.0';
      const folder = path.join(temporary, version);
      mkdirSync(folder);
      const apk = `kopy-notes-${version}-android-${development ? 'debug' : 'signed'}.apk`;
      const names = [apk, `kopy-notes-${version}-windows-unsigned.exe`, `kopy-notes-${version}-web.zip`];
      writeFileSync(path.join(folder, apk), 'APK fixture');
      assert.throws(() => writeReleaseAssets(folder, {version, development}), /exactly/);
      for (const name of names) writeFileSync(path.join(folder, name), name);
      writeReleaseAssets(folder, {version, development});
      const sums = readFileSync(path.join(folder, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
      assert.equal(sums.length, 3);
      for (const line of sums) {
        const [sum, name] = line.split('  ');
        assert.equal(sum, createHash('sha256').update(readFileSync(path.join(folder, name))).digest('hex'));
      }
      const notes = readFileSync('release-notes.md', 'utf8');
      assert.match(notes, /Windows installer is unsigned/);
      assert.match(notes, development ? /temporary debug key/ : /configured stable Android release key/);
      if (development) assert.doesNotMatch(notes, /APK is signed with the configured stable/);
      writeFileSync(path.join(folder, 'unexpected.txt'), 'extra');
      assert.throws(() => writeReleaseAssets(folder, {version, development}), /exactly/);
    }
  } finally {
    process.chdir(original);
    rmSync(temporary, {recursive: true, force: true});
  }
});
