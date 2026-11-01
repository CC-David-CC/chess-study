import {Chess,type Square} from 'chess.js';
import {SynthAudio} from '../audio/synth.js';
import {ChessStudySession,type Difficulty,type PlayerSide} from '../model/chessSession.js';
import {EXERCISES,exerciseById} from '../model/exercises.js';
import {decodeSave,encodeSave,sessionFromSave} from '../model/save.js';

interface Host{
 signal:AbortSignal;
 w?:{title?:string;ownerSub?:string;launchContext?:{version:1;storage:'mirror';path:string;owner:string};chessStudy?:{dirty:boolean}};
 ui:{make(tag:string,className?:string,text?:string):HTMLElement;textButton(label:string,action:()=>void):HTMLButtonElement;appInput(label:string,value?:string):HTMLInputElement;confirm(message:string,options?:Record<string,unknown>):Promise<boolean>};
 storage:{signedInSubject():string;mirrorFileContext():Promise<{owner:string;valid():boolean;path(value:string):string;name(value:string):string;files:{read(path:string):Promise<{data:Uint8Array;version:string;status?:string}>;write(path:string,data:Uint8Array|string,version:string|null):Promise<{version:string;status?:string}>;stat?(path:string):Promise<{version:string;status?:string}>;subscribe?(callback:()=>void):()=>void;sync():Promise<unknown>}}>;pickFile(options:{extensions:string[];signal?:AbortSignal}):Promise<string|null>;pickFolder(options:{signal?:AbortSignal}):Promise<string|null>};
}

export interface ViewHandle{dispose():void}
type WorkerFactory=()=>Worker;
const FILES='abcdefgh';
const GLYPHS:Record<string,string>={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};

