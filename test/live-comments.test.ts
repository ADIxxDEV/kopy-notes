import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeVideoId, readSavedCommentConnection, resolveLiveCommentSource } from '../src/lib/live-comments';

const id='Abc_def-123';
test('YouTube video IDs and explicit watch/live/shortened links resolve without external requests',()=>{
  for(const value of [id,`https://www.youtube.com/watch?v=${id}&t=5`, `https://youtube.com/live/${id}?feature=share`,`https://youtu.be/${id}?si=abc`,`youtube.com/watch?v=${id}`,`https://m.youtube.com/watch?v=${id}`,`https://www.youtube.com/live_chat?v=${id}`])assert.equal(parseYouTubeVideoId(value),id,value);
  const source=resolveLiveCommentSource(`https://youtu.be/${id}`,'youtube','kopy-notes.netlify.app','https://kopy-notes.netlify.app');
  const url=new URL(source.url);assert.equal(url.origin,'https://www.youtube.com');assert.equal(url.pathname,'/live_chat');assert.equal(url.searchParams.get('v'),id);assert.equal(url.searchParams.get('embed_domain'),'kopy-notes.netlify.app');assert.equal(source.externalUrl,`https://www.youtube.com/watch?v=${id}`);
});
test('YouTube parsing rejects spoofed hosts, credentials, missing IDs and executable schemes',()=>{
  for(const value of ['not-an-id','https://youtube.com/@teacher/live',`https://youtube.com.evil.test/watch?v=${id}`,`https://evil.test/live/${id}`,`https://user:secret@youtube.com/watch?v=${id}`,`https://youtube.com:444/watch?v=${id}`,`javascript:${id}`,`https://youtu.be/${id}/extra`])assert.throws(()=>parseYouTubeVideoId(value),Error,value);
});
test('custom comment frames require external HTTPS URLs without credentials',()=>{
  const source=resolveLiveCommentSource(' https://comments.example/live?class=science ','url','board.example','https://board.example');assert.equal(source.url,'https://comments.example/live?class=science');assert.equal(source.label,'comments.example');
  for(const value of ['http://comments.example','javascript:alert(1)','data:text/html,hello','/comments','https://user:secret@comments.example','https://board.example/#/board/test'])assert.throws(()=>resolveLiveCommentSource(value,'url','board.example','https://board.example'),Error,value);
});
test('saved connections are configuration only and malformed local state is ignored',()=>{
  assert.deepEqual(readSavedCommentConnection(JSON.stringify({kind:'youtube',input:id})),{kind:'youtube',input:id});
  for(const value of [null,'invalid','null','[]','{"kind":"unknown","input":"url"}','{"kind":"youtube","input":12}',JSON.stringify({kind:'url',input:'x'.repeat(4097)})])assert.equal(readSavedCommentConnection(value),null);
});
