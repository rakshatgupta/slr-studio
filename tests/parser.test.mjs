import test from 'node:test';import assert from 'node:assert/strict';import {parseGrammar,simulate,tokenizeInput} from '../lib/parser.ts';
test('canonical expression grammar constructs without conflicts and accepts input',()=>{const g=parseGrammar('E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id');assert.equal(g.conflicts.length,0);assert.equal(g.states.length,12);assert.equal(simulate(g,'id + id * id').accepted,true);assert.equal(simulate(g,'id + * id').accepted,false);});
test('epsilon productions work',()=>{const g=parseGrammar('S -> ( S ) S | ε');assert.equal(simulate(g,'').accepted,true);assert.equal(simulate(g,'( ( ) )').accepted,true);assert.equal(simulate(g,'( ) )').accepted,false);});
test('ambiguity is reported',()=>{const g=parseGrammar('E -> E + E | E * E | id');assert.ok(g.conflicts.length>0);assert.ok(g.conflicts.some(c=>c.type==='Shift/reduce'));});
test('reject invalid grammar',()=>{assert.throws(()=>parseGrammar('E E + T'),/Line 1/);assert.throws(()=>parseGrammar('S -> X'),/no production/);});
test('FIRST and FOLLOW for epsilon',()=>{const g=parseGrammar('S -> A b\nA -> a A | ε');assert.deepEqual(g.first.A,['a','ε']);assert.deepEqual(g.follow.A,['b']);assert.equal(simulate(g,'a a b').accepted,true);});
test('tokenizer handles longest terminal match',()=>{assert.deepEqual(tokenizeInput('id+id',['id','i','+']),['id','+','id']);});
