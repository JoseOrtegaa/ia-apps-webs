import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, emptyBoard, finishStroke, eraseStroke, validateBoard, History, createObject, exampleBoard, hitTest, translated, allBounds, strokeParts } from '../model.js';
const line = (points) => ({id:'test', type:'stroke',color:COLORS[0],width:2,opacity:1,smooth:false,points});
test('jitter correction aligns intended straight lines, preserving endpoints',()=>{
 const points=Array.from({length:101},(_,i)=>({x:i*2,y:i===0||i===100?0:Math.sin(i)*2}));
 const result=finishStroke(points,true);
 assert.equal(result.straight,true);assert.deepEqual(result.points,[points[0],points.at(-1)]);
 assert.deepEqual(finishStroke(points,false).points,points);
});
test('smoothing preserves an intentional curve and small handwriting',()=>{
 const arc=Array.from({length:80},(_,i)=>({x:i*2,y:60*Math.sin(i/79*Math.PI)}));
 const result=finishStroke(arc,true);assert.equal(result.straight,false);assert(result.points.length>2);assert.deepEqual(result.points[0],arc[0]);assert.deepEqual(result.points.at(-1),arc.at(-1));
 const small=[{x:0,y:0},{x:3,y:10},{x:10,y:0}];assert.equal(finishStroke(small,true).straight,false);
});
test('eraser cuts a sparse segment without creating independent elements',()=>{
 const source=line([{x:0,y:0},{x:100,y:0}]);const result=eraseStroke(source,{x:50,y:0},9),parts=strokeParts(result[0]);
 assert.equal(result.length,1);assert.equal(result[0].id,source.id);assert.equal(parts.length,2);assert.equal(parts[0].at(-1).x,40);assert.equal(parts[1][0].x,60);
assert.equal(eraseStroke(source,{x:50,y:100},9)[0],source);
 assert.equal(eraseStroke(source,{x:50,y:0},100).length,0);
});
test('eraser handles dots and multiple crossings',()=>{
 assert.equal(eraseStroke(line([{x:5,y:5}]),{x:5,y:5},10).length,0);
 const wave=line([{x:-30,y:0},{x:30,y:0},{x:-30,y:2},{x:30,y:2}]);const result=eraseStroke(wave,{x:0,y:0},8),parts=strokeParts(result[0]);
 assert.equal(result.length,1);assert(parts.length>=3);for(const part of parts)for(const p of part)assert(Math.hypot(p.x,p.y)>=8.99);
});
test('undo/redo restores edits and invalidates the abandoned redo branch',()=>{
 const b=emptyBoard(),h=new History(b);b.items.push(createObject('database',0,0));h.push(b);b.items[0].text='Progreso';h.push(b);
 assert.equal(h.undo().items[0].text,'Base de datos');assert.equal(h.undo().items.length,0);assert.equal(h.redo().items.length,1);
 const next=h.undo();next.title='Otro';h.push(next);assert.equal(h.redo(),null);
});
test('import accepts every supported object and rejects malformed and oversized inputs',()=>{
 const b=exampleBoard(),clean=validateBoard(JSON.parse(JSON.stringify(b)));assert.equal(clean.items.length,b.items.length);
 assert.throws(()=>validateBoard({...b,version:2}));assert.throws(()=>validateBoard({...b,items:[{...b.items[0],x:Infinity}]}));
 assert.throws(()=>validateBoard({...b,items:[{...b.items[0],kind:'script'}]}));assert.throws(()=>validateBoard({...b,items:[{...b.items[0],color:'url(evil)'}]}));
 assert.throws(()=>validateBoard({...b,items:[{...b.items[0],text:'a'.repeat(501)}]}));
 assert.throws(()=>validateBoard({...b,items:[line(Array.from({length:12001},()=>({x:0,y:0})))]}));
 const untrusted={...b.items[0],text:'<script>alert(1)</script>',unexpected:'discard'};
 const item=validateBoard({...b,items:[untrusted]}).items[0];assert.equal(item.text,untrusted.text);assert.equal(item.unexpected,undefined);
});
test('moving and hit testing strokes use actual geometry, and bounds contain all content',()=>{
 const source=line([{x:0,y:0},{x:100,y:100}]);assert(hitTest(source,{x:50,y:50}));assert(!hitTest(source,{x:0,y:100},2));
 const next=translated(source,10,-20);assert.deepEqual(next.points[0],{x:10,y:-20});assert.deepEqual(source.points[0],{x:0,y:0});
 const b=allBounds([next,createObject('folder',300,200)]);assert(b.x<=10&&b.y<=-20);assert(b.x+b.w>=480&&b.y+b.h>=330);
});

test('saved font sizes round-trip and old boards receive compatible defaults',()=>{
 const object={...createObject('folder',0,0),fontSize:37};
 assert.equal(validateBoard({...emptyBoard(),items:[object]}).items[0].fontSize,37);
 delete object.fontSize;
 assert.equal(validateBoard({...emptyBoard(),items:[object]}).items[0].fontSize,18);
 for(const size of [0,-1,Infinity,'20',257])assert.throws(()=>validateBoard({...emptyBoard(),items:[{...object,fontSize:size}]}));
});
