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
let landmarker,stream,running=false,processing=false,lastVideoTime=-1,lastDetect=0,world=0,previousWorld=0,transitionStart=-1,smoothPortalPoints=null,closed=false,closeFrames=0,switchReady=true,lastSwitchAt=0,revealUntil=0,particles=[],facing="user",recorder,chunks=[],latestBlob=null,frameHandle,trackingError="";
const off=document.createElement("canvas"),ox=off.getContext("2d");

function fit(){const d=Math.min(devicePixelRatio||1,1.25),r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);}
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
async function startCamera(){if(stream)stream.getTracks().forEach(t=>t.stop());const landscape=innerWidth>innerHeight,w=landscape?720:405,h=landscape?405:720;stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:w},height:{ideal:h},aspectRatio:{ideal:w/h},frameRate:{ideal:24,max:24}}});video.srcObject=stream;await video.play()}
function point(lm,i,w,h){return {x:(1-lm[i].x)*w,y:lm[i].y*h}}
function polyPath(p){ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath()}
function drawVideo(w,h){const va=video.videoWidth/video.videoHeight,ca=w/h;let dw,dh,dx,dy;if(va>ca){dw=w;dh=w/va;dx=0;dy=(h-dh)/2}else{dh=h;dw=h*va;dx=(w-dw)/2;dy=0}ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(video,dx,dy,dw,dh);ctx.restore();return {dw,dh,dx,dy}}
function mapPoint(lm,i,box,w){const vx=lm[i].x*box.dw+box.dx;return{x:w-vx,y:lm[i].y*box.dh+box.dy}}
function drawTracking(lms,box,w){for(const lm of lms){for(const i of [4,8]){const p=mapPoint(lm,i,box,w);ctx.save();ctx.shadowBlur=14;ctx.shadowColor="#00f0ff";ctx.fillStyle=i===8?"#00f0ff":"#b7ff00";ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.restore()}}}
function drawWorldView(activeWorld,w,h,now){ctx.save();const baseAlpha=ctx.globalAlpha;ctx.filter=activeWorld.animated?`contrast(1.35) saturate(2.4) hue-rotate(${(now/18)%360}deg)`:activeWorld.filter;if(activeWorld.pixel){off.width=30;off.height=Math.max(40,Math.round(30*h/w));ox.setTransform(1,0,0,1,0,0);ox.clearRect(0,0,off.width,off.height);ox.translate(off.width,0);ox.scale(-1,1);ox.drawImage(video,0,0,off.width,off.height);ox.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,w,h);ctx.imageSmoothingEnabled=true}else if(activeWorld.mirror){ctx.drawImage(video,0,0,w,h)}else drawVideo(w,h);ctx.filter='none';if(activeWorld.heat){ctx.globalAlpha=baseAlpha*.48;ctx.globalCompositeOperation='color-dodge';const thermal=ctx.createLinearGradient(0,h,0,0);thermal.addColorStop(0,'#17005d');thermal.addColorStop(.28,'#003cff');thermal.addColorStop(.52,'#ff006e');thermal.addColorStop(.76,'#ff8a00');thermal.addColorStop(1,'#fff36b');ctx.fillStyle=thermal;ctx.fillRect(0,0,w,h)}if(activeWorld.night){ctx.globalAlpha=baseAlpha*.28;ctx.globalCompositeOperation='screen';ctx.fillStyle='#25ff3a';for(let y=(now/12)%10;y<h;y+=10)ctx.fillRect(0,y,w,1);const night=ctx.createRadialGradient(w/2,h/2,w*.18,w/2,h/2,w*.68);night.addColorStop(0,'rgba(0,0,0,0)');night.addColorStop(1,'rgba(0,18,0,.92)');ctx.globalAlpha=baseAlpha;ctx.globalCompositeOperation='multiply';ctx.fillStyle=night;ctx.fillRect(0,0,w,h)}if(activeWorld.matrix){ctx.globalCompositeOperation='screen';ctx.font='700 15px ui-monospace,monospace';ctx.textAlign='center';for(let x=16,i=0;x<w;x+=34,i++){const y=(now*.08+i*97)%(h+140)-70;for(let n=0;n<5;n++){ctx.globalAlpha=baseAlpha*Math.max(.12,1-n*.18);ctx.fillStyle=n===0?'#d8ffd8':'#00ff58';ctx.fillText(String.fromCharCode(0x30A0+((i*13+n*17+Math.floor(now/190))%80)),x,y-n*23)}}}if(activeWorld.scary){ctx.globalAlpha=baseAlpha;ctx.globalCompositeOperation='multiply';const fear=ctx.createRadialGradient(w/2,h*.45,w*.04,w/2,h*.45,w*.58);fear.addColorStop(0,'rgba(120,0,0,.05)');fear.addColorStop(.55,'rgba(80,0,0,.28)');fear.addColorStop(1,'rgba(0,0,0,.92)');ctx.fillStyle=fear;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='screen';ctx.globalAlpha=baseAlpha*.2;ctx.fillStyle='#ff0018';for(let y=(now/8)%24;y<h;y+=24)ctx.fillRect(0,y,w,1)}ctx.restore()}
function changeWorld(step,now){if(now-lastSwitchAt<650)return;previousWorld=world;if(step)world=(world+step+worlds.length)%worlds.length;else world=(world+1)%worlds.length;transitionStart=-1;lastSwitchAt=now;tone(280,.08,'sine')}
function portal(lms,box,w,h,now){
 const hands=lms.map(l=>({l,c:(1-l[9].x)*w})).sort((a,b)=>a.c-b.c);if(hands.length<2)return false;
 const left=hands[0].l,right=hands[1].l,raw=[mapPoint(left,8,box,w),mapPoint(right,8,box,w),mapPoint(right,4,box,w),mapPoint(left,4,box,w)];if(!smoothPortalPoints)smoothPortalPoints=raw.map(v=>({...v}));else raw.forEach((v,i)=>{smoothPortalPoints[i].x+=(v.x-smoothPortalPoints[i].x)*.3;smoothPortalPoints[i].y+=(v.y-smoothPortalPoints[i].y)*.3});const p=smoothPortalPoints;
 const width=(Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)+Math.hypot(p[2].x-p[3].x,p[2].y-p[3].y))/2,energy=Math.max(0,Math.min(1,1-width/(w*.48)));
 ctx.save();polyPath(p);ctx.clip();const mix=transitionStart<0?1:Math.min(1,(now-transitionStart)/650);if(mix<1){ctx.save();ctx.globalAlpha=1-mix;drawWorldView(worlds[previousWorld],w,h,now);ctx.restore();ctx.save();ctx.globalAlpha=mix;drawWorldView(worlds[world],w,h,now);ctx.restore()}else{transitionStart=-1;drawWorldView(worlds[world],w,h,now)}ctx.restore();ctx.filter="none";
 for(let n=2;n>0;n--){ctx.save();ctx.shadowBlur=n*7+energy*12;ctx.shadowColor=n%2?"#ff3bd4":"#53e8ff";polyPath(p);ctx.strokeStyle=n===1?"#fff":"#53e8ff";ctx.globalAlpha=n===1?1:.4;ctx.lineWidth=n*3+energy*4;ctx.stroke();ctx.restore()}
 ui.guideTitle.textContent='';ui.guideText.textContent='';
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
