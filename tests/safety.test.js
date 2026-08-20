import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAccount, isSensitive, isDuplicate, assertDryRunDoesNotPublish } from '../src/safety.js';

test('account mismatch blocks', () => assert.throws(() => assertAccount('other'), /BLOCKED_ACCOUNT_NOT_CONFIRMED/));
test('sensitive filter catches explicit graphic terms', () => assert.equal(isSensitive({ title: 'Foto korban tewas ditemukan', excerpt: '', category: '' }), true));
test('duplicate guard detects published article', () => assert.equal(isDuplicate({ articleId: '1' }, { articles: { '1': { status: 'published' } } }), true));
test('dry run cannot publish', () => assert.throws(() => assertDryRunDoesNotPublish(true, 1), /DRY_RUN_PUBLISH_VIOLATION/));
test('live run allows at most one click', () => assert.throws(() => assertDryRunDoesNotPublish(false, 2), /SINGLE_PUBLISH_GUARD_VIOLATION/));
