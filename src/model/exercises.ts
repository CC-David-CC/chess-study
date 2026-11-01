import type { PlayerSide } from "./chessSession.js";

export interface Exercise {
  id: string;
  name: string;
  fen: string;
  /** Authored solution in SAN; validated against chess.js by the test suite. */
  solution: string[];
  side: PlayerSide;
}

export const EXERCISES: readonly Exercise[] = [
  {
    id: "back-rank-a",
    name: "Back-rank finish A",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    solution: ["Ra8#"],
    side: "w",
  },
  {
    id: "back-rank-b",
    name: "Back-rank finish B",
    fen: "5k2/8/5K2/8/8/8/8/R7 w - - 0 1",
    solution: ["Ra8#"],
    side: "w",
  },
  {
    id: "corner",
    name: "Corner mate",
    fen: "k7/8/1K6/8/8/8/8/7R w - - 0 1",
    solution: ["Rh8#"],
    side: "w",
  },
  {
    id: "king-cover",
    name: "King covers the flight squares",
    fen: "6k1/8/6K1/8/8/8/8/R7 w - - 0 1",
    solution: ["Ra8#"],
    side: "w",
  },
  {
    id: "promotion",
    name: "Promotion mate",
    fen: "8/8/8/8/8/8/6pp/5k1K b - - 0 1",
    solution: ["g1=Q#"],
    side: "b",
  },
  {
    id: "smothered",
    name: "Smothered knight",
    fen: "6rk/6pp/7N/8/8/8/8/6KR w - - 0 1",
    solution: ["Nf7#"],
    side: "w",
  },
  {
    id: "two-rooks",
    name: "Lone rook to the edge",
    fen: "4k3/8/4K3/8/8/8/8/R7 w - - 0 1",
    solution: ["Ra8#"],
    side: "w",
  },
  {
    id: "rook-lift",
    name: "Rook lift",
    fen: "1k6/8/1K6/8/8/8/8/4R3 w - - 0 1",
    solution: ["Re8#"],
    side: "w",
  },
];

export function exerciseById(id: string): Exercise {
  const exercise = EXERCISES.find((candidate) => candidate.id === id);
  if (exercise === undefined) throw new Error(`unknown exercise ${id}`);
  return exercise;
}
