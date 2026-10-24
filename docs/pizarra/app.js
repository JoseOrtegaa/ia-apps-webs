import { COLORS, LIMITS, uid, clamp, distance, FONT, resizedObject, isPath, emptyBoard, finishStroke, bounds, allBounds, hitTest, translated, eraseStroke, pointCount, validateBoard, History, createObject, exampleBoard } from './model.js';
import { renderItem, renderSelection, exportSVG, textMetrics, textSizeLimit, measureLabel } from './render.js';
import { sizeFreeText } from './text-layout.js';
import { VIEW, worldPoint, zoomCamera, startPinch, pinchCamera, installPageZoomGuard } from './viewport.js';
import { icon, fillIcons } from './icons.js';
const $ = id => document.getElementById(id), boardEl=$('board'), world=$('world'), itemsEl=$('items');
const STORAGE='koi-pizarra-v1';
installPageZoomGuard(document);
let board=emptyBoard(), camera={x:0,y:0,z:1}, storageFailed=false, restoreError=false;
try { const raw=localStorage.getItem(STORAGE); if(raw){const parsed=JSON.parse(raw);board=validateBoard(parsed);if(parsed.camera && ['x','y','z'].every(k=>Number.isFinite(parsed.camera[k]))){camera={x:clamp(parsed.camera.x,-1e6,1e6),y:clamp(parsed.camera.y,-1e6,1e6),z:clamp(parsed.camera.z,VIEW.minZoom,VIEW.maxZoom)};}} } catch {restoreError=true;}
const history=new History(board), nodes=new Map(), pointers=new Map();
let tool='pen', brush='pen', color=COLORS[0], thickness=4, fontSize=24, smooth=true, selected=null, gesture=null, space=false, dirty=false, renderPending=false, saveTimer, toastTimer, editing=null, pendingConfirm=null;
const labels={select:'Seleccionar',hand:'Mover lienzo',pen:'Dibujar',eraser:'Borrador',arrow:'Flecha',line:'Línea',text:'Texto',objects:'Objetos'};
const kinds={sticky:'Nota adhesiva',database:'Base de datos',folder:'Carpeta',document:'Documento',server:'Servidor',actor:'Jugador',rect:'Rectángulo',ellipse:'Elipse',diamond:'Decisión'};
const tools=[['select','V'],['hand','H'],['pen','P'],['eraser','E'],['arrow','A'],['line','L'],['text','T'],['objects','O']];
$('toolbar').innerHTML=tools.map(([name,key],i)=>`${i===2||i===6?'<span class="tool-separator"></span>':''}<button class="tool-button" data-tool="${name}" aria-label="${labels[name]}" title="${labels[name]} · ${key}" ${name==='objects'?'aria-haspopup="dialog"':`aria-pressed="${name===tool}"`}>${icon(name==='objects'?'shapes':name)}<span class="tool-key">${key}</span></button>`).join('');
const colorNames=['Negro','Rojo','Verde','Azul','Amarillo','Naranja'];
$('colors').innerHTML=COLORS.map((c,i)=>`<button class="swatch" style="--swatch:${c}" data-color="${c}" ${i===4?'data-light':''} aria-label="${colorNames[i]}" title="${colorNames[i]}" aria-pressed="${c===color}">${c===color?icon('check'):''}</button>`).join('');
$('objects-grid').innerHTML=Object.entries(kinds).map(([kind,name])=>`<button class="object-card" data-kind="${kind}">${icon(kind)}<span>${name}</span></button>`).join('');
fillIcons();
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function point(event){const r=boardEl.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
function toWorld(p){return worldPoint(camera,p);}
function screenCenter(){return {x:boardEl.clientWidth/2,y:boardEl.clientHeight*.43};}
function selection(){return board.items.find(item=>item.id===selected);}
function scheduleRender(){if(!renderPending){renderPending=true;requestAnimationFrame(render);}}
function render(){
  renderPending=false;world.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.z})`);
  $('dots').setAttribute('patternTransform',`translate(${camera.x} ${camera.y}) scale(${camera.z})`);
  const active=new Set(board.items.map(i=>i.id));
  for(const [id,cache] of nodes)if(!active.has(id)){cache.element.remove();nodes.delete(id);}
  let previous=null;
  for(const item of board.items){let cache=nodes.get(item.id);if(!cache||cache.item!==item){const element=renderItem(item);if(cache)cache.element.replaceWith(element);cache={item,element};nodes.set(item.id,cache);}const expected=previous?previous.nextSibling:itemsEl.firstChild;if(expected!==cache.element)itemsEl.insertBefore(cache.element,expected);previous=cache.element;}
  renderSelection($('selection'),selection(),camera.z);
  $('empty').hidden=board.items.length>0;
  $('zoom-reset').textContent=`${Math.round(camera.z*100)}%`;
  $('undo').disabled=history.index===0;$('redo').disabled=history.index===history.entries.length-1;
  const item=selection();$('selection-actions').hidden=!item;
  if(item){$('selection-label').textContent=isPath(item)?'Trazo seleccionado':kinds[item.kind]||'Texto';$('edit-item').hidden=isPath(item);}
  syncTextControls(item);
}
function syncTextControls(item) {
  const hasText = item && !isPath(item), visible = hasText || tool === 'text';
  $('text-controls').hidden = !visible;
  $('properties').classList.toggle('has-text-controls', !!visible);
  if (!visible) return;
  const maximum = hasText && item.kind !== 'text' ? Math.max(FONT.min, Math.floor(textSizeLimit(item))) : FONT.max;
  const value = hasText ? textMetrics(item).size : fontSize;
  for (const input of [$('font-size'), $('font-size-number')]) {
    input.max = maximum;
    if (document.activeElement !== input) input.value = Math.min(maximum, Math.round(value));
  }
  $('font-limit').textContent = hasText && item.kind !== 'text' ? `Máx. ${maximum}` : 'px';
  $('font-size').setAttribute('aria-valuetext', `${Math.round(value)} píxeles`);
}
function changeFont(value, complete) {
  if (!Number.isFinite(value)) return;
  const item = selection();
  const maximum = item && !isPath(item) && item.kind !== 'text' ? Math.max(FONT.min, Math.floor(textSizeLimit(item))) : FONT.max;
  const size = clamp(Math.round(value), FONT.min, maximum);
  fontSize = size;
  if (item && !isPath(item)) {
    let next = { ...item, fontSize: size };
    if (item.kind === 'text') {
      next.w = clamp(item.w * size / textMetrics(item).size, 80, 2000);
      next = sizeFreeText(next, measureLabel);
    }
    replaceItem(next);
    if (complete) commit();
  }
  $('font-size').value = $('font-size-number').value = size;
  scheduleRender();
}
$('font-size').addEventListener('input', event => changeFont(Number(event.target.value), false));
$('font-size').addEventListener('change', () => { if (selection()) commit(); });
$('font-size-number').addEventListener('change', event => changeFont(event.target.valueAsNumber, true));
new ResizeObserver(() => document.body.style.setProperty('--properties-height', `${$('properties').offsetHeight}px`)).observe($('properties'));
function setTool(next){
  if(next==='objects'){showDialog('objects-dialog');return;}
  finishInteraction();tool=next;selected=null;boardEl.dataset.tool=tool;document.body.dataset.tool=tool;
  document.querySelectorAll('[data-tool]').forEach(el=>{if(el.tagName==='BUTTON'&&el.dataset.tool!=='objects')el.setAttribute('aria-pressed',String(el.dataset.tool===tool));});
  $('brush-options').hidden=tool!=='pen';$('eraser-cursor').hidden=true;
  $('smooth').disabled=tool!=='pen';$('colors').style.opacity=tool==='eraser'?'.3':'1';
  $('colors').querySelectorAll('button').forEach(b=>b.disabled=tool==='eraser');
  $('tool-hint').textContent={select:'Selecciona y arrastra · Supr para eliminar · Doble clic para editar',hand:'El lienzo continúa en todas las direcciones · Arrastra para explorar',pen:'Dos dedos para moverte · Júntalos para ver más espacio',eraser:'Borra partes de tus trazos · Selecciona un objeto para eliminarlo',arrow:'Arrastra para conectar tus ideas',line:'Arrastra para dibujar una línea recta',text:'Toca donde quieras escribir'}[tool];
  scheduleRender();
}
function updateColor(next){color=next;document.querySelectorAll('[data-color]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.color===color));el.innerHTML=el.dataset.color===color?icon('check'):'';});$('stroke-preview').style.background=color;const item=selection();if(item){replaceItem({...item,color});commit();}}
function replaceItem(next){board.items=board.items.map(item=>item.id===next.id?next:item);scheduleRender();}
function changed(){dirty=true;$('save-indicator').classList.add('unsaved');$('save-indicator').title='Guardando…';clearTimeout(saveTimer);saveTimer=setTimeout(save,450);}
function save(){
  if(gesture&&gesture.mode!=='pan'&&gesture.mode!=='pinch'){saveTimer=setTimeout(save,450);return;}
  try {localStorage.setItem(STORAGE,JSON.stringify({...board,camera}));dirty=false;storageFailed=false;$('save-indicator').classList.remove('unsaved');$('save-indicator').title='Guardado en este navegador';$('save-indicator').setAttribute('aria-label','Guardado en este navegador');}
  catch {if(!storageFailed)toast('No se pudo guardar aquí. Exporta una copia editable.');storageFailed=true;$('save-indicator').title='Sin guardar: descarga una copia';$('save-indicator').setAttribute('aria-label','Sin guardar: descarga una copia');}
}
function withinLimits(){return board.items.length<=LIMITS.items&&board.items.reduce((n,i)=>n+pointCount(i),0)<=LIMITS.points&&new Blob([JSON.stringify(board)]).size<=LIMITS.file;}
function commit(){
  if(!withinLimits()){board=JSON.parse(history.entries[history.index]);selected=null;toast('Esta pizarra está llena. Guarda una copia y empieza otra.');scheduleRender();return;}
  if(history.push(board))changed();scheduleRender();
}
function applyHistory(direction){finishInteraction();const next=history[direction]();if(next){board=next;selected=null;$('board-title').value=board.title;changed();scheduleRender();}}
function finishInteraction(cancel=false){
  if(!gesture)return;
  if(cancel&&gesture.before){board=gesture.before;selected=null;scheduleRender();}
  else if(['draw','move','resize','erase'].includes(gesture.mode)){
    if(gesture.mode==='draw')finalizeDraw();commit();
  }
  gesture=null;pointers.clear();boardEl.classList.remove('is-dragging');
}
function finalizeDraw(){const item=board.items.find(i=>i.id===gesture.id);if(!item)return;if(item.type==='stroke'){const result=finishStroke(item.points,smooth,camera.z);replaceItem({...item,points:result.points,smooth:smooth&&!result.straight});}else if(distance(item.points[0],item.points.at(-1))<2/camera.z)board.items=board.items.filter(i=>i.id!==item.id);}
function moveCamera(x,y){camera.x=clamp(x,-1e6,1e6);camera.y=clamp(y,-1e6,1e6);scheduleRender();}
function zoomTo(zoom,anchor=screenCenter()){camera=zoomCamera(camera,zoom,anchor);moveCamera(camera.x,camera.y);changed();}
function fit(){
  if(!board.items.length){camera={x:0,y:0,z:1};changed();scheduleRender();return;}
  const b=allBounds(board.items),w=boardEl.clientWidth,h=boardEl.clientHeight,mobile=w<=700;
  const left=mobile?24:115,right=mobile?24:65,top=mobile?140:160,bottom=mobile?235:235;
  camera.z=clamp(Math.min((w-left-right)/(b.w+30),Math.max(100,h-top-bottom)/(b.h+30)),VIEW.minZoom,1.4);
  camera.x=left+(w-left-right-b.w*camera.z)/2-b.x*camera.z;camera.y=top+(h-top-bottom-b.h*camera.z)/2-b.y*camera.z;changed();scheduleRender();
}
function eraseAt(p){
  const radius=(thickness*1.5+9)/camera.z;
  board.items=board.items.flatMap(item=>{
    if(item.type==='stroke'){const b=bounds(item);if(p.x+radius<b.x||p.x-radius>b.x+b.w||p.y+radius<b.y||p.y-radius>b.y+b.h)return[item];return eraseStroke(item,p,radius);}
    if(isPath(item)&&hitTest(item,p,radius))return [];
    return[item];
  });scheduleRender();
}
function eraseBetween(a,b){const steps=Math.min(160,Math.ceil(distance(a,b)/((thickness*1.5+9)/camera.z*.5)));for(let i=1;i<=Math.max(1,steps);i++){const t=i/Math.max(1,steps);eraseAt({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}
function updateEraser(p,pointerType){if(tool!=='eraser'||pointerType==='touch'){$('eraser-cursor').hidden=true;return;}const cursor=$('eraser-cursor');cursor.hidden=false;cursor.style.left=`${p.x}px`;cursor.style.top=`${p.y}px`;cursor.style.width=cursor.style.height=`${(thickness*1.5+9)*2}px`;}
boardEl.addEventListener('pointerdown',event=>{
  if(event.button!==0&&event.button!==1)return;
  event.preventDefault();$('menu-panel').hidden=true;$('menu').setAttribute('aria-expanded','false');
  boardEl.focus({preventScroll:true});
  try { boardEl.setPointerCapture(event.pointerId); } catch { /* Capture is optional on older input implementations. */ }
  const screen=point(event);pointers.set(event.pointerId,screen);
  if(pointers.size>=2){
    if(gesture?.before){board=gesture.before;selected=null;}
    const [a,b]=[...pointers.values()];
    gesture={mode:'pinch',...startPinch(camera,a,b)};boardEl.classList.add('is-dragging');scheduleRender();return;
  }
  const p=toWorld(screen),before=structuredClone(board);
  if(tool==='hand'||space||event.button===1){gesture={mode:'pan',start:screen,camera:{...camera}};boardEl.classList.add('is-dragging');return;}
  if(tool==='select'){
    const old=selection(),resize=old&&!isPath(old)&&distance(p,{x:old.x+old.w,y:old.y+old.h})<18/camera.z;
    const item=resize?old:[...board.items].reverse().find(i=>hitTest(i,p,8/camera.z));
    selected=item?.id||null;
    if(item)gesture={mode:resize?'resize':'move',before,start:p,original:resize?{...structuredClone(item),fontSize:textMetrics(item).size}:structuredClone(item)};
    scheduleRender();return;
  }
  if(tool==='text'){gesture={mode:'text',before,start:p,screen,moved:false};return;}
  if(tool==='eraser'){gesture={mode:'erase',before,last:p};eraseAt(p);return;}
  if(board.items.length>=LIMITS.items){toast('Guarda esta pizarra antes de empezar otra.');pointers.clear();return;}
  const item={id:uid(),type:tool==='pen'?'stroke':tool,color,width:thickness*(tool==='pen'?(brush==='highlight'?4:brush==='marker'?2:1):1),opacity:tool==='pen'?(brush==='highlight'?.28:brush==='marker'?.65:1):1,smooth:tool==='pen'&&smooth,points:[p]};
  if(tool!=='pen')item.points.push(p);
  board.items.push(item);gesture={mode:'draw',id:item.id,before};scheduleRender();
});
boardEl.addEventListener('pointermove',event=>{
  const screen=point(event);updateEraser(screen,event.pointerType);if(!pointers.has(event.pointerId))return;
  pointers.set(event.pointerId,screen);if(!gesture)return;
  if(gesture.mode==='pinch'){
    if(pointers.size<2)return;const [a,b]=[...pointers.values()];
    camera=pinchCamera(gesture,a,b);moveCamera(camera.x,camera.y);return;
  }
  if(gesture.mode==='pan'){moveCamera(gesture.camera.x+screen.x-gesture.start.x,gesture.camera.y+screen.y-gesture.start.y);return;}
  const p=toWorld(screen);
  if(gesture.mode==='move'){replaceItem(translated(gesture.original,p.x-gesture.start.x,p.y-gesture.start.y));return;}
  if(gesture.mode==='resize'){const old=gesture.original;replaceItem(resizedObject(old,old.w+p.x-gesture.start.x,old.h+p.y-gesture.start.y));return;}
  if(gesture.mode==='text'){gesture.moved ||= distance(screen,gesture.screen)>8;return;}
  if(gesture.mode==='erase'){eraseBetween(gesture.last,p);gesture.last=p;return;}
  if(gesture.mode==='draw'){
    const item=board.items.find(i=>i.id===gesture.id);if(!item)return;
    if(item.type!=='stroke'){let end=p;if(event.shiftKey){const start=item.points[0],angle=Math.round(Math.atan2(p.y-start.y,p.x-start.x)/(Math.PI/4))*(Math.PI/4),length=distance(start,p);end={x:start.x+Math.cos(angle)*length,y:start.y+Math.sin(angle)*length};}replaceItem({...item,points:[item.points[0],end]});return;}
    const events=event.getCoalescedEvents?.()||[event],next=item.points.slice();
    for(const e of events.length?events:[event]){const value=toWorld(point(e));if(distance(next.at(-1),value)>.6/camera.z&&next.length<12000)next.push(value);}
    replaceItem({...item,points:next});
  }
});
function endPointer(event,cancel=false){
  if(!pointers.has(event.pointerId))return;
  if(!cancel&&gesture?.mode==='draw'){
    const item=board.items.find(i=>i.id===gesture.id),p=toWorld(point(event));
    if(item&&distance(item.points.at(-1),p)>.1&&item.points.length<12000){let end=p;if(item.type!=='stroke'&&event.shiftKey){const start=item.points[0],angle=Math.round(Math.atan2(p.y-start.y,p.x-start.x)/(Math.PI/4))*(Math.PI/4),length=distance(start,p);end={x:start.x+Math.cos(angle)*length,y:start.y+Math.sin(angle)*length};}replaceItem({...item,points:item.type==='stroke'?[...item.points,p]:[item.points[0],end]});}
  }
  pointers.delete(event.pointerId);
  if(gesture?.mode==='pinch'){
    const remaining=[...pointers.values()];
    if(remaining.length>=2)gesture={mode:'pinch',...startPinch(camera,remaining[0],remaining[1])};
    else if(remaining.length===1)gesture={mode:'pan',start:remaining[0],camera:{...camera}};
    else{gesture=null;boardEl.classList.remove('is-dragging');}
    changed();return;
  }
  if(gesture?.mode==='text'){
    const pending=gesture;finishInteraction(cancel);
    if(!cancel&&!pending.moved){editing={position:pending.start};$('text-value').value='';showDialog('text-dialog');$('text-value').focus();}
    return;
  }
  if(gesture?.mode==='pan'){gesture=null;boardEl.classList.remove('is-dragging');changed();return;}
  finishInteraction(cancel);
}
boardEl.addEventListener('pointerup',event=>endPointer(event));boardEl.addEventListener('pointercancel',event=>endPointer(event,true));
boardEl.addEventListener('lostpointercapture',event=>{if(pointers.has(event.pointerId))endPointer(event,true);});
boardEl.addEventListener('pointerleave',()=>$('eraser-cursor').hidden=true);
boardEl.addEventListener('contextmenu',event=>event.preventDefault());
boardEl.addEventListener('dblclick',event=>{if(tool!=='select')return;const p=toWorld(point(event)),item=[...board.items].reverse().find(i=>!isPath(i)&&hitTest(i,p,0));if(item){selected=item.id;editText();}});
boardEl.addEventListener('wheel',event=>{event.preventDefault();finishInteraction();if(event.ctrlKey||event.metaKey)zoomTo(camera.z*Math.exp(-event.deltaY*.008),point(event));else{const factor=event.deltaMode===1?16:1;moveCamera(camera.x-event.deltaX*factor,camera.y-event.deltaY*factor);changed();}},{passive:false});
function showDialog(id){finishInteraction();$('menu-panel').hidden=true;$('menu').setAttribute('aria-expanded','false');$(id).showModal();}
function ask(title,message,action){pendingConfirm=action;$('confirm-title').textContent=title;$('confirm-message').textContent=message;$('confirm-dialog').returnValue='cancel';showDialog('confirm-dialog');}
$('confirm-dialog').addEventListener('close',()=>{const action=pendingConfirm;pendingConfirm=null;if($('confirm-dialog').returnValue==='accept')action?.();});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
$('toolbar').addEventListener('click',event=>{const button=event.target.closest('[data-tool]');if(button)setTool(button.dataset.tool);});
$('brush-options').addEventListener('click',event=>{const button=event.target.closest('[data-brush]');if(!button)return;brush=button.dataset.brush;document.querySelectorAll('[data-brush]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));});
$('colors').addEventListener('click',event=>{const button=event.target.closest('[data-color]');if(button)updateColor(button.dataset.color);});
$('thickness').addEventListener('input',()=>{thickness=Number($('thickness').value);$('thickness-value').value=thickness;$('stroke-preview').style.height=$('stroke-preview').style.width=`${Math.min(18,thickness)}px`;});
$('thickness').addEventListener('change',()=>{const item=selection();if(item&&isPath(item)){replaceItem({...item,width:thickness});commit();}});
$('smooth').addEventListener('click',()=>{smooth=!smooth;$('smooth').setAttribute('aria-pressed',String(smooth));toast(smooth?'Suavizado y corrección de líneas activados':'Trazo libre, sin corrección');});
$('objects-grid').addEventListener('click',event=>{const button=event.target.closest('[data-kind]');if(!button)return;const center=toWorld(screenCenter()),item=createObject(button.dataset.kind,center.x-90,center.y-65,color);board.items.push(item);$('objects-dialog').close();setTool('select');selected=item.id;commit();toast('Arrastra para mover. Toca el lápiz para editar el texto.');});
function editText(){const item=selection();if(!item||isPath(item))return;editing={id:item.id};$('text-value').value=item.text;showDialog('text-dialog');$('text-value').focus();}
$('text-form').addEventListener('submit',event=>{
  event.preventDefault();const text=$('text-value').value.trim();
  if(editing?.id){const item=selection();if(item){const next={...item,text};replaceItem(item.kind==='text'?sizeFreeText(next,measureLabel):next);}}
  else if(editing?.position&&text){const item=sizeFreeText({...createObject('text',editing.position.x,editing.position.y,color),fontSize,text},measureLabel);board.items.push(item);setTool('select');selected=item.id;}
  editing=null;$('text-dialog').close();commit();
});
function duplicate(){const item=selection();if(!item)return;const next={...translated(item,24/camera.z,24/camera.z),id:uid()};board.items.push(next);selected=next.id;commit();}
function removeSelected(){if(!selected)return;board.items=board.items.filter(i=>i.id!==selected);selected=null;commit();}
$('edit-item').addEventListener('click',editText);$('duplicate').addEventListener('click',duplicate);$('delete-item').addEventListener('click',removeSelected);
$('bring-front').addEventListener('click',()=>{const item=selection();if(item){board.items=board.items.filter(i=>i.id!==selected);board.items.push(item);commit();}});
$('undo').addEventListener('click',()=>applyHistory('undo'));$('redo').addEventListener('click',()=>applyHistory('redo'));
$('zoom-in').addEventListener('click',()=>zoomTo(camera.z*1.25));$('zoom-out').addEventListener('click',()=>zoomTo(camera.z/1.25));$('zoom-reset').addEventListener('click',()=>zoomTo(1));$('fit').addEventListener('click',fit);
$('grid').addEventListener('click',()=>{const enabled=$('grid').getAttribute('aria-pressed')!=='true';$('grid').setAttribute('aria-pressed',String(enabled));$('grid-bg').setAttribute('visibility',enabled?'visible':'hidden');});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else{document.body.classList.toggle('focus-mode');toast('Vista despejada. En iPhone, añade la app a inicio para ocultar el navegador.');}}catch{document.body.classList.toggle('focus-mode');toast('Vista despejada activada.');}});
$('help').addEventListener('click',()=>showDialog('help-dialog'));$('export').addEventListener('click',()=>showDialog('export-dialog'));
$('menu').addEventListener('click',()=>{$('menu-panel').hidden=!$('menu-panel').hidden;$('menu').setAttribute('aria-expanded',String(!$('menu-panel').hidden));});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#menu-panel,#menu')){$('menu-panel').hidden=true;$('menu').setAttribute('aria-expanded','false');}});
$('board-title').value=board.title;$('board-title').addEventListener('change',()=>{board.title=$('board-title').value.trim()||'Mi pizarra';$('board-title').value=board.title;commit();});
function filename(extension){return `${board.title.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,60)||'Koi-pizarra'}.${extension}`;}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function saveFile(){finishInteraction();download(new Blob([JSON.stringify(board)],{type:'application/json'}),filename('koi.json'));toast('Copia editable preparada para descargar.');}
$('export-json').addEventListener('click',()=>{saveFile();$('export-dialog').close();});
$('export-png').addEventListener('click',async()=>{
  if(!board.items.length){toast('Dibuja algo antes de exportar una imagen.');return;}
  const button=$('export-png');button.disabled=true;let url;
  try{const data=exportSVG(board.items),scale=Math.min(2,4096/data.width,4096/data.height,Math.sqrt(12000000/(data.width*data.height)));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(data.width*scale));canvas.height=Math.max(1,Math.round(data.height*scale));
    url=URL.createObjectURL(new Blob([data.source],{type:'image/svg+xml'}));const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    const ctx=canvas.getContext('2d');if(!ctx)throw Error();ctx.drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();download(blob,filename('png'));$('export-dialog').close();toast('Imagen lista. Incluye todo el contenido de tu pizarra.');
  }catch{toast('No se pudo crear la imagen. Guarda la pizarra editable.');}finally{if(url)URL.revokeObjectURL(url);button.disabled=false;}
});
function loadExample(){const action=()=>{board=exampleBoard();selected=null;$('board-title').value=board.title;commit();fit();};if(board.items.length)ask('¿Cargar el ejemplo?','Sustituye la pizarra actual. Puedes deshacerlo o guardar antes una copia.',action);else action();}
$('empty-example').addEventListener('click',loadExample);
$('menu-panel').addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;$('menu-panel').hidden=true;$('menu').setAttribute('aria-expanded','false');if(action==='save')saveFile();if(action==='open')$('file-input').click();if(action==='example')loadExample();if(action==='clear'&&board.items.length)ask('¿Vaciar la pizarra?','Se borrarán todos los elementos. Puedes deshacer este cambio.',()=>{board=emptyBoard();selected=null;$('board-title').value=board.title;camera={x:0,y:0,z:1};commit();});});
$('file-input').addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{if(file.size>LIMITS.file)throw new Error('El archivo es demasiado grande. Máximo: 4 MB.');const incoming=validateBoard(JSON.parse(await file.text()));const apply=()=>{board=incoming;selected=null;$('board-title').value=board.title;commit();fit();toast('Pizarra abierta. Ya puedes seguir editándola.');};if(board.items.length)ask('¿Abrir esta pizarra?','Sustituye el contenido actual. Puedes deshacerlo o guardar antes una copia.',apply);else apply();}catch(error){toast(error instanceof SyntaxError?'El archivo no contiene una pizarra JSON válida.':error.message||'No se pudo abrir la pizarra.');}});
window.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase(),mod=event.ctrlKey||event.metaKey,dialogOpen=!!document.querySelector('dialog[open]');
  if(mod&&['+','=','-','0'].includes(key)){event.preventDefault();if(!dialogOpen)zoomTo(key==='0'?1:camera.z*(key==='-'?.8:1.25));return;}
  if(dialogOpen||event.target.closest('input,textarea,[contenteditable]'))return;
  if(mod&&key==='z'){event.preventDefault();applyHistory(event.shiftKey?'redo':'undo');return;}
  if(mod&&key==='y'){event.preventDefault();applyHistory('redo');return;}
  if(mod&&key==='s'){event.preventDefault();saveFile();return;}
  if(mod&&key==='d'){event.preventDefault();duplicate();return;}
  if(mod)return;
  if(key==='escape'){finishInteraction(true);selected=null;$('menu-panel').hidden=true;scheduleRender();return;}
  if(key===' '&&event.target===boardEl){event.preventDefault();space=true;return;}
  if(key==='delete'||key==='backspace'){if(selected){event.preventDefault();removeSelected();}return;}
  if(key==='enter'&&selected&&event.target===boardEl){event.preventDefault();editText();return;}
  if(event.key.startsWith('Arrow')&&selected){event.preventDefault();const amount=event.shiftKey?10:1;replaceItem(translated(selection(),key==='arrowleft'?-amount:key==='arrowright'?amount:0,key==='arrowup'?-amount:key==='arrowdown'?amount:0));commit();return;}
  const next={v:'select',h:'hand',p:'pen',e:'eraser',a:'arrow',l:'line',t:'text',o:'objects'}[key];if(next){event.preventDefault();setTool(next);}
});
window.addEventListener('keyup',event=>{if(event.key===' ')space=false;});window.addEventListener('blur',()=>{space=false;finishInteraction(true);});
window.addEventListener('pagehide',()=>{finishInteraction();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){finishInteraction();save();}});
window.addEventListener('beforeunload',event=>{if(storageFailed&&dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('resize',scheduleRender);
setTool('pen');render();
if(restoreError)toast('No se pudo restaurar la copia local. Puedes abrir una copia descargada.');
