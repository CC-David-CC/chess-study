import { describe, expect, it } from "vitest";
import { ChessStudySession } from "../src/model/chessSession.js";
import {
  decodeSave,
  encodeSave,
  SaveError,
  sessionFromSave,
} from "../src/model/save.js";

describe("Chess Study save codec", () => {
  it("round-trips starting FEN, history and revision", () => {
    const session = ChessStudySession.startGame("w", 2, "roundtrip");
    session.move("e2", "e4");
    session.move("c7", "c5");
    const restored = sessionFromSave(decodeSave(encodeSave(session)));
    expect(restored.snapshot()).toEqual(session.snapshot());
  });

  it("rejects a history that does not reproduce the current FEN", () => {
    const text = encodeSave(ChessStudySession.startGame("w", 1));
    const tampered = JSON.parse(text) as { payload: { history: string[] } };
    tampered.payload.history = ["e4"];
    expect(() => decodeSave(JSON.stringify(tampered))).toThrow(SaveError);
  });

  it("rejects wrong-app documents", () => {
    const text = encodeSave(ChessStudySession.startGame("w", 1));
    const wrongApp = JSON.parse(text) as Record<string, unknown>;
    wrongApp.appId = "snake-garden";
    expect(() => decodeSave(JSON.stringify(wrongApp))).toThrow(SaveError);
  });
});
