/* Geometric cues, not emotion inference. All tests run on fresh model results. */
const Cues=(()=>{const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function finger(h,tip){return d(h[tip],h[0])>d(h[tip-2],h[0])*1.18}
function read(r){const hands=[r.leftHandLandmarks,r.rightHandLandmarks].filter(h=>h?.length>=21);const f=r.faceLandmarks,p=r.poseLandmarks;const out={peace:false,pinch:false,open:false,tilt:false,up:false,portal:false,hands};for(const h of hands){out.peace ||= finger(h,8)&&finger(h,12)&&!finger(h,16)&&!finger(h,20);out.pinch ||= d(h[4],h[8])<d(h[0],h[9])*.35}
if(f?.length>386){out.open=d(f[13],f[14])/Math.max(.001,d(f[61],f[291]))>.38;out.tilt=Math.abs(f[33].y-f[263].y)/Math.max(.001,Math.abs(f[33].x-f[263].x))>.28}
if(p?.length>16){out.up=[11,12,15,16].every(i=>(p[i].visibility??0)>.6)&&p[15].y<p[11].y-.08&&p[16].y<p[12].y-.08}
if(hands.length===2){const [a,b]=hands;out.gap=(d(a[8],b[8])+d(a[4],b[4]))/2;out.portal=out.gap<.16}return out}
return{read};})();
if(typeof module!=='undefined')module.exports=Cues;
