import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, LIMITS, eraseStroke, strokeParts, pointCount, flattenStroke, bounds, hitTest, translated, validateBoard, emptyBoard, History } from '../model.js';
const highlight = {id:'highlight',type:'stroke',color:COLORS[4],width:40,opacity:.28,smooth:false,points:[{x:0,y:0},{x:200,y:0},{x:0,y:10},{x:200,y:10}]};

test('a crossed highlighter stays a single translucent element after repeated erasing',()=>{
 let items=[highlight];
 for(const center of [{x:100,y:5},{x:120,y:5},{x:80,y:5}]){
  items=items.flatMap(item=>eraseStroke(item,center,12));
  assert.equal(items.length,1);assert.equal(items[0].id,highlight.id);assert.equal(items[0].opacity,.28);
  assert(!hitTest(items[0],{x:100,y:5},0));assert(hitTest(items[0],{x:20,y:5},0));
 }
 assert(strokeParts(items[0]).length>1);
 assert.equal(eraseStroke(items[0],{x:100,y:5},200).length,0);
 assert.equal(highlight.points.length,4);assert.equal(highlight.parts,undefined);
});
test('erasing a smooth curve keeps the rendered geometry away from the cut',()=>{
 const source={...highlight,width:4,smooth:true,points:[{x:0,y:0},{x:50,y:100},{x:100,y:0},{x:160,y:0}]};
 const rendered=flattenStroke(source.points);
 assert(rendered.length>source.points.length);assert(Math.max(...rendered.map(p=>p.y))<70);
 const untouched=eraseStroke(source,{x:50,y:100},3);assert.equal(untouched[0],source);
 const result=eraseStroke(source,{x:125,y:0},5)[0];
 assert.equal(result.smooth,false);
 for(const p of rendered.filter(p=>p.x<110))assert(strokeParts(result).flat().some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1e-8));
});
test('remaining parts move, duplicate and contribute to bounds together',()=>{
 const erased=eraseStroke(highlight,{x:100,y:5},12)[0],moved=translated(erased,230,-40);
 assert.equal(strokeParts(moved).length,strokeParts(erased).length);
 strokeParts(moved).forEach((points,i)=>points.forEach((p,j)=>{
  const old=strokeParts(erased)[i][j];assert.equal(p.x,old.x+230);assert.equal(p.y,old.y-40);
 }));
 assert.deepEqual(bounds(moved),{x:210,y:-60,w:240,h:50});
 assert(hitTest(moved,{x:420,y:-35},0));assert(!hitTest(moved,{x:330,y:-35},0));
});
test('compound strokes survive undo, redo, JSON and validation with all point limits enforced',()=>{
 const board={...emptyBoard(),items:[highlight]},history=new History(board);
 board.items=eraseStroke(highlight,{x:100,y:5},12);history.push(board);
 assert.equal(history.undo().items[0].parts,undefined);
 const redo=history.redo();assert.deepEqual(strokeParts(redo.items[0]),strokeParts(board.items[0]));
 const restored=validateBoard(JSON.parse(JSON.stringify(redo))).items[0];
 assert.deepEqual(strokeParts(restored),strokeParts(board.items[0]));assert.equal(restored.opacity,.28);
 assert.equal(pointCount(restored),strokeParts(restored).flat().length);
 for(const parts of [null,{},[[]],[[{x:Infinity,y:0}]],[[{x:'0',y:0}]]])assert.throws(()=>validateBoard({...board,items:[{...highlight,parts}]}));
 const tooMany=Array.from({length:13},()=>Array.from({length:12000},()=>({x:0,y:0})));
 assert(tooMany.flat().length>LIMITS.points);assert.throws(()=>validateBoard({...board,items:[{...highlight,parts:tooMany}]}));
 assert.throws(()=>validateBoard({...board,items:[{...highlight,type:'line',parts:[[{x:0,y:0}]]}]}));
});
test('large smooth strokes stay within the saved per-part point budget after cutting',()=>{
 const points=Array.from({length:12000},(_,i)=>({x:i,y:i%2?1:0}));
 const item={...highlight,points,smooth:true,width:2};
 const erased=eraseStroke(item,{x:6000,y:0},10)[0];
 assert(strokeParts(erased).every(part=>part.length<=12000));
 assert.doesNotThrow(()=>validateBoard({...emptyBoard(),items:[erased]}));
});
