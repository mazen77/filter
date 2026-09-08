const $=s=>document.querySelector(s), canvas=$("#stage"),ctx=canvas.getContext("2d",{alpha:false}),video=$("#camera");
const ui={intro:$("#intro"),loading:$("#loading"),error:$("#errorPanel"),errorText:$("#errorText"),guide:$("#guide"),guideTitle:$("#guideTitle"),guideText:$("#guideText"),controls:$("#controls"),reveal:$("#reveal"),worldName:$("#worldName"),result:$("#resultPanel"),preview:$("#preview"),resultName:$("#resultName"),record:$("#recordBtn")};
const worlds=[
 {name:"النيون الأسود",filter:"grayscale(.6) contrast(1.45) hue-rotate(165deg) saturate(2)"},
 {name:"عالم الحلوى",filter:"contrast(1.18) saturate(2.4) hue-rotate(298deg)"},
 {name:"السفر عبر الزمن",filter:"sepia(.9) contrast(1.2) brightness(.9)"},
 {name:"العالم المتجمّد",filter:"saturate(1.6) hue-rotate(145deg) brightness(1.15)"},
 {name:"الحلم الرقمي",filter:"contrast(1.4) saturate(2) hue-rotate(44deg)"},
 {name:"عالم المرآة",filter:"contrast(1.12) saturate(1.35)",mirror:true},
 {name:"عالم البكسل",filter:"contrast(1.25) saturate(1.8)",pixel:true},
 {name:"عالم الكوميكس",filter:"contrast(1.8) saturate(2.5) brightness(1.05)"}
];
let landmarker,stream,running=false,processing=false,lastVideoTime=-1,lastDetect=0,world=0,closed=false,closeFrames=0,revealUntil=0,particles=[],facing="user",recorder,chunks=[],latestBlob=null,frameHandle,trackingError="";
const off=document.createElement("canvas"),ox=off.getContext("2d");

function fit(){const d=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);}
function size(){return {w:canvas.clientWidth,h:canvas.clientHeight}}
function show(el,on=true){el.classList.toggle("hidden",!on)}
function tone(freq=520,duration=.09,type="sine"){try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.7,a.currentTime+duration);g.gain.setValueAtTime(.07,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+duration)}catch{}}

