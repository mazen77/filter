/* MAZ LAB 18 — lightweight portal-only runtime. */
const release='0.4.1646424915';
let trackerReady=false,starting=false,packet=0,gesturePacket=-1;
let pinchLocked=false,pinchRelease=0,lastPinchPacket=-1,pinchCooldown=0,lastRender=0;
const originalPortal=portal;
worlds.splice(0,worlds.length,...[
 ['عالم البكسل','contrast(1.25) saturate(1.8)'],['عالم المرآة','contrast(1.12) saturate(1.35)'],['عالم الكوميكس','contrast(1.8) saturate(2.5) brightness(1.05)'],['أشعة سينية','invert(1) grayscale(1)'],['ألوان مقلوبة','invert(1) saturate(2)'],['حبر حي','grayscale(1) contrast(3.4)']
].map(([name,filter])=>({name,filter})),
 {name:'البوابة الحيّة',filter:'contrast(1.35) saturate(2.8)',animated:true},
 {name:'بوابة الكابوس',filter:'grayscale(.85) contrast(2.4) brightness(.55) sepia(.7) hue-rotate(315deg)',scary:true},
 {name:'الكاميرا الحرارية',filter:'grayscale(1) contrast(2.2) brightness(1.12) sepia(1) saturate(7) hue-rotate(302deg)',heat:true},
 {name:'الرؤية الليلية',filter:'grayscale(1) sepia(1) hue-rotate(62deg) saturate(7) contrast(1.75) brightness(1.15)',night:true},
 {name:'اختراق المصفوفة',filter:'grayscale(1) sepia(1) hue-rotate(62deg) saturate(8) contrast(1.5) brightness(.72)',matrix:true},
 {name:'خلل الواقع',filter:'contrast(1.65) saturate(2.8) hue-rotate(335deg)',glitch:true},
 {name:'الهولوغرام',filter:'grayscale(.65) sepia(1) hue-rotate(145deg) saturate(5) contrast(1.7)',hologram:true},
 {name:'الفراغ الكوني',filter:'contrast(1.45) saturate(3) hue-rotate(225deg) brightness(.82)',cosmic:true}
);
worlds[0].pixel=true;worlds[1].mirror=true;
const baseWorldRenderer=drawWorldView;
drawWorldView=function(activeWorld,w,h,now){baseWorldRenderer(activeWorld,w,h,now);if(!activeWorld.glitch&&!activeWorld.hologram&&!activeWorld.cosmic)return;ctx.save();ctx.globalCompositeOperation='screen';if(activeWorld.glitch){for(let i=0;i<7;i++){const y=(i*83+Math.floor(now/55)*31)%h,shift=Math.sin(now/45+i*7)*18;ctx.globalAlpha=.16;ctx.fillStyle=i%2?'#00eaff':'#ff176f';ctx.fillRect(shift,y,w,2+i%3)}}if(activeWorld.hologram){ctx.globalAlpha=.2;ctx.fillStyle='#55eeff';for(let y=(now/14)%12;y<h;y+=12)ctx.fillRect(0,y,w,1);ctx.globalAlpha=.08+.05*Math.sin(now/70);ctx.fillRect(0,0,w,h)}if(activeWorld.cosmic){for(let i=0;i<22;i++){const x=(i*97.3)%w,y=(i*173.7+now*(.012+i%3*.006))%h,size=i%5===0?3:1;ctx.globalAlpha=.3+.5*((Math.sin(now/260+i*2.1)+1)/2);ctx.fillStyle=i%4?'#c6e8ff':'#ff7cf2';ctx.fillRect(x,y,size,size)}}ctx.restore()};
document.querySelector('.intro .eyebrow').textContent='MAZ // LAB — CAMERA PLAYGROUND';
document.querySelector('.intro h1').innerHTML='وجهك.<br>عالم آخر.';
document.querySelector('.intro-copy').textContent='افتح البوابة بيديك. المس الإبهام بالسبابة مرة واحدة لتغيير العالم.';
document.querySelector('.bootline').textContent='الإصدار 20 / مختبر العوالم';
document.querySelector('#startBtn').innerHTML='افتح الكاميرا ↗';
document.querySelector('.privacy').textContent='الكاميرا تبقى على جهازك. لا حساب ولا رفع فيديو.';
const statusEl=document.createElement('span');statusEl.id='trackingStatus';statusEl.className='sr-only';statusEl.setAttribute('aria-live','polite');document.querySelector('main').append(statusEl);
function timeout(promise,ms,label){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(label)),ms))]).finally(()=>clearTimeout(timer))}
function loadTrackerScript(root){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=root+'hands.js';s.onload=resolve;s.onerror=()=>reject(new Error('تعذّر تحميل hands.js'));document.head.append(s)})}
let trackingStart=null;
async function startTracking(){if(trackingStart)return trackingStart;trackingStart=(async()=>{trackerReady=false;const roots=location.protocol==='file:'?[]:[new URL('./',document.baseURI).href];roots.push(`https://cdn.jsdelivr.net/npm/@mediapipe/hands@${release}/`,`https://unpkg.com/@mediapipe/hands@${release}/`);let error;for(const root of roots){let candidate;try{await timeout(loadTrackerScript(root),12000,'انتهت مهلة تحميل التتبع');candidate=new Hands({locateFile:f=>root+f});candidate.setOptions({maxNumHands:2,modelComplexity:0,selfieMode:false,minDetectionConfidence:.45,minTrackingConfidence:.45});candidate.onResults(r=>{if(landmarker!==candidate)return;window.__lastHands=r.multiHandLandmarks||[];packet++});landmarker=candidate;await timeout(candidate.send({image:video}),25000,'انتهت مهلة تحميل النموذج');trackerReady=true;processing=false;return}catch(e){error=e;landmarker=null;window.__lastHands=[];candidate?.close?.().catch(()=>{})}}statusEl.textContent='التتبع غير متاح: '+(error?.message||'خطأ غير معروف')})();try{await trackingStart}finally{trackingStart=null}}
init=async function(){if(starting||running)return;starting=true;show(ui.intro,false);show(ui.error,false);show(ui.loading);try{if(!window.isSecureContext&&location.protocol!=='file:')throw new Error('افتح الموقع عبر HTTPS لتشغيل الكاميرا.');if(!navigator.mediaDevices?.getUserMedia)throw new Error('افتح الرابط مباشرة في Safari أو Chrome عبر HTTPS.');await startCamera();await timeout(new Promise(resolve=>{if(video.videoWidth)return resolve();video.addEventListener('loadeddata',resolve,{once:true})}),10000,'الكاميرا لا ترسل صورة');running=true;show(ui.loading,false);show(ui.controls);document.querySelector('.socials').classList.add('hidden');fit();loop();startTracking()}catch(e){show(ui.loading,false);show(ui.error);ui.errorText.textContent=e.name==='NotAllowedError'?'اسمح بالكاميرا من إعدادات الموقع ثم أعد المحاولة.':e.message}finally{starting=false}};
document.querySelector('#startBtn').onclick=init;document.querySelector('#retryBtn').onclick=init;
portal=(...args)=>{if(packet===gesturePacket){const old=closeFrames,out=originalPortal(...args);closeFrames=old;return out}gesturePacket=packet;return originalPortal(...args)};
function gap(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function handlePinchSwitch(lms,now){if(packet===lastPinchPacket)return;lastPinchPacket=packet;const pinched=lms.some(lm=>gap(lm[4],lm[8])<Math.max(.022,gap(lm[0],lm[9])*.52));if(pinched){pinchRelease=0;if(!pinchLocked&&now>pinchCooldown){changeWorld(1,now);pinchLocked=true;pinchCooldown=now+600}}else if(++pinchRelease>=2){pinchLocked=false;pinchRelease=0}}
loop=function(now=performance.now()){if(!running)return;if(now-lastRender<33){frameHandle=requestAnimationFrame(loop);return}lastRender=now;const {w,h}=size();ctx.save();ctx.fillStyle='#090b10';ctx.fillRect(0,0,w,h);const box=drawVideo(w,h);ctx.restore();if(trackerReady&&!processing&&video.readyState>=2&&now-lastDetect>115){lastDetect=now;processing=true;const active=landmarker;timeout(Promise.resolve().then(()=>active.send({image:video})),10000,'توقف التتبع').catch(e=>{trackerReady=false;window.__lastHands=[];statusEl.textContent=e.message}).finally(()=>processing=false)}const lms=window.__lastHands||[];drawTracking(lms,box,w);if(lms.length===2)portal(lms,box,w,h,now);else{closeFrames=0;smoothPortalPoints=null}handlePinchSwitch(lms,now);frameHandle=requestAnimationFrame(loop)};
document.querySelector('#flipBtn').onclick=async()=>{if(!running)return;try{facing=facing==='user'?'environment':'user';await startCamera();window.__lastHands=[]}catch(e){statusEl.textContent=e.message}};