export async function startView(container:HTMLElement,signal:AbortSignal,host:Host,createWorker:WorkerFactory):Promise<ViewHandle>{
 const doc=container.ownerDocument,{make,textButton,appInput}=host.ui,owner=host.storage.signedInSubject();
 if(host.w)host.w.ownerSub=owner;
 const windowState=host.w?.chessStudy??{dirty:false};if(host.w)host.w.chessStudy=windowState;
 let session:ChessStudySession;
 try{session=ChessStudySession.startGame('w',2,Date.now())}catch{session=ChessStudySession.startGame('w',2)}
 let paused=true,disposed=false,dirty=false,selected:Square|null=null,promotion='q',aiWorker:Worker|null=null,aiId=0,thinking=false,unwatch=()=>{},watchSerial=0,watchCheck=0,savedPath:string|null=null,savedVersion:string|null=null,reduction=false,busy=false,revision=0;
 const status=make('div','chess-status app-status','Paused. Choose a mode and press Resume.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const warning=make('div','chess-warning','');warning.hidden=true;warning.setAttribute('role','status');
 const audio=new SynthAudio();audio.setVolume(.35);
 const valid=()=>!disposed&&!signal.aborted&&container.isConnected&&owner===host.storage.signedInSubject();
 const tell=(message:string)=>{if(valid())status.textContent=message};
 const mark=()=>{revision++;dirty=true;windowState.dirty=true};
 const clearDirty=()=>{dirty=false;windowState.dirty=false};
 const setBusy=(value:boolean)=>{busy=value;newGame.disabled=value;openButton.disabled=value;saveButton.disabled=value;folder.disabled=value;path.disabled=value;pause.disabled=value;undo.disabled=value;hint.disabled=value};
 const button=(label:string,action:()=>void)=>{
  const element=doc.createElement('button');element.type='button';element.textContent=label;element.setAttribute('aria-label',label);element.addEventListener('click',action);return element;
 };
 const select=(label:string,values:Array<[string,string]>)=>{const element=doc.createElement('select');element.setAttribute('aria-label',label);for(const[value,text]of values)element.append(new Option(text,value));return element};

 const shell=make('div','chess-shell');
 const heading=make('div','chess-heading');
 heading.append(make('h2','chess-title','Chess Study'),make('p','chess-subtitle','Legal chess with a bounded local opponent and eight short tactics.'));
 const toolbar=make('div','chess-toolbar');
 const mode=select('Study mode',[['game','Play vs local AI'],['exercise','Tactical exercises']]);
 const side=select('Play as',[['w','White'],['b','Black']]);
 const difficulty=select('AI difficulty',[['1','Casual'],['2','Club'],['3','Deep']]);
 difficulty.value='2';
 const exercise=select('Exercise',EXERCISES.map(item=>[item.id,item.name]));exercise.hidden=true;
 const newGame=button('New game',()=>void reset());
 const pause=button('Resume',()=>togglePause());
 const openButton=button('Open from My files',()=>void open());
 const saveButton=button('Save to My files',()=>void save());
 toolbar.append(mode,side,exercise,difficulty,newGame,pause,openButton,saveButton);

 const main=make('div','chess-main'),left=make('div','chess-left'),right=make('div','chess-right');
 const board=doc.createElement('canvas');board.className='chess-board';board.width=512;board.height=512;board.tabIndex=0;
 board.setAttribute('role','application');board.setAttribute('aria-label','Chess board. Select a source square, then a destination square.');
 const boardNote=make('p','chess-board-note','Squares include file and rank labels. Selected and legal destination squares remain distinguishable without color.');
 left.append(board,boardNote);

 const guide=make('div','chess-guide');
 guide.innerHTML='<div class="chess-guide-face" aria-hidden="true">♞</div><strong>Study guide</strong><span>Final Rive artwork pending. Hints and move feedback are live.</span>';
 const info=make('div','chess-info');
 const history=make('div','chess-history');
 const controls=make('div','chess-controls');
 const promotionLabel=make('label','chess-promotion','Promotion ');
 const promotionSelect=select('Promotion piece',[['q','Queen'],['r','Rook'],['b','Bishop'],['n','Knight']]);promotionLabel.append(promotionSelect);
 const undo=button('Undo turn',()=>undoMove());
 const hint=button('Hint',()=>showHint());
 controls.append(promotionLabel,undo,hint,button('Pause',()=>togglePause()));
 right.append(guide,info,history);

 const settings=doc.createElement('details'),settingsSummary=make('summary','','Settings');
 const soundLabel=make('label','','Sound effects '),sound=doc.createElement('input');sound.type='checkbox';sound.setAttribute('aria-label','Sound effects');
 const volumeLabel=make('label','','Volume '),volume=doc.createElement('input');volume.type='range';volume.min='0';volume.max='100';volume.value='35';volume.disabled=true;volume.setAttribute('aria-label','Sound volume');
 const reducedLabel=make('label','','Reduce animation '),reduced=doc.createElement('input');reduced.type='checkbox';reduced.setAttribute('aria-label','Reduce animation');
 const contrastLabel=make('label','','Board contrast '),contrast=select('Board contrast',[['standard','Standard'],['high','High contrast']]);
 soundLabel.prepend(sound);volumeLabel.append(volume);reducedLabel.prepend(reduced);contrastLabel.append(contrast);
 settings.className='chess-settings';settings.append(settingsSummary,soundLabel,volumeLabel,reducedLabel,contrastLabel);

 const help=doc.createElement('details'),helpSummary=make('summary','','How to play');
 help.append(helpSummary,make('p','','Select one of your pieces, then a legal destination. Choose a promotion piece before moving a pawn to the last rank. Play as either color; the local AI searches with a bounded worker and only accepts replies for the current position. Exercises provide one-move tactical goals.'));

 const savePanel=doc.createElement('details'),saveSummary=make('summary','','Save location'),saveFields=make('div','chess-save-fields');
 const path=appInput('Chess save path',host.w?.launchContext?.path||'/Chess Study.game.json'),folder=button('Choose folder',()=>void chooseFolder());
 saveFields.append(path,folder);savePanel.className='chess-save';savePanel.append(saveSummary,saveFields);
 right.append(controls,settings,help,savePanel,warning);
 main.append(left,right);shell.append(heading,toolbar,main,status);container.append(shell);

 const context=board.getContext('2d');
 if(context===null)throw Error('Chess board canvas is unavailable.');

 const currentChess=()=>new Chess(session.fen());
 const squareFor=(event:PointerEvent):Square|null=>{
  const rect=board.getBoundingClientRect();
  const col=Math.floor((event.clientX-rect.left)/rect.width*8),row=Math.floor((event.clientY-rect.top)/rect.height*8);
  if(col<0||col>7||row<0||row>7)return null;
  return `${FILES[col]}${session.side==='w'?8-row:row+1}` as Square;
 };
 const draw=(time=0)=>{
  if(disposed)return;
  const chess=currentChess(),rows=chess.board(),cell=64;
  context.clearRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
   const dark=(row+col)%2===1,light=contrast.value==='standard'?(dark?'#7b593e':'#e0cfaa'):(dark?'#222b3d':'#f8fafc');
   context.fillStyle=light;context.fillRect(col*cell,row*cell,cell,cell);
   const square=`${FILES[col]}${session.side==='w'?8-row:row+1}` as Square;
   if(selected===square){context.fillStyle='rgba(79,142,247,.55)';context.fillRect(col*cell,row*cell,cell,cell)}
   const legal=selected!==null&&session.legalMoves().some(move=>move.from===selected&&move.to===square);
   if(legal){context.beginPath();context.arc(col*cell+32,row*cell+32,7,0,Math.PI*2);context.fillStyle='#2f6f4e';context.fill()}
   const piece=rows[row][col];
   if(piece!==null){
    context.textAlign='center';context.textBaseline='middle';context.font='42px Georgia,serif';context.lineWidth=4;
    context.strokeStyle=piece.color==='w'?'#3b2d22':'#f2eee4';context.fillStyle=piece.color==='w'?'#fffdf4':'#171b26';
    context.strokeText(GLYPHS[piece.type],col*cell+32,row*cell+34);context.fillText(GLYPHS[piece.type],col*cell+32,row*cell+34);
   }
   if(row===7||col===0){
    context.font='11px sans-serif';context.fillStyle=dark?'#f4f4f4':'#222';context.textAlign=col===0?'left':'right';context.textBaseline='bottom';
    const label=row===7?FILES[col]:String(session.side==='w'?8-row:row+1);context.fillText(label,col===0?col*cell+3:col*cell+61,row*cell+61);
   }
  }
  if(!reduction&&session.check){context.strokeStyle='#c33';context.lineWidth=5;context.strokeRect(2,2,508,508)}
  const whose=session.isAiTurn()?'Local AI':session.turn==='w'?'White':'Black';
  info.textContent=`${session.result==='playing'?`${whose} to move`:session.result.replaceAll('-',' ')} · ${session.difficulty===1?'Casual':session.difficulty===2?'Club':'Deep'}${session.check?' · Check':''}`;
  const tail=session.history.slice(-8);history.textContent=tail.length?`Moves: ${tail.join(' ')}`:'Moves: —';
  pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-label',pause.textContent);
 };
 let frame=0;const paint=(time:number)=>{draw(time);if(!disposed)frame=requestAnimationFrame(paint)};

 const stopAi=()=>{aiId++;thinking=false;aiWorker?.terminate();aiWorker=null};
 const scheduleAi=()=>{
  if(paused||disposed||!session.isAiTurn())return;
  thinking=true;draw();
  try{aiWorker??=createWorker()}catch(error){tell('Local AI worker unavailable: '+(error instanceof Error?error.message:'unknown'));return}
  const id=++aiId,revision=session.revision;
  aiWorker.onmessage=({data}:MessageEvent<{id:number;revision:number;from?:string|null;to?:string|null;promotion?:string|null;error?:string}>)=>{
   if(id!==aiId||revision!==session.revision||!valid())return;
   thinking=false;
   if(data.error){tell('Local AI search failed: '+data.error);return}
   if(data.from&&data.to){
    const outcome=session.acceptAiMove({revision,from:data.from,to:data.to,promotion:data.promotion??undefined});
    if(outcome.ok){mark();audio.move();tell(session.result==='checkmate'?'Checkmate.':session.result==='draw'?'Draw.':paused?'AI moved. Paused.':'Your move.');draw()}
   }
  };
  aiWorker.onerror=event=>{if(id===aiId&&valid()){thinking=false;tell('Local AI worker failed: '+(event.message||'unknown error'))}};
  aiWorker.postMessage({id,revision,fen:session.fen(),difficulty:session.difficulty,seed:session.snapshot().rngState,deadlineMs:450});
 };
 const afterMove=()=>{
  selected=null;draw();
  if(session.result==='checkmate'||session.result==='draw'){audio.finish();tell(session.result==='checkmate'?'Checkmate.':'Draw.');return}
  if(session.result==='exercise-solved'){audio.finish();tell('Exercise solved. Choose another exercise or New game.');return}
  if(session.isAiTurn()){thinking=true;tell('Local AI is thinking…');scheduleAi()}else tell(paused?'Move made. Paused.':'Your move.');
 };
 const activateSquare=(square:Square)=>{
  if(busy||paused||disposed||session.result!=='playing')return;
  if(session.isAiTurn()){tell('Wait for the local AI to move.');return}
  const chess=currentChess(),piece=chess.get(square);
  if(selected===null){if(piece&&piece.color===session.turn){selected=square;draw()}else tell('Choose a piece on the side to move.');return}
  if(selected===square){selected=null;draw();return}
  if(piece&&piece.color===session.turn){selected=square;draw();return}
  const outcome=session.move(selected,square,promotion);
  if(!outcome.ok){tell('Illegal move: '+(outcome.reason||'not legal'));selected=null;draw();return}
  mark();audio.move();afterMove();
 };
 const boardPointer=(event:PointerEvent)=>{const square=squareFor(event);if(square!==null)activateSquare(square)};
 const keyboard=(event:KeyboardEvent)=>{if(event.target instanceof Element&&event.target.closest('input,textarea,select,button,[contenteditable]:not([contenteditable=false])'))return;if(event.key==='Escape'){event.preventDefault();togglePause()}else if(event.key.toLowerCase()==='u'){event.preventDefault();undoMove()}else if(event.key.toLowerCase()==='h'){event.preventDefault();showHint()}};

 function togglePause(){
  if(disposed||busy)return;
  paused=!paused;
  if(paused)stopAi();else{if(sound.checked)audio.unlock();scheduleAi();audio.move()}
  tell(paused?'Paused.':session.result==='playing'?'Resume play.':'Study complete.');draw();
 }
 function showHint(){if(busy)return;const move=session.hint();tell(move===null?'No hint is available.':'Hint: '+move)}
 function undoMove(){
  if(busy)return;stopAi();selected=null;
  if(session.exerciseId!==null){const base=ChessStudySession.startExercise(session.exerciseId,session.difficulty);session=base;mark();tell('Exercise reset.')}
  else if(session.undo()){mark();tell('Your previous turn was restored.')}
  else {tell('There is no turn to undo.');if(!paused&&session.isAiTurn())scheduleAi();}
  draw();
 }
 async function reset(){
  if(!valid()||busy)return;
  setBusy(true);stopAi();paused=true;draw();
  const atRevision=revision,modeChoice=mode.value,exerciseChoice=exercise.value;
  try{
   if(dirty&&!await host.ui.confirm('Start a new study and discard unsaved progress?',{title:'Unsaved chess study',confirmLabel:'Start new',cancelLabel:'Keep current',danger:true,signal})){tell('Current study kept.');return}
   if(!valid())return;
   if(revision!==atRevision||mode.value!==modeChoice||exercise.value!==exerciseChoice)throw Error('The study changed while confirming. Try again.');
   clearWatch();selected=null;
   const selectedSide=side.value as PlayerSide,selectedDifficulty=Number(difficulty.value) as Difficulty;
   session=modeChoice==='exercise'?ChessStudySession.startExercise(exerciseChoice,selectedDifficulty):ChessStudySession.startGame(selectedSide,selectedDifficulty,Date.now());
   revision++;paused=true;clearDirty();savedPath=null;savedVersion=null;if(host.w)delete host.w.launchContext;tell('New study ready. Press Resume to play.');draw();
  }catch(error){tell('Could not start a new study: '+(error instanceof Error?error.message:'unknown error'))}
  finally{setBusy(false)}
 }
 function clearWatch(){watchSerial++;watchCheck++;unwatch();unwatch=()=>{};warning.textContent='';warning.hidden=true}
 function watch(c:Awaited<ReturnType<Host['storage']['mirrorFileContext']>>,p:string,version:string){
  clearWatch();const token=watchSerial,check=async()=>{const checkId=++watchCheck;if(!valid()||!c.valid()||savedPath!==p||savedVersion!==version)return;let message='';try{const current=c.files.stat?await c.files.stat(p):await c.files.read(p);message=current.status==='conflict'?'This study has conflicting copies. Your board is unchanged; resolve them in Files.':current.version!==version?'The saved study changed. Your board is unchanged; save a copy or reopen it.':''}catch{message='The saved study is unavailable. Your board is unchanged.'}if(valid()&&c.valid()&&token===watchSerial&&checkId===watchCheck){warning.textContent=message;warning.hidden=!message}};
  unwatch=c.files.subscribe?.(check)||(()=>{});queueMicrotask(check);
 }
 async function save(){
  if(!valid()||busy)return;
  const wasDirty=dirty,atRevision=revision,live=session,requested=path.value,captured=encodeSave(session);
  setBusy(true);windowState.dirty=true;stopAi();paused=true;draw();
  let committed=false;
  try{
   const c=await host.storage.mirrorFileContext(),p=c.path(requested);
   if(!p.toLowerCase().endsWith('.game.json'))throw Error('Use a .game.json file name.');
   let expected:string|null=null;
   try{
    const old=c.files.stat?await c.files.stat(p):await c.files.read(p);
    if(old.status==='conflict')throw Error('Resolve the conflict in Files first.');
    if(p===savedPath&&savedVersion){
     if(old.version!==savedVersion)throw Error('The saved study changed. Save a copy or reopen it.');
    }else if(!await host.ui.confirm('Replace '+p+'?',{title:'Replace saved study',confirmLabel:'Replace',cancelLabel:'Cancel',danger:true,signal})){tell('Save cancelled.');return}
    if(session!==live||revision!==atRevision||encodeSave(live)!==captured)throw Error('The study changed while confirming. Try again.');
    expected=old.version;
   }catch(error){if(!(error instanceof Error)||error.message!=='File not found.')throw error;if(p===savedPath&&savedVersion)throw Error('The saved study was removed. Save a copy or reopen it.')}
   if(!valid()||!c.valid())return;
   const result=await c.files.write(p,captured,expected);
   if(!valid()||!c.valid())return;
   if(session===live&&revision===atRevision){savedPath=p;savedVersion=result.version;if(path.value===requested)path.value=p;clearDirty()}else mark();
   committed=true;
   if(host.w){host.w.title=p.split('/').pop()+' — Chess Study';host.w.launchContext=Object.freeze({version:1,storage:'mirror',path:p,owner})}
   watch(c,p,result.version);
   tell(result.status==='conflict'?'Saved on this device with conflicting copies. Resolve them in Files.':session!==live||revision!==atRevision?'Saved an earlier study; newer changes are unsaved.':'Saved to My files; syncing with the server.');
  }catch(error){tell('Could not save: '+(error instanceof Error?error.message:'unknown error'))}
  finally{
   if(!committed&&valid()&&revision===atRevision){dirty=wasDirty;windowState.dirty=wasDirty}
   setBusy(false);
  }
 }
 async function open(selectedPath?:string){
  if(!valid()||busy)return;
  setBusy(true);stopAi();paused=true;draw();
  const live=session,before=encodeSave(live),atRevision=revision;
  try{
   if(dirty&&!await host.ui.confirm('Open a saved study and discard current progress?',{title:'Unsaved chess study',confirmLabel:'Discard progress',cancelLabel:'Keep current',danger:true,signal})){tell('Paused. Press Resume to continue.');return}
   if(!valid())return;
   if(session!==live||revision!==atRevision||encodeSave(live)!==before)throw Error('The study changed while confirming. Try again.');
   const choice=selectedPath||await host.storage.pickFile({extensions:['.json'],signal});if(!choice||!valid())return;
   const c=await host.storage.mirrorFileContext(),p=c.path(choice),file=await c.files.read(p);
   if(!valid()||!c.valid())return;
   if(file.status==='conflict')throw Error('Resolve the conflict in Files first.');
   if(file.data.byteLength>8*1024*1024)throw Error('Study file is too large.');
   const replacement=sessionFromSave(decodeSave(new TextDecoder('utf-8',{fatal:true}).decode(file.data)));
   if(!valid()||!c.valid())return;
   if(session!==live||revision!==atRevision||encodeSave(live)!==before)throw Error('The study changed while opening. Try again.');
   session=replacement;revision++;selected=null;side.value=session.side;difficulty.value=String(session.difficulty);mode.value=session.exerciseId?'exercise':'game';
   if(session.exerciseId)exercise.value=session.exerciseId;exercise.hidden=mode.value!=='exercise';paused=true;savedPath=p;savedVersion=file.version;path.value=p;clearDirty();
   if(host.w){host.w.title=p.split('/').pop()+' — Chess Study';host.w.launchContext=Object.freeze({version:1,storage:'mirror',path:p,owner})}
   watch(c,p,file.version);tell('Study loaded and paused. Press Resume to continue.');draw();
  }catch(error){tell('Could not open: '+(error instanceof Error?error.message:'unknown error'))}
  finally{setBusy(false)}
 }
 async function chooseFolder(){try{const folderPath=await host.storage.pickFolder({signal});if(folderPath===null||!valid())return;const c=await host.storage.mirrorFileContext();if(!valid()||!c.valid())return;path.value=c.path((folderPath==='/'?'':folderPath)+'/'+c.name(path.value.split('/').pop()||'Chess Study.game.json'))}catch(error){tell('Could not choose folder: '+(error instanceof Error?error.message:'unknown error'))}}

 mode.addEventListener('change',()=>{exercise.hidden=mode.value!=='exercise';side.disabled=mode.value==='exercise';tell(mode.value==='exercise'?'Choose an exercise, then New game.':'Choose a side and difficulty, then New game.')});
 promotionSelect.addEventListener('change',()=>promotion=promotionSelect.value);
 sound.addEventListener('change',()=>{volume.disabled=!sound.checked;audio.setMuted(!sound.checked);if(sound.checked)audio.unlock()});
 volume.addEventListener('input',()=>audio.setVolume(Number(volume.value)/100));
 reduced.addEventListener('change',()=>reduction=reduced.checked);
 contrast.addEventListener('change',()=>draw());
 board.addEventListener('pointerdown',boardPointer);board.addEventListener('keydown',keyboard);
 const suspend=()=>{stopAi();if(!paused){paused=true;draw();tell('Game paused.')}};
 const visibility=()=>{if(doc.hidden)suspend()};
 const desktopWindow=container.closest<HTMLElement>('.window');
 const windowObserver=desktopWindow?new MutationObserver(()=>{if(desktopWindow.hidden||!desktopWindow.classList.contains('focused')||desktopWindow.classList.contains('rolled'))suspend()}):null;
 windowObserver?.observe(desktopWindow!,{attributes:true,attributeFilter:['class','hidden']});
 window.addEventListener('blur',suspend);doc.addEventListener('visibilitychange',visibility);
 draw();frame=requestAnimationFrame(paint);
 if(host.w?.launchContext?.storage==='mirror'&&host.w.launchContext.owner===owner){const initialPath=host.w.launchContext.path;path.value=initialPath;const openWhenConnected=(attempt=0):void=>{if(disposed||signal.aborted)return;if(!container.isConnected&&attempt<60)setTimeout(()=>openWhenConnected(attempt+1),16);else if(valid())void open(initialPath)};queueMicrotask(()=>openWhenConnected())}
 else tell('Choose a game or exercise, then press Resume.');

 return {dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(frame);stopAi();clearWatch();windowObserver?.disconnect();board.removeEventListener('pointerdown',boardPointer);board.removeEventListener('keydown',keyboard);window.removeEventListener('blur',suspend);doc.removeEventListener('visibilitychange',visibility);audio.dispose();container.replaceChildren();
 }};
}