async function init(){
 show(ui.intro,false);show(ui.error,false);show(ui.loading,true);
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error("هذا المتصفح لا يدعم الوصول إلى الكاميرا.");
  if(typeof Hands==="undefined")throw new Error("تعذّر تحميل نظام تتبع اليد. تحقق من اتصال الإنترنت ثم أعد المحاولة.");
  const modelRoot=location.protocol==="file:"
   ?"https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/"
   :new URL("./vendor/mediapipe/",document.baseURI).href;
  landmarker=new Hands({locateFile:file=>modelRoot+file});
  landmarker.setOptions({maxNumHands:2,modelComplexity:0,minDetectionConfidence:.45,minTrackingConfidence:.45});
  landmarker.onResults(r=>{trackingError="";window.__lastHands=r.multiHandLandmarks||[]});
  await startCamera();running=true;show(ui.loading,false);show(ui.guide);show(ui.controls);fit();loop();
 }catch(e){show(ui.loading,false);show(ui.error);ui.errorText.textContent=e?.name==="NotAllowedError"?"اسمح باستخدام الكاميرا من إعدادات المتصفح، ثم حاول مجدداً.":(e.message||"تعذّر تشغيل التجربة على هذا الجهاز.")}
}
async function startCamera(){if(stream)stream.getTracks().forEach(t=>t.stop());const landscape=innerWidth>innerHeight,w=landscape?1280:720,h=landscape?720:1280;stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:w},height:{ideal:h},aspectRatio:{ideal:w/h},frameRate:{ideal:24,max:30}}});video.srcObject=stream;await video.play()}
function point(lm,i,w,h){return {x:(1-lm[i].x)*w,y:lm[i].y*h}}
function polyPath(p){ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath()}
function drawVideo(w,h){const va=video.videoWidth/video.videoHeight,ca=w/h;let dw,dh,dx,dy;if(va>ca){dw=w;dh=w/va;dx=0;dy=(h-dh)/2}else{dh=h;dw=h*va;dx=(w-dw)/2;dy=0}ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(video,dx,dy,dw,dh);ctx.restore();return {dw,dh,dx,dy}}
function mapPoint(lm,i,box,w){const vx=lm[i].x*box.dw+box.dx;return{x:w-vx,y:lm[i].y*box.dh+box.dy}}
function drawTracking(lms,box,w){for(const lm of lms){for(const i of [4,8]){const p=mapPoint(lm,i,box,w);ctx.save();ctx.shadowBlur=14;ctx.shadowColor="#00f0ff";ctx.fillStyle=i===8?"#00f0ff":"#b7ff00";ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.restore()}}}
function portal(lms,box,w,h,now){
 const hands=lms.map(l=>({l,c:(1-l[9].x)*w})).sort((a,b)=>a.c-b.c);if(hands.length<2)return false;
 const left=hands[0].l,right=hands[1].l,p=[mapPoint(left,8,box,w),mapPoint(right,8,box,w),mapPoint(right,4,box,w),mapPoint(left,4,box,w)];
 const width=(Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)+Math.hypot(p[2].x-p[3].x,p[2].y-p[3].y))/2,energy=Math.max(0,Math.min(1,1-width/(w*.48)));
 const activeWorld=worlds[world];
 ctx.save();polyPath(p);ctx.clip();ctx.filter=activeWorld.animated?`contrast(1.45) saturate(3) hue-rotate(${(now/12)%360}deg)`:activeWorld.filter;
 if(activeWorld.pixel){off.width=30;off.height=Math.max(40,Math.round(30*h/w));ox.setTransform(1,0,0,1,0,0);ox.clearRect(0,0,off.width,off.height);ox.translate(off.width,0);ox.scale(-1,1);ox.drawImage(video,0,0,off.width,off.height);ox.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,w,h);ctx.imageSmoothingEnabled=true}
 else if(activeWorld.mirror){ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0,w,h);ctx.restore()}
 else if(activeWorld.animated){const pulse=1+.045*Math.sin(now/110);ctx.save();ctx.translate(w/2,h/2);ctx.scale(pulse,pulse);ctx.translate(-w/2,-h/2);drawVideo(w,h);ctx.globalCompositeOperation='screen';ctx.globalAlpha=.22+.12*Math.sin(now/85);ctx.filter=`hue-rotate(${180+(now/8)%180}deg) saturate(4)`;ctx.translate(Math.sin(now/70)*10,Math.cos(now/90)*7);drawVideo(w,h);ctx.restore()}
 else drawVideo(w,h);
 if(activeWorld.scary){ctx.save();ctx.globalCompositeOperation='multiply';const fear=ctx.createRadialGradient(w/2,h*.45,w*.04,w/2,h*.45,w*.58);fear.addColorStop(0,'rgba(120,0,0,.05)');fear.addColorStop(.55,'rgba(80,0,0,.28)');fear.addColorStop(1,'rgba(0,0,0,.92)');ctx.fillStyle=fear;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='screen';ctx.globalAlpha=.18+.12*Math.sin(now/55);ctx.fillStyle='#ff0018';for(let y=(now/6)%18;y<h;y+=18)ctx.fillRect(0,y,w,2);ctx.restore()}
 ctx.restore();ctx.filter="none";
 for(let n=3;n>0;n--){ctx.save();ctx.shadowBlur=n*8+energy*20;ctx.shadowColor=n%2?"#ff3bd4":"#53e8ff";polyPath(p);ctx.strokeStyle=n===1?"#fff":n===2?"#53e8ff":"#ff3bd4";ctx.globalAlpha=n===1?1:.42;ctx.lineWidth=n*3+energy*5;ctx.stroke();ctx.restore()}
 const center=p.reduce((a,v)=>({x:a.x+v.x/4,y:a.y+v.y/4}),{x:0,y:0});if(energy>.35&&Math.random()<.55)particles.push({x:center.x,y:center.y,a:Math.random()*6.28,s:2+Math.random()*5,life:1});
 if(width<w*.25)closeFrames++;else closeFrames=0;
 if(!closed&&closeFrames>=4){closed=true;closeFrames=0;let next;do next=Math.floor(Math.random()*worlds.length);while(next===world);world=next;revealUntil=now+1450;tone(280,.18,"sawtooth");burst(center)}else if(closed&&width>w*.34)closed=false;
 ui.guideTitle.textContent=closed?"أبعد يديك لإظهار النتيجة":energy>.45?"استمر في التقريب…":"قرّب يديك";ui.guideText.textContent=worlds[world].name;
 return true;
}
function burst(c){for(let i=0;i<55;i++)particles.push({x:c.x,y:c.y,a:Math.random()*6.28,s:3+Math.random()*11,life:1})}
function drawParticles(){for(const p of particles){p.x+=Math.cos(p.a)*p.s;p.y+=Math.sin(p.a)*p.s;p.life-=.025;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=Math.random()>.5?"#ff62dc":"#65efff";ctx.beginPath();ctx.arc(p.x,p.y,1+p.life*3,0,7);ctx.fill()}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0)}
function loop(now=performance.now()){
 if(!running)return;const {w,h}=size();ctx.clearRect(0,0,w,h);const box=drawVideo(w,h);let results=null;
 if(!processing&&video.readyState>=2&&video.currentTime!==lastVideoTime&&now-lastDetect>80){lastVideoTime=video.currentTime;lastDetect=now;processing=true;Promise.resolve(landmarker.send({image:video})).catch(e=>{trackingError=e?.message||String(e);console.error("Hand tracking:",e)}).finally(()=>{processing=false})}results={landmarks:window.__lastHands||[]};
 drawTracking(results.landmarks,box,w);const seen=results.landmarks.length===2&&portal(results.landmarks,box,w,h,now);if(!seen){ui.guideTitle.textContent=trackingError?"خطأ في نظام تتبع اليد":results.landmarks.length===1?"تم رصد يد واحدة — أظهر اليد الأخرى":"أظهر كلتا يديك";ui.guideText.textContent=trackingError?trackingError:results.landmarks.length?"ابتعد قليلاً حتى تظهر اليدان بالكامل":"ستضيء أطراف الإبهام والسبابة عند رصدها"}
 drawParticles();if(now<revealUntil){show(ui.reveal);ui.worldName.textContent=worlds[world].name;const a=(revealUntil-now)/1450;ctx.fillStyle=`rgba(255,45,210,${a*.18})`;ctx.fillRect(0,0,w,h)}else show(ui.reveal,false);
 frameHandle=requestAnimationFrame(loop);
}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function snapshot(){const p=ui.preview,ratio=9/14,w=720,h=1120;p.width=w;p.height=h;const sw=canvas.width,sh=canvas.height,sr=sw/sh;let sx=0,sy=0,cw=sw,ch=sh;if(sr>ratio){cw=sh*ratio;sx=(sw-cw)/2}else{ch=sw/ratio;sy=(sh-ch)/2}p.getContext("2d").drawImage(canvas,sx,sy,cw,ch,0,0,w,h);ui.resultName.textContent=worlds[world].name;show(ui.result);p.toBlob(b=>latestBlob=b,"image/jpeg",.92)}
function toggleRecord(){if(recorder?.state==="recording"){recorder.stop();ui.record.classList.remove("recording");return}chunks=[];const ms=canvas.captureStream(30);const type=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";recorder=new MediaRecorder(ms,{mimeType:type});recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);recorder.onstop=()=>{latestBlob=new Blob(chunks,{type});download(latestBlob,`portal-${Date.now()}.webm`)};recorder.start();ui.record.classList.add("recording");tone(700)}
$("#startBtn").onclick=init;$("#retryBtn").onclick=init;if($("#recordBtn"))$("#recordBtn").onclick=toggleRecord;if($("#saveBtn"))$("#saveBtn").onclick=snapshot;$("#againBtn").onclick=()=>show(ui.result,false);
$("#flipBtn").onclick=async()=>{facing=facing==="user"?"environment":"user";await startCamera()};
if($("#soundBtn"))$("#soundBtn").onclick=()=>tone(600,.12);
$("#shareBtn").onclick=async()=>{if(!latestBlob)return;const file=new File([latestBlob],`portal-${Date.now()}.jpg`,{type:latestBlob.type});if(navigator.canShare?.({files:[file]}))await navigator.share({title:`دخلت ${worlds[world].name}`,text:"أي عالم سيختارك؟",files:[file]});else download(latestBlob,file.name)};
addEventListener("resize",fit);addEventListener("beforeunload",()=>{cancelAnimationFrame(frameHandle);stream?.getTracks().forEach(t=>t.stop())});
