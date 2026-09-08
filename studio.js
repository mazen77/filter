/* MAZ LAB 10 — camera and tracker have independent lifecycles. */
const release='0.4.1646424915';
let trackerReady=false, starting=false, packet=0, gesturePacket=-1;
const originalPortal=portal;
worlds.push(...[
 ['غروب طوكيو','sepia(.3) saturate(1.8) hue-rotate(315deg)'],['سينما','contrast(1.25) saturate(.65)'],['أرشيف 1999','sepia(.55) contrast(.9)'],['أبيض وأسود','grayscale(1) contrast(1.3)'],['أشعة سينية','invert(1) grayscale(1)'],['حلم وردي','sepia(.4) hue-rotate(290deg) saturate(2)'],['مريخي','hue-rotate(90deg) saturate(2)'],['أزرق كهربائي','hue-rotate(180deg) saturate(2)'],['ذهبي','sepia(1) saturate(2)'],['كاميرا مراقبة','grayscale(1) contrast(1.8) brightness(.8)'],['باستيل','contrast(.8) brightness(1.15) saturate(.7)'],['حبر','grayscale(1) contrast(3)'],['حلو وحامض','hue-rotate(45deg) saturate(3)'],['ليلة بنفسجية','hue-rotate(230deg) contrast(1.3)'],['ألوان مقلوبة','invert(1)'],['فلاش','brightness(1.3) contrast(1.2)'],['فيلم قديم','sepia(.8) saturate(.5) contrast(1.4)'],['توهج','brightness(1.1) saturate(1.9)'],['بارد','hue-rotate(160deg) saturate(.7)']
].map(([name,filter])=>({name,filter})),
 {name:'البوابة الحيّة',filter:'contrast(1.35) saturate(2.8)',animated:true},
 {name:'بوابة الكابوس',filter:'grayscale(.85) contrast(2.4) brightness(.55) sepia(.7) hue-rotate(315deg)',scary:true}
);
document.querySelector('.intro .eyebrow').textContent='MAZ // LAB — CAMERA PLAYGROUND';
document.querySelector('.intro h1').innerHTML='وجهك.<br>عالم آخر.';
document.querySelector('.intro-copy').textContent='ارفع يديك أمام الكاميرا، قرّبهما لتغيير العالم، ثم باعد بينهما لتشاهد النتيجة.';
document.querySelector('.bootline').textContent='الإصدار 10 / مختبر العوالم';
document.querySelector('#startBtn').innerHTML='افتح الكاميرا ↗';
document.querySelector('.privacy').textContent='الكاميرا تبقى على جهازك. لا حساب ولا رفع فيديو.';
const statusEl=document.createElement('span');statusEl.id='trackingStatus';statusEl.className='sr-only';statusEl.setAttribute('aria-live','polite');document.querySelector('main').append(statusEl);
function timeout(promise,ms,label){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(label)),ms))]).finally(()=>clearTimeout(timer))}
function loadTrackerScript(root){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=root+'hands.js';s.onload=resolve;s.onerror=()=>reject(new Error('تعذّر تحميل hands.js'));document.head.append(s)})}
let trackingStart=null;
async function startTracking(){if(trackingStart)return trackingStart;trackingStart=(async()=>{trackerReady=false;statusEl.textContent='تحميل تتبع اليدين… الفلاتر تعمل الآن';const roots=location.protocol==='file:'?[]:[new URL('./vendor/mediapipe/',document.baseURI).href];roots.push(`https://cdn.jsdelivr.net/npm/@mediapipe/hands@${release}/`);let error;
 for(const root of roots){let candidate;try{await timeout(loadTrackerScript(root),15000,'انتهت مهلة تحميل التتبع');candidate=new Hands({locateFile:f=>root+f});candidate.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:.55,minTrackingConfidence:.55});candidate.onResults(r=>{if(landmarker!==candidate)return;window.__lastHands=r.multiHandLandmarks||[];packet++;statusEl.textContent=`التتبع يعمل • ${window.__lastHands.length} يد`});landmarker=candidate;await timeout(candidate.send({image:video}),30000,'انتهت مهلة تحميل النموذج');trackerReady=true;processing=false;return;}catch(e){error=e;landmarker=null;window.__lastHands=[];candidate?.close?.().catch(()=>{});}}
 statusEl.textContent='التتبع غير متاح: '+(error?.message||'خطأ غير معروف')+' — يمكنك استخدام الفلاتر باللمس';})();try{await trackingStart}finally{trackingStart=null}}
init=async function(){if(starting||running)return;starting=true;show(ui.intro,false);show(ui.error,false);show(ui.loading);try{if(!window.isSecureContext&&location.protocol!=='file:')throw new Error('افتح الموقع عبر HTTPS لتشغيل الكاميرا.');if(!navigator.mediaDevices?.getUserMedia)throw new Error('افتح الرابط مباشرة في Safari أو Chrome عبر HTTPS.');await startCamera();await timeout(new Promise(resolve=>{if(video.videoWidth)return resolve();video.addEventListener('loadeddata',resolve,{once:true})}),10000,'الكاميرا لا ترسل صورة');running=true;show(ui.loading,false);document.querySelector('.socials').classList.add('hidden');fit();loop();startTracking();}catch(e){show(ui.loading,false);show(ui.error);ui.errorText.textContent=e.name==='NotAllowedError'?'اسمح بالكاميرا من إعدادات الموقع ثم أعد المحاولة.':e.message;}finally{starting=false}};
document.querySelector('#startBtn').onclick=init;document.querySelector('#retryBtn').onclick=init;
portal=(...args)=>{if(packet===gesturePacket){const old=closeFrames;const out=originalPortal(...args);closeFrames=old;return out}gesturePacket=packet;return originalPortal(...args)};
loop=function(now=performance.now()){if(!running)return;const {w,h}=size();ctx.save();ctx.fillStyle='#090b10';ctx.fillRect(0,0,w,h);const box=drawVideo(w,h);ctx.restore();
 if(trackerReady&&!processing&&video.readyState>=2&&now-lastDetect>80){lastDetect=now;processing=true;const active=landmarker;timeout(Promise.resolve().then(()=>active.send({image:video})),12000,'توقف التتبع — اضغط إعادة التتبع').catch(e=>{trackerReady=false;window.__lastHands=[];statusEl.textContent=e.message}).finally(()=>processing=false)}
 const lms=window.__lastHands||[];drawTracking(lms,box,w);if(lms.length===2)portal(lms,box,w,h,now);else closeFrames=0;
 drawParticles();frameHandle=requestAnimationFrame(loop)};
document.querySelector('#flipBtn').onclick=async()=>{if(!running)return;try{await startCameraFlip()}catch(e){statusEl.textContent=e.message}};
async function startCameraFlip(){facing=facing==='user'?'environment':'user';await startCamera();window.__lastHands=[]}
