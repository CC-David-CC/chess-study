import { Chess } from "chess.js";
import { ChessStudySession, type ChessSnapshot } from "./chessSession.ts";

export const SAVE_FORMAT = "ksu.game.save";
export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_APP_ID = "chess-study";
export const DEFAULT_MAX_SAVE_BYTES = 8 * 1024 * 1024;

export interface ChessSaveEnvelope {
  format: typeof SAVE_FORMAT;
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  appId: typeof SAVE_APP_ID;
  kind: "logical-snapshot";
  gameBuild: string;
  contentVersion: string;
  payload: ChessSnapshot;
}

export class SaveError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`chess-study save rejected: ${reason}`);
    this.reason = reason;
    this.name = "SaveError";
  }
}

function fail(reason: string): never {
  throw new SaveError(reason);
}

export function validateSnapshot(value: unknown): asserts value is ChessSnapshot {
  if (typeof value !== "object" || value === null) fail("payload is not an object");
  const s = value as Record<string, unknown>;
  if (typeof s.initialFen !== "string" || typeof s.currentFen !== "string") fail("missing FENs");
  if (!Array.isArray(s.history) || !s.history.every((move) => typeof move === "string")) {
    fail("invalid move history");
  }
  if (s.side !== "w" && s.side !== "b") fail("invalid side");
  if (s.difficulty !== 1 && s.difficulty !== 2 && s.difficulty !== 3) fail("invalid difficulty");
  if (s.exerciseId !== null && typeof s.exerciseId !== "string") fail("invalid exercise id");
  if (!Array.isArray(s.solvedSet) || !s.solvedSet.every((id) => typeof id === "string")) {
    fail("invalid solved set");
  }
  if (
    typeof s.rngState !== "number" ||
    !Number.isFinite(s.rngState) ||
    typeof s.revision !== "number" ||
    !Number.isInteger(s.revision) ||
    s.revision < 0
  ) {
    fail("invalid counters");
  }
  if (
    s.result !== "playing" &&
    s.result !== "checkmate" &&
    s.result !== "draw" &&
    s.result !== "exercise-solved"
  ) {
    fail("invalid result");
  }
  try {
    const chess = new Chess(s.initialFen);
    for (const move of s.history) chess.move(move);
    if (chess.fen() !== s.currentFen) fail("history does not reproduce current FEN");
  } catch {
    fail("invalid FEN or history");
  }
}

export function encodeSave(session: ChessStudySession): string {
  const envelope: ChessSaveEnvelope = {
    format: SAVE_FORMAT,
    schemaVersion: SAVE_SCHEMA_VERSION,
    appId: SAVE_APP_ID,
    kind: "logical-snapshot",
    gameBuild: "unbound",
    contentVersion: "1",
    payload: session.snapshot(),
  };
  return JSON.stringify(envelope);
}

export function decodeSave(
  text: string,
  maxBytes: number = DEFAULT_MAX_SAVE_BYTES,
): ChessSaveEnvelope {
  if (text.length > maxBytes) fail("document exceeds the size limit");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail("document is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) fail("document is not an object");
  const envelope = parsed as Record<string, unknown>;
  if (envelope.format !== SAVE_FORMAT) fail("unknown format");
  if (envelope.schemaVersion !== SAVE_SCHEMA_VERSION) fail("unsupported schema version");
  if (envelope.appId !== SAVE_APP_ID) fail("wrong app id");
  if (envelope.kind !== "logical-snapshot") fail("unexpected kind");
  validateSnapshot(envelope.payload);
  return envelope as unknown as ChessSaveEnvelope;
}

export function sessionFromSave(envelope: ChessSaveEnvelope): ChessStudySession {
  return new ChessStudySession(envelope.payload);
}
