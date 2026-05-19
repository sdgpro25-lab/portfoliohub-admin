// ═══════════════════════════════════════════════════════════
// URL de l'API Apps Script — mettre à jour après redéploiement
// ═══════════════════════════════════════════════════════════
const API_URL = 'https://script.google.com/macros/s/AKfycbzRetmJrnZXv0Yn6IxoSA3ajk5TWgJ-0vqNNbWqJCP4Vpcn2Oe_e4jIjlquHgwP7mbsbQ/exec';

// ── Variables globales partagées ──
window.allClients    = [];
window.allTemplates  = [];
window.currentUser   = null;

// Helper universel fetch → remplace google.script.run
async function api(action, data = null) {
  try {
    let res;
    if (data === null) {
      // GET (lecture)
      res = await fetch(`${API_URL}?action=${action}`, { redirect: 'follow' });
    } else {
      // POST (mutation)
      res = await fetch(API_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({ action, data })
      });
    }
    return await res.json();
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

// ── Toast ──
function toast(msg, type='', icon='') {
  const icons = {success:'✅',error:'❌',info:'ℹ️'};
  const t = document.getElementById('toast');
  if (!t) { console.log(msg); return; }
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg = document.getElementById('toastMsg');
  if (toastIcon) toastIcon.textContent = icon || icons[type] || '💬';
  if (toastMsg) toastMsg.textContent  = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 4200);
}

// ── Helpers utilitaires ──
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setTableMessage(tbodyId, icon, message) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">${icon}</div><p>${message}</p></div></td></tr>`;
}

function normaliserListe(value) {
  return Array.isArray(value) ? value : [];
}

// ── Clock ──
function tick() {
  const n = new Date();
  const topDate = document.getElementById('topDate');
  const topTime = document.getElementById('topTime');
  if (topDate) topDate.textContent = n.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if (topTime) topTime.textContent = n.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

// ── Extraire couleurs CSS vars ──
function extraireSwatchesCss(cssVars) {
  const colors = [];
  const regex  = /--([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl[a]?\([^)]+\))/g;
  let m;
  const seen = new Set();
  while ((m = regex.exec(cssVars)) !== null) {
    const name = m[1], value = m[2];
    if (!seen.has(value)) { seen.add(value); colors.push({ name, value }); }
  }
  return colors;
}

// ── Canvas helpers pour export PNG carte ──
function _toRawUrl(url) {
  if (!url) return url;
  const m = url.match(/https?:\/\/([^.]+)\.github\.io\/([^/?#]+)\/(.+)/);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/main/${m[3]}`;
  return url;
}

// Extrait le chemin /photos/xxx.jpg et construit une URL same-origin
// → même domaine que l'admin = zéro CORS, jamais de canvas taint
function _toSameOriginUrl(url) {
  if (!url || typeof window === 'undefined') return null;
  const m = url.match(/\/photos\/([^?#]+)/);
  if (!m) return null;
  return window.location.origin + '/photos/' + m[1];
}

async function _loadImg(src) {
  const clean = (src || '').trim();
  if (!clean) return null;

  // Construire la liste d'URLs à essayer, par ordre de fiabilité :
  // 1. Same-origin (admin.sotchedji.store/photos/...) → zéro CORS, priorité absolue
  // 2. raw.githubusercontent.com → CORS garanti (Access-Control-Allow-Origin: *)
  // 3. URL originale → dernier recours
  const urls = [];
  const same = _toSameOriginUrl(clean);
  if (same) urls.push(same);
  const raw = _toRawUrl(clean);
  if (raw !== clean && !urls.includes(raw)) urls.push(raw);
  if (!urls.includes(clean)) urls.push(clean);

  // fetch → blob → dataURL : seule méthode qui garantit aucun taint canvas
  for (const url of urls) {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) { console.warn('[photo] fetch', resp.status, url); continue; }
      const blob = await resp.blob();
      if (!blob.size) continue;
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
      });
      const img = await new Promise((res, rej) => {
        const el = new Image();
        el.onload  = () => el.naturalWidth > 0 ? res(el) : rej(new Error('w=0'));
        el.onerror = rej; el.src = dataUrl;
      });
      console.log('[photo] ✅', url);
      return img;
    } catch(e) { console.warn('[photo] ❌', url, e.message); }
  }

  console.error('[photo] ÉCHEC pour:', src);
  return null;
}

function _rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,       y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r,   y,          r);
  ctx.closePath();
}

function _makeCanvas(w,h,sc){
  const canvas=document.createElement('canvas');
  canvas.width=w*sc; canvas.height=h*sc;
  const ctx=canvas.getContext('2d'); ctx.scale(sc,sc);
  _rrPath(ctx,0,0,w,h,22); ctx.clip();
  return {canvas,ctx};
}
function _cercle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);}
function _truncate(ctx,txt,maxW){
  if(ctx.measureText(txt).width<=maxW)return txt;
  let t=txt;
  while(ctx.measureText(t+'…').width>maxW&&t.length)t=t.slice(0,-1);
  return t+'…';
}
function _wrapText(ctx,text,maxW,maxLines){
  const words=text.split(' ');
  const lines=[];
  let cur='';
  for(const word of words){
    const test=cur?cur+' '+word:word;
    if(ctx.measureText(test).width>maxW&&cur){
      lines.push(cur);
      if(lines.length>=maxLines)return lines;
      cur=word;
    }else{cur=test;}
  }
  if(cur&&lines.length<maxLines)lines.push(cur);
  return lines;
}
function _dlCanvas(canvas,name){
  const a=document.createElement('a');
  a.download=name.toLowerCase().replace(/\s+/g,'_')+'.png';
  a.href=canvas.toDataURL('image/png'); a.click();
}
