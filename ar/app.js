import { create } from 'qrcode';
import { POSTER_URL } from './config.js';

const $ = s => document.querySelector(s);
const viewer = $('#viewer'), activate = $('#activate'), spin = $('#spin'), dialog = $('#notice');
const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const num = n => String(n + 1).padStart(2, '0');

// Locally encoded SVG with a four-module quiet zone. Never send the destination to a service.
const destination = new URL(POSTER_URL || location.pathname, location.origin);
if (!['https:', 'http:'].includes(destination.protocol)) throw Error('Poster destination must be an HTTP(S) URL.');
const qr = create(destination.href, { errorCorrectionLevel: 'M' }).modules;
let squares = '';
for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.get(y, x)) squares += `M${x+4},${y+4}h1v1h-1z`;
$('#qrcode').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size+8} ${qr.size+8}" shape-rendering="crispEdges" role="img" aria-label="Poster destination QR code"><rect width="100%" height="100%" fill="white"/><path fill="#213c35" d="${squares}"/></svg>`;
$('#qr-link').href = destination.href;

// Engraved horizon lines echo the hand-drawn landscape on the label masters.
function landscape(w,h,base,amp,steps,mirror=false) {
  return Array.from({length:steps}, (_,j) => {
    let d=''; for (let x=-2; x<w+4; x+=3) {
      const v=x/w, a=mirror ? 1-v : v;
      const y=base + amp*(.58*Math.sin(a*7.3)+.33*Math.cos(a*15+.4)+.19*Math.sin(a*26)) + j*(h*.013 + h*.003*Math.cos(v*10+j*.04));
      d+=`${x===-2?'M':'L'}${x} ${y.toFixed(1)} `;
    } return `<path d="${d}"/>`;
  }).join('');
}
$('#engraving').innerHTML = `<g fill="none" stroke="currentColor" stroke-width=".65">${landscape(800,400,314,53,25)}</g><g class="arch" fill="none" stroke="currentColor" stroke-width=".7"><circle cx="402" cy="199" r="156"/><circle cx="402" cy="199" r="161" stroke-dasharray="1 7"/></g>`;
$('#poster-drawing').innerHTML = `<g fill="none" stroke="currentColor"><rect x="14" y="8" width="152" height="124"/><rect x="18" y="12" width="144" height="116" stroke-width=".5"/><circle cx="113" cy="57" r="20"/><circle cx="113" cy="57" r="24" stroke-dasharray=".7 3"/><clipPath id="border"><rect x="18" y="12" width="144" height="116"/></clipPath><g clip-path="url(#border)" stroke-width=".75">${landscape(180,140,92,17,24,true)}</g></g>`;

function announce(title, message) {
  $('#notice-title').textContent=title; $('#notice-copy').textContent=message;
  if (!dialog.open) dialog.showModal();
}
$('.dismiss').onclick=()=>dialog.close(); $('.notice-link').onclick=()=>dialog.close();
dialog.onclick=e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog && (e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)) dialog.close();};

const params = new URL(location.href).searchParams;
let products=[], active=-1;
function setLoadState(s,ok=false) { $('#status').textContent=s; activate.disabled=!ok; spin.disabled=!ok; $('.stage').dataset.state=ok?'ready':'idle'; }
function select(i, writeUrl=true) {
  if (active===i) return;
  active=i; const p=products[i], dir=`../products/${p.slug}/`;
  $('#fig').textContent=num(i); $('#category').textContent=p.category; $('#product-name').textContent=p.name; $('#type').textContent=p.type;
  document.querySelectorAll('.item').forEach((b,k)=>b.setAttribute('aria-pressed', String(k===i)));
  setLoadState('Loading 3D'); $('#study-preview').src=dir+'preview.png'; viewer.setAttribute('alt',`Mock ${p.name}, with placeholder New Moon pack art`);viewer.setAttribute('camera-orbit','17deg 73deg 104%');viewer.resetTurntableRotation?.();viewer.setAttribute('src',dir+'model.glb');
  if(writeUrl){const url=new URL(location.href);url.searchParams.set('product',p.slug); history.replaceState(null,'',url);}
}
viewer.addEventListener('load',()=>{viewer.jumpCameraToGoal(); setLoadState('Live 3D',true);});
viewer.addEventListener('error',()=>setLoadState('3D unavailable'));
viewer.addEventListener('ar-status',e=>{if(e.detail.status==='failed') announce('AR could not start','Check your camera permissions and try a compatible mobile browser over HTTPS. You can still explore the model in 3D here.');});
function drawSpin() {const label=viewer.autoRotate?'Pause rotation':'Resume rotation';spin.innerHTML=icon(viewer.autoRotate?'pause':'play');spin.title=label;spin.setAttribute('aria-label',label);}
spin.onclick=()=>{viewer.autoRotate=!viewer.autoRotate;drawSpin();};
activate.onclick=()=>{
  if(!viewer.loaded)return;
  if(!viewer.canActivateAR) {announce('Open on your phone','This browser can show the 3D model but cannot place it in your space. Open the HTTPS page in Safari on a compatible iPhone or Chrome on an AR-capable Android phone.');return;}
  // Keep the trusted tap: do not await other work before handing off to Quick Look / WebXR.
  viewer.activateAR().catch(()=>announce('AR could not start','Please check camera permissions and try again on a supported device over HTTPS.'));
};
try {
  self.ModelViewerElement={dracoDecoderLocation:new URL('./vendor/draco/',import.meta.url).href};
  const response=await fetch('../products/catalog.json'); if(!response.ok)throw Error('Missing catalogue'); products=await response.json();
  products.forEach((p,i)=>{
    const b=document.createElement('button');b.type='button';b.className='item';b.setAttribute('aria-label',`Select ${p.name}`);
    b.innerHTML=`<span class="swatch ${p.palette}"><img alt="" src="../products/${p.slug}/preview.png"></span><span class="item-text"><small>FIG. ${num(i)}</small><strong>${p.name}</strong></span><span class="item-arrow">${icon('arrow')}</span>`;
    b.onclick=()=>{select(i);if(matchMedia('(max-width:720px)').matches && $('.stage').getBoundingClientRect().top<0) $('.exhibit').scrollIntoView({block:'start'});};$('#picker').append(b);
  });
  const idx=products.findIndex(p=>p.slug===(params.get('product')||'cny-hamper-basket'));select(idx===-1?4:idx,false);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)viewer.removeAttribute('auto-rotate');
  await import('@google/model-viewer'); await customElements.whenDefined('model-viewer');drawSpin();
} catch(error) {
  console.error(error); setLoadState('3D unavailable');$('#type').textContent='Could not load the showroom. Check the connection and reload.';
}
