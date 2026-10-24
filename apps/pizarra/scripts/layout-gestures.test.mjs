import test from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, FONT, createObject, resizedObject } from '../model.js';
import { textBox, layoutText, maximumFontSize, approximateWidth, sizeFreeText } from '../text-layout.js';
import { VIEW, worldPoint, startPinch, pinchCamera, zoomCamera, installPageZoomGuard } from '../viewport.js';
const near=(a,b)=>assert(Math.abs(a-b)<.00001,`${a} != ${b}`);

test('resizing each kind doubles the artwork, text area and rendered font together',()=>{
 for(const kind of KINDS){
  const original=createObject(kind,12,25),large=resizedObject(original,original.w*2,original.h*2);
  near(large.fontSize,original.fontSize*2);
  near(textBox(large).w,textBox(original).w*2);near(textBox(large).h,textBox(original).h*2);
  near(layoutText(large).size,layoutText(original).size*2);
 }
});
test('shrinking to minimum dimensions keeps every label inside its artwork',()=>{
 for(const kind of KINDS){
  const item=resizedObject({...createObject(kind,0,0),text:'Un usuario con una misión muy importante y un nombre largo',fontSize:100},5,5);
  const layout=layoutText(item),box=layout.box;
  assert(box.x>=0&&box.y>=0&&box.x+box.w<=item.w&&box.y+box.h<=item.h);
  assert(layout.lines.length*layout.lineHeight<=box.h+.01);
  assert(layout.lines.every(line=>approximateWidth(line,layout.size)<=box.w+.01));
 }
});
test('the person label lives inside its torso, including after resize',()=>{
 for(const scale of [1,2,4]){
  const base=createObject('actor',0,0),item=resizedObject(base,base.w*scale,base.h*scale),box=textBox(item);
  assert(box.x>=item.w*(28/180)&&box.x+box.w<=item.w*(152/180));
  assert(box.y>=item.h*.70&&box.y+box.h<=item.h*(128/130));
  assert.equal(layoutText(item).truncated,false);
 }
});
test('the object font limit changes with its geometry and text length',()=>{
 const small=createObject('database',0,0),big=resizedObject(small,small.w*2,small.h*2);
 assert(maximumFontSize(big)>=maximumFontSize(small)*1.99);
 assert(maximumFontSize({...small,text:'Mucho más texto dentro de una base de datos pequeña'})<maximumFontSize(small));
 const overfilled={...small,fontSize:FONT.max,text:'W'.repeat(500)};
 const layout=layoutText(overfilled);assert(layout.truncated);assert(layout.lines.every(line=>approximateWidth(line,layout.size)<=layout.box.w));
});
test('standalone text accommodates larger letters and respects line breaks',()=>{
 const text={...createObject('text',0,0),fontSize:48,text:'Un título\ny una explicación'};
 const sized=sizeFreeText(text);assert(sized.h>text.h);assert.equal(layoutText(sized).size,48);assert.equal(layoutText(sized).truncated,false);
});
test('pinching out reveals more world space while preserving the focal point',()=>{
 const camera={x:80,y:-40,z:2},a={x:100,y:200},b={x:300,y:200},start=startPinch(camera,a,b);
 const result=pinchCamera(start,{x:175,y:240},{x:225,y:240});
 near(result.z,.5);near(worldPoint(result,{x:200,y:240}).x,start.anchor.x);near(worldPoint(result,{x:200,y:240}).y,start.anchor.y);
 assert(390/result.z>390/camera.z);
});
test('two-finger translation continues beyond the original visible canvas',()=>{
 const start=startPinch({x:0,y:0,z:1},{x:100,y:100},{x:200,y:100});
 const moved=pinchCamera(start,{x:-900,y:-700},{x:-800,y:-700});
 near(moved.x,-1000);near(moved.y,-800);near(moved.z,1);
 near(worldPoint(moved,{x:100,y:100}).x,1100);
});
test('zoom bounds retain the canvas anchor at both extremes',()=>{
 const camera={x:60,y:80,z:1},anchor={x:200,y:300},world=worldPoint(camera,anchor);
 for(const [requested,wanted] of [[.0001,VIEW.minZoom],[100,VIEW.maxZoom]]){
  const result=zoomCamera(camera,requested,anchor);near(result.z,wanted);near(worldPoint(result,anchor).x,world.x);near(worldPoint(result,anchor).y,world.y);
 }
});
test('native page gestures are cancelled without intercepting canvas zoom or text selection',()=>{
 const handlers=new Map();installPageZoomGuard({addEventListener:(name,fn,options)=>handlers.set(name,{fn,options})});
 const event=(target={closest:()=>null})=>({cancelable:true,target,preventDefault(){this.prevented=true;}});
 for(const name of ['gesturestart','gesturechange','gestureend']){const e=event();handlers.get(name).fn(e);assert(e.prevented);assert.equal(handlers.get(name).options.passive,false);}
 const pinch={...event(),touches:[{},{}]};handlers.get('touchmove').fn(pinch);assert(pinch.prevented);
 const single={...event(),touches:[{}]};handlers.get('touchmove').fn(single);assert(!single.prevented);
 const canvas={...event({closest:s=>s==='#board'?{}:null}),ctrlKey:true};handlers.get('wheel').fn(canvas);assert(!canvas.prevented);
 const toolbar={...event(),ctrlKey:true};handlers.get('wheel').fn(toolbar);assert(toolbar.prevented);
 const edit=event({closest:()=>({})});handlers.get('dblclick').fn(edit);assert(!edit.prevented);
});
