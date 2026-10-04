import test from 'node:test';
import assert from 'node:assert/strict';
import type {Page, MediaItem} from '../src/db/schema';
import {exportPageBounds, exportMediaBounds, exportRasterSize, exportFilename, EXPORT_MAX_DIMENSION, EXPORT_MAX_PIXELS} from '../src/lib/lesson-export';

const blank: Page = {id: 'p', notebookId: 'n', position: 0, background: '#ffffff', pattern: 'none', objects: [], media: [], createdAt: new Date(), updatedAt: new Date()};
const media: MediaItem = {id: 'm', kind: 'image', assetId: 'a', x: 100, y: 200, width: 200, height: 400, rotation: Math.PI / 2, pageNumber: 1};

test('full export bounds retain a portrait frame, distant negative content and rotated media', () => {
  assert.deepEqual(exportPageBounds({...blank, importFrame: {x: 0, y: 0, width: 400, height: 800}}), {x: 0, y: 0, w: 400, h: 800});
  const rotation = exportMediaBounds(media);
  assert.ok(Math.abs(rotation.w - 400) < 1e-9); assert.ok(Math.abs(rotation.h - 200) < 1e-9);
  assert.ok(Math.abs(rotation.x) < 1e-9); assert.equal(rotation.y, 300);
  const bounds = exportPageBounds({...blank, importFrame: {x: 0, y: 0, width: 400, height: 800}, media: [media], objects: [{id: 'ink', kind: 'stroke', tool: 'pen', color: '#000000', width: 8, points: [{x: -9000, y: -8000}, {x: -8800, y: -7800}]}]});
  assert.equal(bounds.x, -9036); assert.equal(bounds.y, -8036);
  assert.ok(bounds.x + bounds.w >= 400); assert.ok(bounds.y + bounds.h >= 800);
  assert.deepEqual(exportPageBounds(blank), {x: 0, y: 0, w: 1280, h: 720});
});

test('raster sizes are bounded across tiny, portrait, square and huge pages without stretching', () => {
  for (const [w, h] of [[1280, 720], [400, 800], [100000, 100000], [1, 1], [100000, 200]]) {
    const size = exportRasterSize({w, h});
    assert.ok(size.width >= 1 && size.height >= 1);
    assert.ok(Math.max(size.width, size.height) <= EXPORT_MAX_DIMENSION);
    assert.ok(size.width * size.height <= EXPORT_MAX_PIXELS);
    if (w === 400) assert.equal(size.height / size.width, 2);
  }
  assert.throws(() => exportRasterSize({w: Infinity, h: 800}), /Invalid/);
  assert.throws(() => exportPageBounds({...blank, media: [{...media, width: NaN}]}), /invalid/);
});

test('download filenames distinguish the complete lesson and current page and remove unsafe characters', () => {
  assert.equal(exportFilename('Geometry lesson', 'all'), 'Geometry lesson.pdf');
  assert.equal(exportFilename('Geometry lesson', 'current', 4), 'Geometry lesson-p4.pdf');
  assert.equal(exportFilename('A/B: C?', 'all'), 'A-B- C-.pdf');
  assert.equal(exportFilename('  ... ', 'all'), 'lesson.pdf');
});
