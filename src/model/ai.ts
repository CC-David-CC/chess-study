import { Chess, type Move } from "chess.js";
import { Rng } from "./rng.ts";

const PIECE_VALUES: Readonly<Record<string, number>> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
};

/** Static evaluation from White's point of view. */
export function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? -1_000_000 : 1_000_000;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial()) return 0;
  let score = 0;
  for (const row of chess.board()) {
    for (const square of row) {
      if (square === null) continue;
      const value = PIECE_VALUES[square.type] ?? 0;
      score += square.color === "w" ? value : -value;
    }
  }
  return score;
}

export interface AiResult {
  move: Move;
  nodes: number;
  score: number;
}

export const DIFFICULTY_DEPTH = [1, 2, 3] as const;
export const DIFFICULTY_NODE_BUDGET = [40, 400, 2_500] as const;

/**
 * Bounded negamax with alpha-beta pruning, seeded move shuffling, a hard node
 * budget and an optional wall-clock deadline. This is the local opponent; the
 * worker transport around it is described in src/ai/worker.ts.
 */
export function chooseAiMove(
  chess: Chess,
  difficulty: 1 | 2 | 3,
  rng: Rng,
  options: { nodeBudget?: number; deadlineMs?: number } = {},
): AiResult | null {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const depth = DIFFICULTY_DEPTH[difficulty - 1];
  const nodeBudget = options.nodeBudget ?? DIFFICULTY_NODE_BUDGET[difficulty - 1];
  const deadline = options.deadlineMs === undefined ? Infinity : Date.now() + options.deadlineMs;
  let nodes = 0;
  let aborted = false;

  // Seeded shuffle gives equal-rated choices a stable order for testing.
  for (let i = moves.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    const a = moves[i];
    moves[i] = moves[j];
    moves[j] = a;
  }

  const negamax = (alpha: number, beta: number, ply: number): number => {
    nodes += 1;
    if (nodes >= nodeBudget || Date.now() >= deadline) {
      aborted = true;
      return evaluate(chess);
    }
    if (ply === 0 || chess.isGameOver()) return evaluate(chess);
    let best = -Infinity;
    for (const move of chess.moves({ verbose: true })) {
      chess.move(move);
      const score = -negamax(-beta, -alpha, ply - 1);
      chess.undo();
      if (aborted) return score;
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  };

  let bestMove: Move | null = null;
  let bestScore = -Infinity;
  for (const move of moves) {
    chess.move(move);
    const score = -negamax(-Infinity, Infinity, depth - 1);
    chess.undo();
    if (bestMove === null || score > bestScore) {
      bestMove = move;
      bestScore = score;
    }
    if (aborted && bestMove !== null) break;
  }
  if (bestMove === null) return null;
  return { move: bestMove, nodes, score: bestScore };
}
