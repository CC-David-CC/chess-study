import {Chess} from 'chess.js';
import {chooseAiMove} from '../model/ai.js';
import {Rng} from '../model/rng.js';

interface SearchRequest {
  id: number;
  revision: number;
  fen: string;
  difficulty: 1|2|3;
  seed: number;
  deadlineMs: number;
}

self.onmessage = ({data}: MessageEvent<SearchRequest>) => {
  try {
    const chess=new Chess(data.fen);
    const result=chooseAiMove(chess,data.difficulty,new Rng(data.seed),{
      nodeBudget:[40,400,2500][data.difficulty-1],
      deadlineMs:data.deadlineMs,
    });
    self.postMessage({
      id:data.id,
      revision:data.revision,
      from:result?.move.from??null,
      to:result?.move.to??null,
      promotion:result?.move.promotion??null,
      nodes:result?.nodes??0,
    });
  }catch(error){
    self.postMessage({id:data.id,revision:data.revision,error:error instanceof Error?error.message:'AI search failed'});
  }
};
