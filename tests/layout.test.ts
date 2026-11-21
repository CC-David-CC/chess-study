import { describe, it } from './test-shim.ts';
import assert from 'node:assert/strict';
import { computeLayout } from '../src/view/run.ts';
import { ChessStudySession } from '../src/model/chessSession.ts';

describe('Chess Study dynamic layout metrics', () => {
  it('computes compact metrics for phone viewport (< 768px)', () => {
    const layout = computeLayout(360, 640, 3);
    assert.strictEqual(layout.tier, 'phone');
    assert.ok(layout.boardSize >= 280, 'board size should satisfy minimum');
    assert.ok(layout.cell > 0, 'cells have positive dimension');
    assert.ok(layout.pieceFont.includes('px'), 'font defined in px');
    assert.ok(layout.targetBuffer === Math.round(layout.boardSize * 3), 'HiDPI buffer matches DPR');
  });

  it('computes comfortable metrics for 1080p desktop', () => {
    const layout = computeLayout(1024, 768, 1);
    assert.strictEqual(layout.tier, 'desktop');
    assert.ok(layout.boardSize >= 512, 'desktop board should be spacious');
    assert.ok(layout.cell >= 60, 'desktop square size is comfortably playable');
  });

  it('computes crisp metrics for 4K UHD viewports (>= 2560px)', () => {
    const layout = computeLayout(3840, 2160, 2);
    assert.strictEqual(layout.tier, '4k');
    assert.ok(layout.boardSize >= 1000, '4K board is ultra-high resolution');
    assert.ok(layout.targetBuffer >= 2000, 'backing buffer scales with 4K display');
  });

  it('verifies game state and FEN integrity during mid-game resizing', () => {
    const session = ChessStudySession.startGame('w', 2, 42);
    session.move({ from: 'e2', to: 'e4' });
    const fenBefore = session.fen();
    const historyBefore = [...session.history];

    // Resize across multiple tiers
    computeLayout(360, 640, 3);
    computeLayout(1920, 1080, 1);
    computeLayout(3840, 2160, 2);

    assert.strictEqual(session.fen(), fenBefore);
    assert.deepStrictEqual(session.history, historyBefore);
  });
});
