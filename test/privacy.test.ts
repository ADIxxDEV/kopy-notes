import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Local scanner is a JavaScript build utility.
import {privacyFindings} from '../scripts/check-privacy.mjs';
test('privacy scanner identifies sensitive file names and paths without exposing their content',()=>{
  assert.ok(privacyFindings('.env.local','').length);assert.ok(privacyFindings('android/release.jks','').length);
  assert.ok(privacyFindings('source.ts',['C:','Users','Alice','Documents','private'].join('\\')).length);
  assert.ok(privacyFindings('source.ts',['-----BEGIN ','PRIVATE KEY-----'].join('')).length);
  assert.deepEqual(privacyFindings('worker.js','virtual fs home is /home/web_user'),[]);
});
