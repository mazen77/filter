/* MAZ LAB 18 — lightweight portal-only runtime. */
const release='0.4.1646424915';
let trackerReady=false,starting=false,packet=0,gesturePacket=-1;
let fistFrames=0,fistRelease=0,fistLocked=false,lastFistPacket=-1;
const originalPortal=portal;
worlds.push(...[
 ['غروب طوكيو','sepia(.3) saturate(1.8) hue-rotate(315deg)'],['سينما','contrast(1.25) saturate(.65)'],['أرشيف 1999','sepia(.55) contrast(.9)'],['أبيض وأسود','grayscale(1) contrast(1.3)'],['أشعة سينية','invert(1) grayscale(1)'],['حلم وردي','sepia(.4) hue-rotate(290deg) saturate(2)'],['مريخي','hue-rotate(90deg) saturate(2)'],['أزرق كهربائي','hue-rotate(180deg) saturate(2)'],['ذهبي','sepia(1) saturate(2)'],['كاميرا مراقبة','grayscale(1) contrast(1.8) brightness(.8)'],['باستيل','contrast(.8) brightness(1.15) saturate(.7)'],['حبر','grayscale(1) contrast(3)'],['حلو وحامض','hue-rotate(45deg) saturate(3)'],['ليلة بنفسجية','hue-rotate(230deg) contrast(1.3)'],['ألوان مقلوبة','invert(1)'],['فلاش','brightness(1.3) contrast(1.2)'],['فيلم قديم','sepia(.8) saturate(.5) contrast(1.4)'],['توهج','brightness(1.1) saturate(1.9)'],['بارد','hue-rotate(160deg) saturate(.7)']
].map(([name,filter])=>({name,filter})),
 {name:'البوابة الحيّة',filter:'contrast(1.35) saturate(2.8)',animated:true},
 {name:'بوابة الكابوس',filter:'grayscale(.85) contrast(2.4) brightness(.55) sepia(.7) hue-rotate(315deg)',scary:true},
 {name:'الكاميرا الحرارية',filter:'grayscale(1) contrast(2.2) brightness(1.12) sepia(1) saturate(7) hue-rotate(302deg)',heat:true},
 {name:'الرؤية الليلية',filter:'grayscale(1) sepia(1) hue-rotate(62deg) saturate(7) contrast(1.75) brightness(1.15)',night:true},
 {name:'اختراق المصفوفة',filter:'grayscale(1) sepia(1) hue-rotate(62deg) saturate(8) contrast(1.5) brightness(.72)',matrix:true}
);
document.querySelector('.intro .eyebrow').textContent='MAZ // LAB — CAMERA PLAYGROUND';
document.querySelector('.intro h1').innerHTML='وجهك.<br>عالم آخر.';
document.querySelector('.intro-copy').textContent='ارفع يديك أمام الكاميرا، وافتح بوابتك. أغلِق أصابعك لتغيير العالم.';
document.querySelector('.bootline').textContent='الإصدار 18 / مختبر العوالم';
document.querySelector('#startBtn').innerHTML='افتح الكاميرا ↗';
document.querySelector('.privacy').textContent='الكاميرا تبقى على جهازك. لا حساب ولا رفع فيديو.';
const statusEl=document.createElement('span');statusEl.id='trackingStatus';statusEl.className='sr-only';statusEl.setAttribute('aria-live','polite');document.querySelector('main').append(statusEl);
function timeout(promise,ms,label){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(label)),ms))]).finally(()=>clearTimeout(timer))}
function loadTrackerScript(root){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=root+'hands.js';s.onload=resolve;s.onerror=()=>reject(new Error('تعذّر تحميل hands.js'));document.head.append(s)})}
let trackingStart=null;
async function startTracking(){if(trackingStart)return trackingStart;trackingStart=(async()=>{trackerReady=false;const roots=location.protocol==='file:'?[]:[new URL('./',document.baseURI).href];roots.push(`https://cdn.jsdelivr.net/npm/@mediapipe/hands@${release}/`,`https://unpkg.com/@mediapipe/hands@${release}/`);let error;for(const root of roots){let candidate;try{await timeout(loadTrackerScript(root),12000,'انتهت مهلة تحميل التتبع');candidate=new Hands({locateFile:f=>root+f});candidate.setOptions({maxNumHands:2,modelComplexity:0,selfieMode:false,minDetectionConfidence:.45,minTrackingConfidence:.45});candidate.onResults(r=>{if(landmarker!==candidate)return;window.__lastHands=r.multiHandLandmarks||[];packet++});landmarker=candidate;await timeout(candidate.send({image:video}),25000,'انتهت مهلة تحميل النموذج');trackerReady=true;processing=false;return}catch(e){error=e;landmarker=null;window.__lastHands=[];candidate?.close?.().catch(()=>{})}}statusEl.textContent='التتبع غير متاح: '+(error?.message||'خطأ غير معروف')})();try{await trackingStart}finally{trackingStart=null}}
init=async function(){if(starting||running)return;starting=true;show(ui.intro,false);show(ui.error,false);show(ui.loading);try{if(!window.isSecureContext&&location.protocol!=='file:')throw new Error('افتح الموقع عبر HTTPS لتشغيل الكاميرا.');if(!navigator.mediaDevices?.getUserMedia)throw new Error('افتح الرابط مباشرة في Safari أو Chrome عبر HTTPS.');await startCamera();await timeout(new Promise(resolve=>{if(video.videoWidth)return resolve();video.addEventListener('loadeddata',resolve,{once:true})}),10000,'الكاميرا لا ترسل صورة');running=true;show(ui.loading,false);document.querySelector('.socials').classList.add('hidden');fit();loop();startTracking()}catch(e){show(ui.loading,false);show(ui.error);ui.errorText.textContent=e.name==='NotAllowedError'?'اسمح بالكاميرا من إعدادات الموقع ثم أعد المحاولة.':e.message}finally{starting=false}};
document.querySelector('#startBtn').onclick=init;document.querySelector('#retryBtn').onclick=init;
portal=(...args)=>{if(packet===gesturePacket){const old=closeFrames,out=originalPortal(...args);closeFrames=old;return out}gesturePacket=packet;return originalPortal(...args)};
function gap(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function handClosed(lm){const palm=gap(lm[0],lm[9]);return [8,12,16,20].filter((tip,n)=>gap(lm[tip],lm[9])<palm*.95||gap(lm[tip],lm[0])<gap(lm[[6,10,14,18][n]],lm[0])*1.2).length>=3}
function handleFistSwitch(lms,now){if(packet===lastFistPacket)return;lastFistPacket=packet;const closedNow=lms.some(handClosed);if(closedNow){fistRelease=0;if(!fistLocked&&++fistFrames>=3){changeWorld(1,now);fistLocked=true;fistFrames=0}}else{fistFrames=0;if(++fistRelease>=2){fistLocked=false;fistRelease=0}}}
loop=function(now=performance.now()){if(!running)return;const {w,h}=size();ctx.save();ctx.fillStyle='#090b10';ctx.fillRect(0,0,w,h);const box=drawVideo(w,h);ctx.restore();if(trackerReady&&!processing&&video.readyState>=2&&now-lastDetect>100){lastDetect=now;processing=true;const active=landmarker;timeout(Promise.resolve().then(()=>active.send({image:video})),10000,'توقف التتبع').catch(e=>{trackerReady=false;window.__lastHands=[];statusEl.textContent=e.message}).finally(()=>processing=false)}const lms=window.__lastHands||[];drawTracking(lms,box,w);if(lms.length===2)portal(lms,box,w,h,now);else{closeFrames=0;smoothPortalPoints=null}handleFistSwitch(lms,now);frameHandle=requestAnimationFrame(loop)};
document.querySelector('#flipBtn').onclick=async()=>{if(!running)return;try{facing=facing==='user'?'environment':'user';await startCamera();window.__lastHands=[]}catch(e){statusEl.textContent=e.message}};
