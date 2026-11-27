"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
// Vollständiges App-Script; DOM, Canvas, Dateileser und Netzwerk werden simuliert.
// Keine Live-Anfragen und keine Zusatzpakete.

function createApp(html,options){
 options=options||{};
 var markup=html.slice(0,html.lastIndexOf("<script>")).replace(/<script>[\s\S]*?<\/script>/g,"").replace(/<style>[\s\S]*?<\/style>/g,"");
 var elements={},all=[],draws=[],timers=new Map(),nextTimer=0,requestLog=[];
 var micro=function(fn){Promise.resolve().then(fn)};
 function setTimer(fn,ms){var id=++nextTimer;timers.set(id,{fn:fn,ms:ms});if(ms<=30)micro(function(){if(timers.has(id)){timers.delete(id);fn()}});return id}
 function clearTimer(id){timers.delete(id)}
 function attrs(s){var out={},re=/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g,m;
  while((m=re.exec(s)))out[m[1]]=m[2]!=null?m[2]:m[3]!=null?m[3]:m[4]!=null?m[4]:"";return out}
 function element(tag,at){
  at=at||{};var list=new Set((at.class||"").split(/\s+/).filter(Boolean)),val=at.value||"",inner="";
  var e={tagName:tag.toUpperCase(),id:at.id||"",attributes:at,dataset:{},style:{},checked:"checked" in at,disabled:"disabled" in at,textContent:"",width:300,height:150,clientWidth:900,listeners:{},
   classList:{add:function(n){list.add(n)},remove:function(n){list.delete(n)},contains:function(n){return list.has(n)},toggle:function(n,force){var active=force==null?!list.has(n):force;active?list.add(n):list.delete(n);return active}},
   addEventListener:function(t,fn){(e.listeners[t]||(e.listeners[t]=[])).push(fn)},
   setAttribute:function(k,v){at[k]=v},getAttribute:function(k){return at[k]},removeAttribute:function(k){delete at[k]},
   scrollIntoView:function(){},click:function(){e.fire("click")},remove:function(){},appendChild:function(){},setPointerCapture:function(){},
   getBoundingClientRect:function(){return {left:0,top:0,width:e.width,height:e.height}},
   fire:function(t){var ev={target:e,type:t,preventDefault:function(){},stopPropagation:function(){}};if(e["on"+t])e["on"+t].call(e,ev);(e.listeners[t]||[]).forEach(function(fn){fn.call(e,ev)})}
  };
  Object.keys(at).filter(function(k){return k.indexOf("data-")===0}).forEach(function(k){e.dataset[k.slice(5)]=at[k]});
  Object.defineProperty(e,"value",{get:function(){return val},set:function(v){val=String(v)}});
  Object.defineProperty(e,"innerHTML",{get:function(){return inner},set:function(s){
   inner=s;if(tag.toLowerCase()==="select"){var opts=[...s.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(function(m){var a=attrs(m[1]);return {value:a.value==null?m[2]:a.value,selected:"selected" in a}});
    val=opts.length?(opts.find(function(o){return o.selected})||opts[0]).value:"";
   }
  }});
  if(tag.toLowerCase()==="canvas"){
   var ctx={fillRect:function(){},clearRect:function(){},beginPath:function(){},moveTo:function(){},lineTo:function(){},stroke:function(){},arc:function(){},fill:function(){},fillText:function(){},putImageData:function(){},
    drawImage:function(){draws.push([...arguments])},measureText:function(t){return {width:String(t).length*6}},
    createRadialGradient:function(){return {addColorStop:function(){}}},
    createImageData:function(w,h){return {data:new Uint8ClampedArray(w*h*4)}}
   };
   e.getContext=function(){return ctx};
   e.toBlob=function(cb,type){if(options.toBlob)return options.toBlob(cb,type,e);micro(function(){cb({size:options.blobSize||100,type:type})})};
  }
  if(e.id){if(elements[e.id])throw Error("Duplicate id: "+e.id);elements[e.id]=e}all.push(e);return e;
 }
 var m,re=/<([a-zA-Z][\w-]*)\b([^<>]*)>/g;
 while((m=re.exec(markup))){var at=attrs(m[2]);if(at.id||at["data-o"]||at["data-t"]||m[1]==="input")element(m[1],at)}
 for(var sm of markup.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)){var sa=attrs(sm[1]);if(sa.id)elements[sa.id].innerHTML=sm[2]}
 var root=element("html"),document={
  getElementById:function(id){if(!elements[id])throw Error("Missing DOM element: "+id);return elements[id]},
  createElement:function(tag){return element(tag)},
  documentElement:root,body:element("body"),addEventListener:function(){},
  querySelectorAll:function(selector){
   if(selector===".in,#fF,#fW,#chgT,#cropToo")return all.filter(function(e){return e.classList.contains("in")||["fF","fW","chgT","cropToo"].includes(e.id)});
   if(selector==="[data-o]")return all.filter(function(e){return "o" in e.dataset});
   if(selector==="[data-t]")return all.filter(function(e){return "t" in e.dataset});
   throw Error("Unhandled selector: "+selector);
  },
  querySelector:function(selector){if(selector==='input[name=exF]:checked')return all.find(function(e){return e.attributes.name==="exF"&&e.checked})||null;throw Error("Unhandled selector "+selector)}
 };
 class Controller{
  constructor(){this.signal={aborted:false}}
  abort(){this.signal.aborted=true;if(this.onabort)this.onabort()}
 }
 class Reader{
  readAsDataURL(blob){
   var self=this;function finish(){if(options.fileReaderError){if(self.onerror)self.onerror();return}self.result=blob.dataURL||"data:image/png;base64,TEST_COPY";if(self.onload)self.onload()}
   if(options.reader)options.reader(blob,finish);else micro(finish);
  }
  readAsArrayBuffer(blob){var self=this;blob.arrayBuffer().then(function(b){self.result=b;if(self.onload)self.onload()})}
 }
 class Img{
  constructor(){this.naturalWidth=options.imageWidth||6000;this.naturalHeight=options.imageHeight||4000}
  set src(v){this._src=v;var self=this;micro(function(){if(options.imageError){if(self.onerror)self.onerror()}else if(self.onload)self.onload()})}
 }
 var storage={},localStorage={getItem:function(k){return storage[k]||null},setItem:function(k,v){storage[k]=v}};
 var matchMedia=function(){return {matches:false,addEventListener:function(){}}};
 var window={innerHeight:1000,addEventListener:function(){},matchMedia:matchMedia};window.self=window.top=window;
 var fetcher=async function(url,init){requestLog.push({url:url,init:init});if(options.fetch)return options.fetch(url,init);return {ok:true,status:200,headers:{get:function(){return null}},json:async function(){return options.response||{solved:true,width:3000,height:2000,scale_arcsec:3.24,stats:{matches:30,rms_px:.3}}}}};
 var script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
 var api=Function("document","window","localStorage","matchMedia","Image","FileReader","AbortController","fetch","setTimeout","clearTimeout",
  script+"\nreturn {S:S,SV:SV,LSMSolver:LSMSolver,calc:calc,size:size,checks:checks,basis:basis,upd:upd,go:go,sample:sample,loadFile:loadFile,solverStart:solverStart,solverCancel:solverCancel,solverNewImage:solverNewImage,solverPrepare:solverPrepare,solverCurrent:solverCurrent,results:results,exportCanvas:exportCanvas};"
 )(document,window,localStorage,matchMedia,Img,Reader,Controller,fetcher,setTimer,clearTimer);
 return Object.assign(api,{elements:elements,draws:draws,requests:requestLog,document:document,
  timers:timers,runTimers:function(ms){for(var t of [...timers])if(t[1].ms===ms){timers.delete(t[0]);t[1].fn()}},
  set:function(id,value){elements[id].value=value;return elements[id]},
  image:function(w,h){api.solverNewImage();api.S.img={w:w||6000,h:h||4000,el:element("canvas"),name:"Test.png"};api.S.orig="unk";api.upd();return api.S.img}
 });
}


