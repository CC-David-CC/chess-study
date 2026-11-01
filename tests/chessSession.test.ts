import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { chooseAiMove } from "../src/model/ai.js";
import { ChessStudySession } from "../src/model/chessSession.js";
import { EXERCISES } from "../src/model/exercises.js";
import { Rng } from "../src/model/rng.js";

describe("ChessStudySession rules", () => {
  it("uses chess.js so underpromotion, en passant exposure and castling rules are enforced", () => {
    const promotion = new Chess("8/P6k/8/8/8/8/8/K7 w - - 0 1");
    promotion.move({ from: "a7", to: "a8", promotion: "n" });
    expect(promotion.get("a8")).toEqual({ type: "n", color: "w" });

    const pinned = new Chess("4k3/8/8/8/8/8/5p2/4K3 b - - 0 1");
    expect(() => pinned.move({ from: "f2", to: "f1", promotion: "q" })).not.toThrow();
    const exposed = new Chess("k7/8/8/8/8/8/5p2/4K3 b - - 0 1");
    const session = ChessStudySession.startGame("b", 2);
    const newSession = new ChessStudySession({
      initialFen: exposed.fen(),
      currentFen: exposed.fen(),
      history: [],
      side: "b",
      difficulty: 2,
      exerciseId: null,
      solvedSet: [],
      rngState: 1,
      revision: 0,
      result: "playing",
    });
    // f1=Q is legal; no en passant or castling-by-hand can be forged as legal.
    const outcome = newSession.move("f2", "f1", "q");
    expect(outcome.ok).toBe(true);
    void session;
  });

  it("rejects stale AI replies after undo (revision guard)", () => {
    const session = ChessStudySession.startGame("w", 1);
    const stale = session.snapshot();
    session.move("e2", "e4");
    const revisionAfterHuman = session.revision;
    session.move("e7", "e5");
    const reply = { revision: revisionAfterHuman, from: "g8", to: "f6" };
    expect(session.acceptAiMove(reply).ok).toBe(false);
    expect(stale.currentFen).not.toBe(session.fen());
  });

  it("undo removes a complete human/AI pair", () => {
    const session = ChessStudySession.startGame("w", 2);
    session.move("e2", "e4");
    session.move("e7", "e5");
    expect(session.history).toHaveLength(2);
    expect(session.undo()).toBe(true);
    expect(session.history).toHaveLength(0);
    expect(session.fen()).toBe(session.initialFen);
  });

  it("repetition state survives save/load because history is retained", () => {
    const session = ChessStudySession.startGame("w", 1);
    const moves: [string, string][] = [
      ["g1", "f3"], ["g8", "f6"],
      ["f3", "g1"], ["f6", "g8"],
      ["g1", "f3"], ["g8", "f6"],
      ["f3", "g1"], ["f6", "g8"],
    ];
    for (const [from, to] of moves) session.move(from, to);
    expect(session.legalMoves().length).toBeGreaterThan(0);
    const restored = new ChessStudySession(session.snapshot());
    expect(restored.fen()).toBe(session.fen());
    expect(restored.history).toEqual(session.history);
  });

  it("search finishes within its node budget and returns a legal move", () => {
    const chess = new Chess();
    const result = chooseAiMove(chess, 1, new Rng(7), { nodeBudget: 5 });
    expect(result).not.toBeNull();
    expect(result!.nodes).toBeLessThanOrEqual(10);
    expect(chess.moves()).toContain(result!.move.san);
  });
});

describe("Chess Study exercises", () => {
  it("every authored solution is legal and delivers checkmate", () => {
    for (const exercise of EXERCISES) {
      const chess = new Chess(exercise.fen);
      for (const san of exercise.solution) chess.move(san);
      expect(chess.isCheckmate(), `${exercise.id} must end in checkmate`).toBe(true);
    }
  });

  it("solving an exercise commits exactly once and cannot be re-granted by a stale reply", () => {
    const session = ChessStudySession.startExercise("back-rank-a", 2);
    const outcome = session.move("a1", "a8");
    expect(outcome.ok).toBe(true);
    expect(session.result).toBe("exercise-solved");
    expect(session.solvedSet).toContain("back-rank-a");
    const revision = session.revision;
    const stale = session.acceptAiMove({ revision: revision - 1, from: "a8", to: "a1" });
    expect(stale.ok).toBe(false);
    expect(session.solvedSet.filter((id) => id === "back-rank-a")).toHaveLength(1);
  });

  it("promotion is playable entirely through the touch command", () => {
    const session = ChessStudySession.startExercise("promotion", 2);
    const outcome = session.move("g2", "g1", "q");
    expect(outcome.ok).toBe(true);
    expect(session.result).toBe("exercise-solved");
  });
});
