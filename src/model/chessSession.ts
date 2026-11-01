import { Chess, type Move } from "chess.js";
import { exerciseById } from "./exercises.js";
import { Rng } from "./rng.js";

export type Difficulty = 1 | 2 | 3;
export type PlayerSide = "w" | "b";
export type GameResult = "playing" | "checkmate" | "draw" | "exercise-solved";

export interface AiReply {
  revision: number;
  from: string;
  to: string;
  promotion?: string;
}

export interface MoveOutcome {
  ok: boolean;
  san: string | null;
  reason: string | null;
  result: GameResult;
}

export interface ChessSnapshot {
  initialFen: string;
  currentFen: string;
  history: string[];
  side: PlayerSide;
  difficulty: Difficulty;
  exerciseId: string | null;
  solvedSet: string[];
  rngState: number;
  revision: number;
  result: GameResult;
}

export class ChessStudySession {
  private chess: Chess;
  private readonly rng = new Rng("chess-study");
  initialFen = "";
  history: string[] = [];
  side: PlayerSide = "w";
  difficulty: Difficulty = 2;
  exerciseId: string | null = null;
  solvedSet: string[] = [];
  revision = 0;
  result: GameResult = "playing";

  constructor(snapshot?: ChessSnapshot) {
    this.chess = new Chess();
    if (snapshot !== undefined) {
      this.applySnapshot(snapshot);
      return;
    }
    this.initialFen = this.chess.fen();
  }

  static startGame(side: PlayerSide, difficulty: Difficulty, seed: string | number = "chess-study"): ChessStudySession {
    const session = new ChessStudySession();
    session.side = side;
    session.difficulty = difficulty;
    session.rng.setState(new Rng(seed).getState());
    return session;
  }

  static startExercise(exerciseId: string, difficulty: Difficulty): ChessStudySession {
    const exercise = exerciseById(exerciseId);
    const session = new ChessStudySession();
    session.chess = new Chess(exercise.fen);
    session.initialFen = exercise.fen;
    session.exerciseId = exerciseId;
    session.side = exercise.side;
    session.difficulty = difficulty;
    session.result = "playing";
    return session;
  }

  get turn(): "w" | "b" {
    return this.chess.turn();
  }

  fen(): string {
    return this.chess.fen();
  }

  isAiTurn(): boolean {
    return this.result === "playing" && this.exerciseId === null && this.chess.turn() !== this.side;
  }

  legalMoves(): Move[] {
    return this.chess.moves({ verbose: true });
  }

  get check(): boolean {
    return this.chess.inCheck();
  }

  move(from: string, to: string, promotion?: string): MoveOutcome {
    if (this.result !== "playing") {
      return { ok: false, san: null, reason: "game already finished", result: this.result };
    }
    let applied: Move;
    try {
      applied = this.chess.move({ from, to, promotion });
    } catch (error) {
      return {
        ok: false,
        san: null,
        reason: error instanceof Error ? error.message : "illegal move",
        result: this.result,
      };
    }
    this.history.push(applied.san);
    this.revision += 1;
    this.afterMove();
    return { ok: true, san: applied.san, reason: null, result: this.result };
  }

  /** Only a reply matching the current revision may be adopted; it is re-validated anyway. */
  acceptAiMove(reply: AiReply): MoveOutcome {
    if (reply.revision !== this.revision) {
      return { ok: false, san: null, reason: "stale AI reply", result: this.result };
    }
    if (!this.isAiTurn()) {
      return { ok: false, san: null, reason: "not the AI turn", result: this.result };
    }
    return this.move(reply.from, reply.to, reply.promotion);
  }

  /** Undo removes a complete human/AI pair when one is available. */
  undo(): boolean {
    if (this.exerciseId !== null || this.history.length < 2) return false;
    const remaining = this.history.slice(0, -2);
    this.chess = this.reconstruct(remaining);
    this.history = remaining;
    this.revision += 1;
    this.result = "playing";
    return true;
  }

  hint(): string | null {
    if (this.result !== "playing") return null;
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;
    // Deterministic, non-AI hint: prefer checkmate, then capture, then first move.
    const mate = moves.find((move) => {
      const probe = new Chess(this.chess.fen());
      probe.move(move);
      return probe.isCheckmate();
    });
    const capture = moves.find((move) => move.captured !== undefined);
    return (mate ?? capture ?? moves[0]).san;
  }

  private afterMove(): void {
    const exercise = this.exerciseId === null ? null : exerciseById(this.exerciseId);
    if (exercise !== null) {
      const solution = exercise.solution;
      const matchesPrefix = solution.every((san, index) => this.history[index] === san);
      if (matchesPrefix && this.history.length === solution.length) {
        this.solvedSet.push(exercise.id);
        this.result = "exercise-solved";
        return;
      }
      if (!matchesPrefix) {
        this.result = "playing"; // wrong line: exercise stays open for retry/undo
        return;
      }
    }
    if (this.chess.isCheckmate()) {
      this.result = "checkmate";
    } else if (
      this.chess.isDraw() ||
      this.chess.isStalemate() ||
      this.chess.isThreefoldRepetition() ||
      this.chess.isInsufficientMaterial()
    ) {
      this.result = "draw";
    }
  }

  reconstruct(history: string[]): Chess {
    const chess = new Chess(this.initialFen);
    for (const san of history) chess.move(san);
    return chess;
  }

  snapshot(): ChessSnapshot {
    return {
      initialFen: this.initialFen,
      currentFen: this.chess.fen(),
      history: [...this.history],
      side: this.side,
      difficulty: this.difficulty,
      exerciseId: this.exerciseId,
      solvedSet: [...this.solvedSet],
      rngState: this.rng.getState(),
      revision: this.revision,
      result: this.result,
    };
  }

  applySnapshot(snapshot: ChessSnapshot): void {
    this.initialFen = snapshot.initialFen;
    this.history = [...snapshot.history];
    this.chess = this.reconstruct(this.history);
    if (this.chess.fen() !== snapshot.currentFen) {
      throw new Error("snapshot history does not reproduce the current FEN");
    }
    this.side = snapshot.side;
    this.difficulty = snapshot.difficulty;
    this.exerciseId = snapshot.exerciseId;
    this.solvedSet = [...snapshot.solvedSet];
    this.rng.setState(snapshot.rngState);
    this.revision = snapshot.revision;
    this.result = snapshot.result;
  }
}