test("Start und Navigation senden keine Bilddaten",function(){
 var a=createApp(html);a.upd();a.go(1);assert.equal(a.requests.length,0);assert.equal(a.elements.svStart.disabled,true);
});
test("Solving ohne Bild ist gesperrt",async function(){
 var a=createApp(html);await a.solverStart();assert.equal(a.requests.length,0);
});
test("Generiertes Beispielbild kann nicht gelöst werden",async function(){
 var a=createApp(html);a.sample();await a.solverStart();assert.equal(a.requests.length,0);assert.equal(a.elements.svStart.disabled,true);assert.match(a.elements.svStatus.textContent,/generierte/);
});
test("Kleine Bilder werden nicht hochskaliert",function(){
 var a=createApp(html),g=a.LSMSolver.geometry(1000,700,"stars");assert.equal(g.factor,1);assert.equal(g.w,1000);assert.equal(g.h,700);
});
test("Verkleinerung bleibt auch bei ungeraden Bildmaßen isotrop",function(){
 var a=createApp(html),g=a.LSMSolver.geometry(6249,4177,"stars");
 assert.equal(g.w,3000);assert.ok(Math.abs(g.drawW/6249-g.drawH/4177)<1e-15);assert.ok(g.h-g.drawH>=0&&g.h-g.drawH<1);
});
test("Mondkopie nutzt maximal 2048 Pixel",function(){
 var a=createApp(html),g=a.LSMSolver.geometry(6000,4000,"moon");assert.equal(g.w,2048);assert.equal(g.h,1366);assert.equal(g.factor,2048/6000);
});
test("Ungültige Abmessungen werden abgelehnt",function(){
 var a=createApp(html);for(var n of [0,-1,NaN,Infinity,12.5])assert.throws(function(){a.LSMSolver.geometry(n,4000,"stars")});
});
test("Sternmaßstab wird auf die Originalpixel zurückgerechnet",function(){
 var a=createApp(html),r=a.LSMSolver.normalise({solved:true,width:3000,height:2000,scale_arcsec:3.24},"stars",{w:3000,h:2000,factor:.5});assert.equal(r.scale,1.62);
});
test("Abweichende Antwortabmessungen dürfen nicht kalibrieren",function(){
 var a=createApp(html);assert.throws(function(){a.LSMSolver.normalise({solved:true,width:2048,height:1000,scale_arcsec:3},"stars",{w:3000,h:2000,factor:.5})},/Bildgröße/);
});
test("Nicht endliche und nicht positive Sternmaßstäbe sind ungültig",function(){
 var a=createApp(html);for(var scale of [0,-1,NaN,Infinity,"1.62",null])assert.throws(function(){a.LSMSolver.normalise({solved:true,width:3000,height:2000,scale_arcsec:scale},"stars",{w:3000,h:2000,factor:.5})},/Maßstab/);
});
test("Panoramen werden nicht mit einem konstanten Maßstab übernommen",function(){
 var a=createApp(html);assert.throws(function(){a.LSMSolver.normalise({solved:true,width:3000,height:2000,scale_arcsec:3,projection:{family:"azimuthal"}},"stars",{w:3000,h:2000,factor:.5})},/Panorama/);
});
test("Mondmaßstab wird separat in km pro Originalpixel normalisiert",function(){
 var a=createApp(html),r=a.LSMSolver.normalise(moon(),"moon",{w:2048,h:1366,factor:2048/6000});
 assert.equal(r.kind,"moon");assert.ok(Math.abs(r.kmPx-(1737.4/400)*(2048/6000))<1e-12);assert.equal(r.scale,undefined);
});
test("Plausible Mondlösung wird auch bei solved true abgelehnt",function(){
 var a=createApp(html);assert.throws(function(){a.LSMSolver.normalise(moon({verdict:"plausible"}),"moon",{w:2048,h:1366,factor:2048/6000})},/nicht sicher bestätigt/);
});
test("Unsichere und fehlgeschlagene Mondlösungen werden abgelehnt",function(){
 var a=createApp(html);for(var data of [moon({verdict:"unsure"}),moon({solved:false})])assert.throws(function(){a.LSMSolver.normalise(data,"moon",{w:2048,h:1366,factor:2048/6000})});
});
test("Widersprüchlicher Mondradius und Maßstab werden abgelehnt",function(){
 var a=createApp(html);assert.throws(function(){a.LSMSolver.normalise(moon({scale_km_px:123}),"moon",{w:2048,h:1366,factor:2048/6000})},/widersprechen/);
});
test("Sternfeldanfrage überträgt nur die erzeugte Kopie",async function(){
 var a=createApp(html);var img=a.image();img.privateMetadata="must stay local";await a.solverStart();
 var req=a.requests[0],body=JSON.parse(req.init.body);
 assert.equal(req.url,"https://skysolver.app/api/v1/solve/image");assert.equal(req.init.credentials,"omit");assert.equal(req.init.referrerPolicy,"no-referrer");assert.equal(req.init.mode,"cors");
 assert.deepEqual(Object.keys(body).sort(),["image","time_limit_ms"]);assert.equal(body.time_limit_ms,12000);assert.match(body.image,/^data:image\/png;base64,/);assert.ok(!req.init.body.includes("must stay local"));
 assert.equal(a.S.img,img);assert.equal(img.w,6000);assert.equal(img.h,4000);
});
test("Automatische Sternkalibrierung benötigt keine Kamera oder Brennweite",async function(){
 var a=createApp(html);a.image();a.set("d","1000");await a.solverStart();
 var o=a.calc();assert.equal(o.sc,1.62);assert.equal(o.psUse,true);assert.equal(o.unv,false);
 assert.ok(!a.checks().some(function(c){return c.l==="r"}));assert.equal(a.elements.svUse.checked,true);
 assert.ok(Math.abs(a.size(o,100).k/9.4607304725808e12-2*1000*Math.tan(.045*Math.PI/360))<1e-12);
});
test("Manuelle Kalibrierung kann die automatische ersetzen",async function(){
 var a=createApp(html);a.image();await a.solverStart();a.set("ps","2,5").fire("input");a.elements.psUse.checked=true;a.elements.psUse.fire("change");
 assert.equal(a.elements.svUse.checked,false);assert.equal(a.calc().sc,2.5);assert.equal(a.calc().auto,null);
 a.elements.svUse.checked=true;a.elements.svUse.fire("change");assert.equal(a.elements.psUse.checked,false);assert.equal(a.calc().sc,1.62);
});
test("Ohne aktive Kalibrierung bleibt die Optikberechnung nutzbar",async function(){
 var a=createApp(html);a.image();a.set("fl","480");a.set("pxd","3,76");await a.solverStart();
 a.elements.svUse.checked=false;a.elements.svUse.fire("change");
 assert.ok(Math.abs(a.calc().sc-(648000/Math.PI)*3.76/1000/480)<1e-12);assert.equal(a.calc().unv,true);
});
test("Mondanfrage verwendet ihren eigenen Endpunkt und keine Sternparameter",async function(){
 var a=createApp(html,{response:moon()});a.image();a.set("svKind","moon").fire("change");await a.solverStart();
 assert.equal(a.requests[0].url,"https://skysolver.app/api/v1/solve/moon");assert.deepEqual(Object.keys(JSON.parse(a.requests[0].init.body)),["image"]);assert.equal(a.calc().moonUse,true);assert.equal(a.calc().psUse,false);
});
test("Mond-Kilometerwerte bleiben bei geänderter Entfernung konstant",async function(){
 var a=createApp(html,{response:moon()});a.image();a.set("svKind","moon").fire("change");await a.solverStart();
 var before=a.size(a.calc(),200).k,angle=a.size(a.calc(),200).as;a.set("dkm","405500").fire("input");
 assert.equal(a.size(a.calc(),200).k,before);assert.ok(a.size(a.calc(),200).as<angle);assert.ok(Number.isNaN(a.size(a.calc(),200).lo));
});
test("Ein Durchmesser über den kalibrierten Mond ergibt 3474,8 km",async function(){
 var a=createApp(html,{response:moon()});a.image();a.set("svKind","moon").fire("change");await a.solverStart();
 assert.ok(Math.abs(a.size(a.calc(),800/(2048/6000)).k-3474.8)<1e-9);
});
test("Mondzusammenfassung und Export kennzeichnen die projizierten Größen",async function(){
 var a=createApp(html,{response:moon()});a.image();a.set("svKind","moon").fire("change");await a.solverStart();
 a.S.shapes.push({t:"l",a:{x:100,y:100},b:{x:300,y:100},col:"#fff"});a.results(a.checks());
 assert.match(a.elements.sum.innerHTML,/Keine Strecken oder Flächen auf der gekrümmten Mondoberfläche/);
 assert.match(a.elements.res.innerHTML,/keine bezifferte Unsicherheit/);assert.match(a.basis(a.calc()).sc,/SkySolver · Mond/);
 assert.match(a.basis(a.calc()).dist,/nur zur Winkelanzeige/);
 var canvas=a.exportCanvas({lab:true,leg:true,bar:true,ban:true});assert.equal(canvas.width,6000);assert.ok(canvas.height>4000);
});
test("Mondkalibrierung kann nicht für Jupiter verwendet werden",async function(){
 var a=createApp(html,{response:moon()});a.image();a.set("svKind","moon").fire("change");await a.solverStart();a.set("sb","5").fire("change");
 assert.equal(a.calc().moonUse,false);assert.equal(a.elements.svUse.checked,false);assert.equal(a.elements.svUse.disabled,true);
});
test("Katalogwahl deaktiviert eine aktive Mondkalibrierung",async function(){
 var a=createApp(html,{response:moon()});a.image();a.set("svKind","moon").fire("change");await a.solverStart();a.set("cat","M42").fire("change");
 assert.equal(a.calc().moonUse,false);assert.equal(a.elements.svUse.checked,false);assert.equal(a.calc().dly,1344);
});
test("Mondmodus übernimmt keinen zuvor freien Jupiterabstand",function(){
 var a=createApp(html);a.image();a.set("ot","s");a.set("sb","5");a.set("stg","f");a.set("dkm","700000000");a.set("svKind","moon").fire("change");
 assert.equal(a.calc().dkm,384400);assert.equal(a.elements.sb.value,"0");
});
test("Sonne oder Planet ohne Sterne startet keinen ungeeigneten Solver",async function(){
 var a=createApp(html);a.image();a.set("svKind","other").fire("change");await a.solverStart();
 assert.equal(a.requests.length,0);assert.equal(a.elements.svStart.disabled,true);assert.match(a.elements.svHelp.textContent,/keinen eigenen Solver/);
});
test("Bildwechsel verwirft automatische und manuelle Kalibrierungen",async function(){
 var a=createApp(html);a.image();await a.solverStart();a.set("ps","5");a.elements.psUse.checked=true;a.solverNewImage();
 assert.equal(a.SV.result,null);assert.equal(a.elements.svUse.checked,false);assert.equal(a.elements.ps.value,"");assert.equal(a.elements.psUse.checked,false);assert.equal(a.S.orig,null);
});
test("Verspätete Antwort für ein anderes Bild wird ignoriert",async function(){
 var pending=defer(),a=createApp(html,{fetch:function(){return pending.promise}});a.image();
 var run=a.solverStart();await until(function(){return a.requests.length===1});var old=a.S.img;a.image(2000,1000);
 pending.resolve(reply(stars()));await run;
 assert.ok(a.S.img!==old);assert.equal(a.SV.result,null);assert.equal(a.elements.svUse.checked,false);assert.equal(a.SV.working,false);
});
test("Abgebrochene Anfrage kann keine neuere Kalibrierung überschreiben",async function(){
 var first=defer(),count=0,a=createApp(html,{fetch:function(){return ++count===1?first.promise:Promise.resolve(reply(stars({scale_arcsec:4})))}});a.image();
 var old=a.solverStart();await until(function(){return a.requests.length===1});a.solverCancel(false);await a.solverStart();
 first.resolve(reply(stars({scale_arcsec:20})));await old;assert.equal(a.calc().sc,2);
});
test("Abbruch beim Vorbereiten verhindert bereits den Upload",async function(){
 var release,a=createApp(html,{toBlob:function(cb){release=cb}});a.image();var run=a.solverStart();await until(function(){return !!release});a.solverCancel(false);release({size:100});await run;
 assert.equal(a.requests.length,0);assert.equal(a.SV.working,false);assert.equal(a.SV.result,null);
});
test("HTTP 200 mit solved false aktiviert keine Kalibrierung",async function(){
 var a=createApp(html,{response:stars({solved:false})});a.image();await a.solverStart();assert.equal(a.SV.result,null);assert.equal(a.elements.svUse.checked,false);assert.match(a.elements.svStatus.textContent,/Keine Sternfeld-Lösung/);
});
test("HTTP 429 berücksichtigt Retry-After und sperrt nur Online-Solving",async function(){
 var a=createApp(html,{fetch:function(){return Promise.resolve(reply({error:"busy"},429,"12"))}});a.image();a.set("fl","480");a.set("pxd","3,76");await a.solverStart();await a.solverStart();
 assert.equal(a.requests.length,1);assert.ok(a.SV.retryAt.stars>Date.now());assert.equal(a.elements.svStart.disabled,true);assert.ok(a.calc().sc>0);assert.match(a.elements.svStatus.textContent,/ausgelastet/);
});
test("Rate-Limit-Zeit funktioniert auch ohne lesbaren CORS-Header",function(){
 var a=createApp(html);assert.equal(a.LSMSolver.retryMs(null,{retry_after:15},0),15000);assert.equal(a.LSMSolver.retryMs(null,{},0),60000);
 assert.equal(a.LSMSolver.retryMs("Thu, 01 Jan 1970 00:01:00 GMT",{},0),60000);assert.equal(a.LSMSolver.retryMs("100000",{},0),3600000);
});
test("Serverausfall lässt die Optikmessung verfügbar",async function(){
 var a=createApp(html,{fetch:function(){return Promise.resolve(reply({},503))}});a.image();a.set("fl","480");a.set("pxd","3,76");await a.solverStart();
 assert.equal(a.SV.result,null);assert.ok(a.calc().sc>0);assert.equal(a.SV.working,false);assert.match(a.elements.svStatus.textContent,/momentan nicht verfügbar/);
});
test("Ungültige JSON-Antwort beendet den Wartezustand",async function(){
 var a=createApp(html,{fetch:function(){return Promise.resolve({ok:true,status:200,json:function(){return Promise.reject(Error("bad json"))}})}});a.image();await a.solverStart();
 assert.equal(a.SV.working,false);assert.equal(a.SV.result,null);assert.match(a.elements.svStatus.textContent,/keine lesbare Antwort/);
});
test("Netzwerkfehler erhält eine verständliche Meldung",async function(){
 var a=createApp(html,{fetch:function(){return Promise.reject(new TypeError("Failed to fetch"))}});a.image();await a.solverStart();
 assert.equal(a.SV.working,false);assert.match(a.elements.svStatus.textContent,/nicht erreichbar/);
});
test("Zeitüberschreitung bricht die Anfrage ab und entsperrt die Oberfläche",async function(){
 var pending=defer(),a=createApp(html,{fetch:function(){return pending.promise}});a.image();var run=a.solverStart();await until(function(){return a.requests.length===1});
 a.runTimers(65000);assert.equal(a.requests[0].init.signal.aborted,true);pending.reject(Error("AbortError"));await run;
 assert.equal(a.SV.working,false);assert.match(a.elements.svStatus.textContent,/Zeitüberschreitung/);
});
test("Nach Zeitüberschreitung wird auch eine verspätete erfolgreiche Antwort ignoriert",async function(){
 var pending=defer(),a=createApp(html,{fetch:function(){return pending.promise}});a.image();var run=a.solverStart();await until(function(){return a.requests.length===1});
 a.runTimers(65000);pending.resolve(reply(stars()));await run;assert.equal(a.SV.result,null);assert.match(a.elements.svStatus.textContent,/Zeitüberschreitung/);
});
test("Ein später fertig geladenes altes Bild ersetzt kein neueres Bild",async function(){
 var readers={},a=createApp(html,{reader:function(blob,finish){readers[blob.name]=finish}});
 var first=a.loadFile({name:"A.png",type:"image/png"}),second=a.loadFile({name:"B.png",type:"image/png"});readers["B.png"]();await second;readers["A.png"]();await first;
 assert.equal(a.S.img.name,"B.png");assert.equal(a.S.loading,false);
});
test("Während des Bildladens wird kein altes Bild zum Solving gesendet",async function(){
 var release,a=createApp(html,{reader:function(blob,finish){release=finish}});a.image();var loading=a.loadFile({name:"new.png",type:"image/png"});await a.solverStart();
 assert.equal(a.requests.length,0);assert.equal(a.elements.svStart.disabled,true);release();await loading;
 assert.equal(a.S.img.name,"new.png");assert.equal(a.S.orig,null);
});
test("Ein Beispielbild entwertet auch einen noch laufenden Dateiladevorgang",async function(){
 var release,a=createApp(html,{reader:function(blob,finish){release=finish}});var loading=a.loadFile({name:"old.png",type:"image/png"});a.sample();release();await loading;assert.equal(a.S.img.demo,true);assert.equal(a.S.loading,false);
});
test("Zu schmale Bilder werden vor dem Übertragen abgelehnt",async function(){
 var a=createApp(html);a.image(7,500);await a.solverStart();assert.equal(a.requests.length,0);assert.match(a.elements.svStatus.textContent,/zu schmal/);
});
test("Zu große PNG-Kopien werden kleiner erzeugt und korrekt umgerechnet",async function(){
 var calls=0,a=createApp(html,{toBlob:function(cb){cb({size:++calls===1?24000000:100})},response:stars({width:2250,height:1500,scale_arcsec:4.32})});a.image();await a.solverStart();
 assert.equal(calls,2);assert.equal(a.requests.length,1);assert.equal(a.calc().sc,1.62);
});
test("Anhaltend zu große PNG-Kopien werden nicht übertragen",async function(){
 var a=createApp(html,{blobSize:24000000});a.image();await a.solverStart();assert.equal(a.requests.length,0);assert.match(a.elements.svStatus.textContent,/zu groß/);assert.equal(a.SV.working,false);
});
function moon(extra){return Object.assign({solved:true,width:2048,height:1366,verdict:"verified",view:{R:400},scale_km_px:1737.4/400},extra)}
function stars(extra){return Object.assign({solved:true,width:3000,height:2000,scale_arcsec:3.24,stats:{matches:30,rms_px:.3}},extra)}
function reply(data,status,retry){return {ok:!status||status===200,status:status||200,headers:{get:function(){return retry||null}},json:async function(){return data}}}
function defer(){var resolve,reject,promise=new Promise(function(ok,ko){resolve=ok;reject=ko});return {promise:promise,resolve:resolve,reject:reject}}
async function until(condition){for(var i=0;i<100;i++){if(condition())return;await Promise.resolve()}throw Error("Asynchrone Bedingung nicht erreicht")}
