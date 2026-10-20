export type Production = { id: number; lhs: string; rhs: string[] };
export type Item = { production: number; dot: number };
export type Transition = { from: number; to: number; symbol: string };
export type Action = { kind: 'shift'|'reduce'|'accept'; target?: number; production?: number };
export type Conflict = { state: number; symbol: string; actions: Action[]; type: string };
export type Step = { stack: number[]; symbols: string[]; remaining: string[]; action: string; state: number; highlighted?: string };
export type Grammar = { productions: Production[]; start: string; augmented: string; nonterminals: string[]; terminals: string[]; first: Record<string,string[]>; follow: Record<string,string[]>; states: Item[][]; transitions: Transition[]; action: Record<string,Action[]>; goto: Record<string,number>; conflicts: Conflict[] };
const EPS = 'ε';
const END = '$';
const key = (s:number,t:string) => `${s}::${t}`;
const uniq = <T,>(xs:T[]) => [...new Set(xs)];
const sorted = (xs: Iterable<string>) => [...xs].sort();
function tokenize(raw:string, nts:string[]):string[] {
  const value=raw.trim(); if(!value || value===EPS || /^epsilon$/i.test(value)) return [];
  if(/\s/.test(value)) return value.split(/\s+/).filter(Boolean).filter(x=>x!==EPS);
  const names=[...nts].sort((a,b)=>b.length-a.length);
  const result:string[]=[]; let i=0;
  while(i<value.length){ const nt=names.find(n=>value.startsWith(n,i)); if(nt){result.push(nt);i+=nt.length;continue;}
    const match=value.slice(i).match(/^[a-z][a-z0-9_]*/i);
    if(match && match[0].length>1 && !/^[A-Z]/.test(match[0])) { // compact grammar: lowercase words are treated as individual terminals unless whitespace separated
      result.push(match[0]);i+=match[0].length;continue;
    }
    result.push(value[i]);i++;
  }
  return result;
}
export function parseGrammar(source:string):Grammar {
  const lines=source.split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !x.startsWith('//'));
  if(!lines.length) throw new Error('Enter at least one grammar production.');
  const definitions:{lhs:string; alternatives:string[]}[]=[];
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^([A-Za-z_][A-Za-z0-9_']*)\s*(?:->|→|::=)\s*(.*)$/);
    if(!m) throw new Error(`Line ${i+1}: use a production like E -> E + T | T.`);
    if(!m[2].trim()) throw new Error(`Line ${i+1}: missing right-hand side.`);
    const alternatives=m[2].split('|').map(x=>x.trim());
    if(alternatives.some(x=>!x)) throw new Error(`Line ${i+1}: empty alternative. Use ε for epsilon.`);
    definitions.push({lhs:m[1],alternatives});
  }
  const nonterminals=uniq(definitions.map(x=>x.lhs));
  const start=nonterminals[0];let augmented=`${start}'`;while(nonterminals.includes(augmented)) augmented+="'";
  const productions:Production[]=[{id:0,lhs:augmented,rhs:[start]}];
  for(const def of definitions) for(const alt of def.alternatives) {
    const rhs=tokenize(alt,nonterminals);
    if(rhs.includes(EPS) || rhs.some(s=>s==='->'||s==='|')) throw new Error(`Invalid symbol in production ${def.lhs}.`);
    const undefinedNt=rhs.find(s=>/^[A-Z]/.test(s) && !nonterminals.includes(s));
    if(undefinedNt) throw new Error(`Non-terminal ${undefinedNt} has no production.`);
    productions.push({id:productions.length,lhs:def.lhs,rhs});
  }
  const terminals=sorted(new Set(productions.flatMap(p=>p.rhs).filter(x=>!nonterminals.includes(x))));
  if(terminals.includes(END)) throw new Error('$ is reserved as the end-of-input marker.');
  const allNts=[...nonterminals,augmented];
  const firstSets:Record<string,Set<string>>={};const followSets:Record<string,Set<string>>={};
  for(const nt of allNts){firstSets[nt]=new Set();followSets[nt]=new Set();}
  const firstSequence=(seq:string[]):Set<string>=>{
    const out=new Set<string>(); if(!seq.length){out.add(EPS);return out;}
    let nullable=true;
    for(const sym of seq){const f=firstSets[sym]??new Set([sym]);for(const v of f)if(v!==EPS)out.add(v);
      if(!f.has(EPS)){nullable=false;break;}}
    if(nullable)out.add(EPS);return out;
  };
  let changed=true;
  while(changed){changed=false;for(const p of productions){for(const x of firstSequence(p.rhs))if(!firstSets[p.lhs].has(x)){firstSets[p.lhs].add(x);changed=true;}}}
  followSets[start].add(END);
  changed=true;while(changed){changed=false;for(const p of productions){for(let i=0;i<p.rhs.length;i++){
    const nt=p.rhs[i];if(!followSets[nt])continue;
    const suffix=firstSequence(p.rhs.slice(i+1));
    for(const x of suffix)if(x!==EPS&&!followSets[nt].has(x)){followSets[nt].add(x);changed=true;}
    if(suffix.has(EPS))for(const x of followSets[p.lhs])if(!followSets[nt].has(x)){followSets[nt].add(x);changed=true;}
  }}}
  const itemKey=(item:Item)=>`${item.production}:${item.dot}`;
  const canonical=(items:Item[])=>items.map(itemKey).sort().join('|');
  const closure=(initial:Item[]):Item[]=>{
    const found=new Map(initial.map(i=>[itemKey(i),i]));let added=true;
    while(added){added=false;for(const item of [...found.values()]){
      const p=productions[item.production],next=p.rhs[item.dot];if(!next||!allNts.includes(next))continue;
      for(const q of productions)if(q.lhs===next){const candidate={production:q.id,dot:0},k=itemKey(candidate);
        if(!found.has(k)){found.set(k,candidate);added=true;}}
    }}return [...found.values()].sort((a,b)=>a.production-b.production||a.dot-b.dot);
  };
  const states:Item[][]=[closure([{production:0,dot:0}])];
  const seen=new Map([[canonical(states[0]),0]]);const transitions:Transition[]=[];
  for(let i=0;i<states.length;i++){
    const symbols=sorted(new Set(states[i].map(it=>productions[it.production].rhs[it.dot]).filter((x):x is string=>Boolean(x))));
    for(const symbol of symbols){const advanced=states[i].filter(it=>productions[it.production].rhs[it.dot]===symbol).map(it=>({production:it.production,dot:it.dot+1}));
      const next=closure(advanced),signature=canonical(next);let target=seen.get(signature);
      if(target===undefined){target=states.length;seen.set(signature,target);states.push(next);}
      transitions.push({from:i,to:target,symbol});
    }
    if(states.length>500)throw new Error('Grammar exceeds the 500-state visualization limit.');
  }
  const action:Record<string,Action[]>={},goto:Record<string,number>={};
  const add=(s:number,t:string,a:Action)=>{const k=key(s,t);action[k]??=[];if(!action[k].some(x=>JSON.stringify(x)===JSON.stringify(a)))action[k].push(a);};
  for(const t of transitions){if(nonterminals.includes(t.symbol))goto[key(t.from,t.symbol)]=t.to;else add(t.from,t.symbol,{kind:'shift',target:t.to});}
  for(let s=0;s<states.length;s++)for(const item of states[s]){
    const p=productions[item.production];if(item.dot!==p.rhs.length)continue;
    if(item.production===0)add(s,END,{kind:'accept'});
    else for(const symbol of followSets[p.lhs])add(s,symbol,{kind:'reduce',production:p.id});
  }
  const conflicts:Conflict[]=Object.entries(action).filter(([,a])=>a.length>1).map(([k,actions])=>{
    const [state,symbol]=k.split('::');return {state:Number(state),symbol,actions,type:actions.some(a=>a.kind==='shift')?'Shift/reduce':'Reduce/reduce'};
  });
  return {productions,start,augmented,nonterminals,terminals,first:Object.fromEntries(nonterminals.map(n=>[n,sorted(firstSets[n])])),follow:Object.fromEntries(nonterminals.map(n=>[n,sorted(followSets[n])])),states,transitions,action,goto,conflicts};
}
export function tokenizeInput(input:string,terminals:string[]):string[]{
  const trimmed=input.trim();if(!trimmed||trimmed===EPS)return [];
  if(trimmed.includes('$'))throw new Error('Do not include $. It is appended automatically.');
  if(/\s/.test(trimmed))return trimmed.split(/\s+/).filter(Boolean);
  const ordered=[...terminals].sort((a,b)=>b.length-a.length);const tokens:string[]=[];let i=0;
  while(i<trimmed.length){const t=ordered.find(t=>trimmed.startsWith(t,i));if(!t)throw new Error(`Unknown input token near “${trimmed.slice(i)}”. Separate multi-character tokens with spaces.`);tokens.push(t);i+=t.length;}
  return tokens;
}
export function simulate(g:Grammar,input:string):{steps:Step[];accepted:boolean;error?:string}{
  const tokens=[...tokenizeInput(input,g.terminals),END];const stack=[0],symbols:string[]=[],steps:Step[]=[];let pos=0;
  for(let i=0;i<1000;i++){
    const state=stack[stack.length-1],lookahead=tokens[pos];const actions=g.action[key(state,lookahead)]??[];
    const snapshot=(label:string):Step=>({stack:[...stack],symbols:[...symbols],remaining:tokens.slice(pos),action:label,state,highlighted:key(state,lookahead)});
    if(!actions.length){const error=`No ACTION[${state}, ${lookahead}] entry. Input rejected.`;steps.push(snapshot(error));return {steps,accepted:false,error};}
    if(actions.length>1){const error=`Conflict at ACTION[${state}, ${lookahead}]. Cannot choose an action.`;steps.push(snapshot(error));return {steps,accepted:false,error};}
    const a=actions[0];if(a.kind==='accept'){steps.push(snapshot('ACCEPT — input belongs to the grammar'));return {steps,accepted:true};}
    if(a.kind==='shift'){steps.push(snapshot(`SHIFT ${lookahead} → state ${a.target}`));symbols.push(lookahead);stack.push(a.target!);pos++;continue;}
    const p=g.productions[a.production!];steps.push(snapshot(`REDUCE ${p.lhs} → ${p.rhs.join(' ')||EPS}`));
    for(let j=0;j<p.rhs.length;j++){stack.pop();symbols.pop();}
    const next=g.goto[key(stack[stack.length-1],p.lhs)];if(next===undefined){const error=`Missing GOTO for ${p.lhs}.`;steps.push(snapshot(error));return {steps,accepted:false,error};}
    symbols.push(p.lhs);stack.push(next);
  }
  const error='Stopped after 1000 parsing steps (possible non-terminating grammar).';steps.push({stack:[...stack],symbols:[...symbols],remaining:tokens.slice(pos),action:error,state:stack.at(-1)!});return {steps,accepted:false,error};
}
export function formatItem(g:Grammar,item:Item){const p=g.productions[item.production],rhs=[...p.rhs];rhs.splice(item.dot,0,'•');return `${p.lhs} → ${rhs.join(' ')}`;}
export function formatAction(a:Action){return a.kind==='shift'?`s${a.target}`:a.kind==='reduce'?`r${a.production}`:'acc';}
