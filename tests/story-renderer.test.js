import test from 'node:test';
import assert from 'node:assert/strict';
import { headlineLines } from '../src/story-renderer.js';

test('headline is limited to four lines', () => {
  const lines = headlineLines('Ini adalah judul berita yang cukup panjang untuk diuji agar tidak memenuhi seluruh layar Story Instagram secara berlebihan');
  assert.ok(lines.length <= 4);
  assert.ok(lines.every(Boolean));
});
