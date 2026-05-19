// ══════════════════════════════════════════════════════════
// PALETTES CARTE par template — indépendantes du CSS site
// Garantissent lisibilité sur portrait ET paysage
// ══════════════════════════════════════════════════════════
const CARTE_THEMES = {
  '1': { // Classique — marine & teal
    bg:'#f0f6fb', ink:'#0f2d4a', muted:'#5a7a90', font:'Arial',
    panel1:'#0d3d5e', panel2:'#082b44',
    accent:'#0aa393', accentBar:'#4dd4c5',
    profDark:'#7ee8db',
    pill:{ bg:'rgba(10,163,147,.13)', border:'rgba(10,163,147,.40)', text:'#0d3d5e' },
    row:{ bg:'rgba(13,61,94,.05)', border:'rgba(13,61,94,.12)' },
  },
  '2': { // Moderne — indigo profond
    bg:'#f0f0ff', ink:'#1e1b4b', muted:'#6065a8', font:'Arial',
    panel1:'#312e9e', panel2:'#1e1b6b',
    accent:'#818cf8', accentBar:'#a5b4fc',
    profDark:'rgba(255,255,255,0.88)',   // blanc — indigo illisible sur indigo
    pill:{ bg:'rgba(99,102,241,.12)', border:'rgba(99,102,241,.38)', text:'#312e9e' },
    row:{ bg:'rgba(49,46,158,.05)', border:'rgba(49,46,158,.12)' },
  },
  '3': { // Élégant — brun chaleureux & or
    bg:'#fdf8f2', ink:'#2c1810', muted:'#8a6a50', font:'Georgia',
    panel1:'#3d1e0f', panel2:'#1a0a05',
    accent:'#c8973c', accentBar:'#e8c870',
    profDark:'#f5d090',                  // or clair lisible sur brun très foncé
    pill:{ bg:'rgba(200,151,60,.13)', border:'rgba(200,151,60,.42)', text:'#3d1e0f' },
    row:{ bg:'rgba(61,30,15,.05)', border:'rgba(61,30,15,.12)' },
  },
};

async function exporterCarteClient(id) {
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  toast('Génération de la carte...', 'info', '🪪');

  const profil    = c.profil || {};
  const initiales = ((c.prenom||'?')[0]+(c.nom||'?')[0]).toUpperCase();
  const tplId     = String(c.template_id || '1');

  // ── Palette : thème spécifique carte sinon fallback CSS vars ──
  const TH = CARTE_THEMES[tplId];
  if (!TH) {
    const tpl = allTemplates.find(t => String(t.id) === tplId);
    const cm = {};
    (extraireSwatchesCss(tpl ? tpl.css_vars : '')).forEach(s => { cm[s.name] = s.value; });
    CARTE_THEMES[tplId] = {
      bg: cm['soft']||'#f4f8fb', ink: cm['ink']||'#102033', muted: cm['muted']||'#66778e',
      font: (cm['font']||'').includes('Georgia') ? 'Georgia' : 'Arial',
      panel1: cm['navy-dark']||cm['ink']||cm['navy']||'#12476d',
      panel2: cm['navy']||'#12476d',
      accent: cm['teal']||'#0aa393', accentBar: cm['teal']||'#0aa393',
      profDark: 'rgba(255,255,255,0.85)',
      pill: { bg:'rgba(10,163,147,.12)', border:'rgba(10,163,147,.38)', text: cm['navy']||'#12476d' },
      row:  { bg:'rgba(13,61,94,.05)',   border:'rgba(13,61,94,.12)' },
    };
  }
  const TM = CARTE_THEMES[tplId];

  // Raccourcis
  const bg      = TM.bg;
  const ink     = TM.ink;
  const muted   = TM.muted;
  const font    = TM.font;
  const panel1  = TM.panel1;
  const panel2  = TM.panel2;
  const accent  = TM.accent;
  const acBar   = TM.accentBar;
  const pDark   = TM.profDark;
  const pBg     = TM.pill.bg;
  const pBord   = TM.pill.border;
  const pTxt    = TM.pill.text;
  const rBg     = TM.row.bg;
  const rBord   = TM.row.border;

  function wa(hex, a) {
    if (!hex || hex.startsWith('rgba')) return hex;
    const h = hex.replace('#','');
    const n = h.length===3
      ? [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)]
      : [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
    return `rgba(${n[0]},${n[1]},${n[2]},${a})`;
  }

  // ── Données ──
  let desc = ((profil.hero||{}).lead || (profil.apropos||{}).intro || '').trim();
  if (!desc) desc = `Professionnel spécialisé en ${c.profession||'son domaine'}, disponible pour services, collaborations et opportunités.`;

  const specs      = ((profil.competences||[]).slice(0,6)).map(k=>k.titre).filter(Boolean);
  const specsL     = specs.slice(0,3);
  const localisation = ((profil.contact||{}).localisation||'').trim();
  const siteWeb    = c.sous_domaine ? 'https://'+c.sous_domaine : 'sotchedji.store';
  const social     = profil.social || {};
  const linkedin   = (social.linkedin||'').replace(/https?:\/\/(www\.)?linkedin\.com\/(in\/)?/,'').replace(/\/$/,'');
  const nbExp      = (profil.experience||[]).length;
  const nbProjets  = (profil.projets||[]).length;
  const nbCertifs  = (profil.certifications||[]).length;

  // ── Photo ──
  const showPhoto = (profil.visibilite?.photo_carte !== false);
  let photoImg = null;
  if (showPhoto && c.photo_url) {
    try {
      photoImg = await Promise.race([
        _loadImg(c.photo_url),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 30000))
      ]);
    } catch(e) { console.warn('[carte] photo timeout/échec:', e && e.message); }
    toast(photoImg ? 'Photo chargée ✓' : 'Photo non chargée — initiales', photoImg ? 'success' : 'info', photoImg ? '🖼' : '👤');
  }

  const nomComplet = ((c.prenom||'')+' '+(c.nom||'')).trim().toUpperCase();
  const contactRows = [];
  if (c.email)      contactRows.push({ic:'✉', val:c.email});
  if (c.telephone)  contactRows.push({ic:'✆', val:c.telephone});
  contactRows.push({ic:'⊕', val:siteWeb});
  if (localisation) contactRows.push({ic:'⌖', val:localisation});

  // ── drawAvatar ──
  function drawAvatar(ctx, ax, ay, ar, dark) {
    ctx.save();
    ctx.shadowColor = dark ? wa(accent,0.45) : wa(panel2,0.4);
    ctx.shadowBlur  = 22;
    const ag = ctx.createLinearGradient(ax-ar, ay-ar, ax+ar, ay+ar);
    ag.addColorStop(0, dark ? accent : panel1);
    ag.addColorStop(1, dark ? panel2 : accent);
    ctx.fillStyle = ag; _cercle(ctx,ax,ay,ar); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.22)' : wa(panel2,0.22);
    ctx.lineWidth = 2.5; _cercle(ctx,ax,ay,ar+4); ctx.stroke();
    if (photoImg) {
      ctx.save(); _cercle(ctx,ax,ay,ar); ctx.clip();
      ctx.drawImage(photoImg, ax-ar, ay-ar, ar*2, ar*2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(ar*0.58)}px ${font}`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(initiales, ax, ay); ctx.textBaseline='alphabetic';
    }
  }

  function sep(ctx,x1,x2,y,a=0.13) {
    ctx.strokeStyle=wa(panel1,a); ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
  }
  function lbl(ctx,txt,x,y) {
    ctx.font=`bold 7.5px ${font}`; ctx.fillStyle=wa(muted,0.65);
    ctx.textAlign='left'; ctx.fillText(txt,x,y);
  }

  // ════════════════════════════════════════
  // CARTE PORTRAIT 420 × 680
  // ════════════════════════════════════════
  const PW=420, PH=680;
  const cp=_makeCanvas(PW,PH,2); const p=cp.ctx;

  // Fond
  p.fillStyle=bg; p.fillRect(0,0,PW,PH);
  p.save(); p.globalAlpha=0.06;
  p.fillStyle=accent; _cercle(p,-40,PH*.18,200); p.fill();
  p.fillStyle=panel1; _cercle(p,PW+40,PH*.78,190); p.fill();
  p.restore();

  // Barre top dégradée
  const barG=p.createLinearGradient(0,0,PW,0);
  barG.addColorStop(0,panel1); barG.addColorStop(1,accent);
  p.fillStyle=barG; p.fillRect(0,0,PW,6);

  // Avatar
  const lx=PW/2, ly=112, lr=56;
  drawAvatar(p,lx,ly,lr,false);

  // Nom
  p.fillStyle=ink; p.font=`bold 19px ${font}`; p.textAlign='center';
  p.fillText(_truncate(p,nomComplet,PW-40),PW/2,ly+lr+34);

  // Profession (fond clair → couleur accent lisible)
  const profLP=_wrapText(p,c.profession||'',PW-80,2);
  p.fillStyle=accent; p.font=`11px ${font}`; p.textAlign='center';
  profLP.forEach((l,i)=>p.fillText(l,PW/2,ly+lr+54+i*14));
  const apP=ly+lr+54+profLP.length*14;

  sep(p,PW*.22,PW*.78,apP+10);
  let pY=apP+28;

  // Description
  p.font=`10.5px ${font}`; p.fillStyle=wa(muted,0.9); p.textAlign='center';
  _wrapText(p,desc,PW-70,3).forEach(l=>{ p.fillText(l,PW/2,pY); pY+=16; });

  // Pills compétences
  if (specsL.length>0) {
    pY+=14;
    const pH2=22,pG=7;
    p.font=`bold 9px ${font}`;
    const pW2=Math.floor((PW-44-pG*(specsL.length-1))/specsL.length);
    let sx=22;
    specsL.forEach(spec=>{
      const lb=_truncate(p,spec,pW2-16);
      p.fillStyle=pBg; _rrPath(p,sx,pY,pW2,pH2,11); p.fill();
      p.strokeStyle=pBord; p.lineWidth=1; _rrPath(p,sx,pY,pW2,pH2,11); p.stroke();
      p.fillStyle=pTxt; p.textAlign='center';
      p.fillText(lb,sx+pW2/2,pY+pH2/2+3.5);
      sx+=pW2+pG;
    });
    pY+=pH2;
  }

  // Stats
  if (nbExp||nbProjets||nbCertifs) {
    pY+=16; sep(p,PW*.08,PW*.92,pY); pY+=14;
    const si=[];
    if (nbExp)     si.push({n:nbExp,    l:nbExp>1?'Expériences':'Expérience'});
    if (nbProjets) si.push({n:nbProjets,l:'Projets'});
    if (nbCertifs) si.push({n:nbCertifs,l:'Certifications'});
    const sW=Math.floor((PW-44)/si.length);
    si.forEach((s,i)=>{
      const cx=22+i*sW+sW/2;
      p.font=`bold 18px ${font}`; p.fillStyle=accent; p.textAlign='center';
      p.fillText(String(s.n),cx,pY+18);
      p.font=`8.5px ${font}`; p.fillStyle=wa(muted,0.85);
      p.fillText(s.l,cx,pY+30);
    });
    pY+=36;
  }

  pY+=12; sep(p,PW*.08,PW*.92,pY); pY+=14;

  // Coordonnées
  const vrH=38,vrG=6;
  contactRows.forEach(({ic,val})=>{
    p.fillStyle=rBg; _rrPath(p,PW*.07,pY,PW*.86,vrH,10); p.fill();
    p.strokeStyle=rBord; p.lineWidth=0.7; _rrPath(p,PW*.07,pY,PW*.86,vrH,10); p.stroke();
    p.fillStyle=accent; p.font=`bold 13px ${font}`; p.textAlign='left';
    p.fillText(ic,PW*.12,pY+vrH/2+5);
    p.fillStyle=ink; p.font=`10.5px ${font}`;
    p.fillText(_truncate(p,val,PW*.60),PW*.19,pY+vrH/2+5);
    pY+=vrH+vrG;
  });

  if (linkedin) {
    pY+=4;
    p.fillStyle='rgba(10,102,194,.09)'; _rrPath(p,PW*.07,pY,PW*.86,28,8); p.fill();
    p.strokeStyle='rgba(10,102,194,.25)'; p.lineWidth=0.7; _rrPath(p,PW*.07,pY,PW*.86,28,8); p.stroke();
    p.fillStyle='#0a66c2'; p.font=`bold 10px ${font}`; p.textAlign='left';
    p.fillText('in',PW*.12,pY+19);
    p.fillStyle=ink; p.font=`10px ${font}`;
    p.fillText(_truncate(p,'linkedin.com/in/'+linkedin,PW*.60),PW*.19,pY+19);
    pY+=32;
  }

  pY+=10; sep(p,PW*.1,PW*.9,pY); pY+=14;
  p.fillStyle=wa(muted,0.8); p.font=`8.5px ${font}`; p.textAlign='center';
  p.fillText('Généré par PortfolioHub · DS Services',PW/2,pY); pY+=13;
  p.fillStyle=wa(accent,0.75); p.font=`bold 8px ${font}`;
  p.fillText('sotchedji.store',PW/2,pY);

  // Bordure
  p.strokeStyle=wa(panel1,0.12); p.lineWidth=2;
  _rrPath(p,1,1,PW-2,PH-2,22); p.stroke();

  // ════════════════════════════════════════
  // CARTE PAYSAGE 700 × 420
  // ════════════════════════════════════════
  const LW=700, LH=420, LP=252;
  const cl=_makeCanvas(LW,LH,2); const lv=cl.ctx;

  lv.fillStyle=bg; lv.fillRect(0,0,LW,LH);

  // Panel gauche dégradé
  const panG=lv.createLinearGradient(0,0,0,LH);
  panG.addColorStop(0,panel1); panG.addColorStop(1,panel2);
  lv.fillStyle=panG; lv.fillRect(0,0,LP,LH);

  // Déco cercle
  lv.save(); lv.globalAlpha=0.09; lv.fillStyle=accent;
  _cercle(lv,LP*.85,LH*.88,80); lv.fill(); lv.restore();

  // Liseré dégradé
  const lisG=lv.createLinearGradient(0,0,0,LH);
  lisG.addColorStop(0,acBar); lisG.addColorStop(0.5,wa(accent,0.5)); lisG.addColorStop(1,panel1);
  lv.fillStyle=lisG; lv.fillRect(LP-4,0,4,LH);

  // Avatar
  const lax=LP/2, lay=LH/2-30, lar=54;
  drawAvatar(lv,lax,lay,lar,true);

  // Nom (toujours blanc sur fond sombre)
  lv.fillStyle='#ffffff'; lv.font=`bold 13.5px ${font}`; lv.textAlign='center';
  lv.fillText(_truncate(lv,nomComplet,LP-18),lax,lay+lar+24);

  // Profession — couleur spécifique par thème, toujours lisible
  const profLLv=_wrapText(lv,c.profession||'',LP-28,2);
  lv.fillStyle=pDark; lv.font=`9px ${font}`; lv.textAlign='center';
  profLLv.forEach((l,i)=>lv.fillText(l,lax,lay+lar+38+i*12));
  const apLv=lay+lar+38+profLLv.length*12;

  // Sépar gauche
  lv.strokeStyle='rgba(255,255,255,0.15)'; lv.lineWidth=0.8;
  lv.beginPath(); lv.moveTo(LP*.12,apLv+8); lv.lineTo(LP*.88,apLv+8); lv.stroke();

  // Pills gauche (fond sombre → blancs transparents)
  if (specsL.length>0) {
    let py2=apLv+20;
    lv.font=`7.5px ${font}`;
    specsL.forEach(spec=>{
      const lb=_truncate(lv,spec,LP-32);
      const tw=lv.measureText(lb).width;
      const px2=lax-tw/2-8,pw2=tw+16,ph2=16;
      lv.fillStyle='rgba(255,255,255,0.11)'; _rrPath(lv,px2,py2,pw2,ph2,8); lv.fill();
      lv.strokeStyle='rgba(255,255,255,0.22)'; lv.lineWidth=0.6;
      _rrPath(lv,px2,py2,pw2,ph2,8); lv.stroke();
      lv.fillStyle='rgba(255,255,255,0.90)'; lv.textAlign='center';
      lv.fillText(lb,lax,py2+ph2/2+3);
      py2+=ph2+4;
    });
  }

  lv.fillStyle='rgba(255,255,255,0.25)'; lv.font=`6.5px ${font}`; lv.textAlign='center';
  lv.fillText('PortfolioHub · DS Services',lax,LH-13);

  // ── Panel DROIT ──
  const RX=LP+22, RW=LW-LP-32;

  // Centrage vertical — estimation
  const dLines=Math.min(3,Math.ceil(desc.length/55));
  const spRows=Math.ceil(specs.length/3);
  const hasSt=nbExp>0||nbProjets>0||nbCertifs>0;
  const nCon=contactRows.length+(linkedin?1:0);
  const totalH=(13+dLines*14)+(specs.length?(14+spRows*22):0)+(hasSt?50:0)+(13+nCon*36)+56;
  let ry=Math.max(18,Math.round((LH-totalH)/2));

  // À PROPOS
  lbl(lv,'À PROPOS',RX,ry); ry+=13;
  lv.font=`10px ${font}`; lv.fillStyle=wa(muted,0.9); lv.textAlign='left';
  _wrapText(lv,desc,RW,3).forEach(l=>{ lv.fillText(l,RX,ry); ry+=14; });
  ry+=4; sep(lv,RX,RX+RW,ry); ry+=16;

  // SPÉCIALITÉS
  if (specs.length>0) {
    lbl(lv,'SPÉCIALITÉS',RX,ry); ry+=13;
    lv.font=`8px ${font}`;
    const pw3=Math.floor((RW-8)/3), ph3=18, gx=4, gy=4;
    specs.forEach((spec,i)=>{
      const col=i%3, row=Math.floor(i/3);
      const px=RX+col*(pw3+gx), py=ry+row*(ph3+gy);
      const lb=_truncate(lv,spec,pw3-14);
      lv.fillStyle=pBg; _rrPath(lv,px,py,pw3,ph3,9); lv.fill();
      lv.strokeStyle=pBord; lv.lineWidth=0.7; _rrPath(lv,px,py,pw3,ph3,9); lv.stroke();
      lv.fillStyle=pTxt; lv.textAlign='center';
      lv.fillText(lb,px+pw3/2,py+ph3/2+3);
    });
    ry+=spRows*(ph3+gy)+2;
    sep(lv,RX,RX+RW,ry); ry+=16;
  }

  // STATISTIQUES
  if (hasSt) {
    const si2=[];
    if (nbExp)     si2.push({n:nbExp,    l:nbExp>1?'Expériences':'Expérience'});
    if (nbProjets) si2.push({n:nbProjets,l:'Projets'});
    if (nbCertifs) si2.push({n:nbCertifs,l:'Certifications'});
    const sW2=Math.floor(RW/si2.length);
    si2.forEach((s,i)=>{
      const cx=RX+i*sW2+sW2/2;
      lv.font=`bold 16px ${font}`; lv.fillStyle=accent; lv.textAlign='center';
      lv.fillText(String(s.n),cx,ry+16);
      lv.font=`7.5px ${font}`; lv.fillStyle=wa(muted,0.85);
      lv.fillText(s.l,cx,ry+27);
    });
    ry+=46; sep(lv,RX,RX+RW,ry); ry+=14;
  }

  // COORDONNÉES
  lbl(lv,'COORDONNÉES',RX,ry); ry+=12;
  const rH=32,rG=4;
  contactRows.forEach(({ic,val})=>{
    lv.fillStyle=rBg; _rrPath(lv,RX,ry,RW,rH,8); lv.fill();
    lv.strokeStyle=rBord; lv.lineWidth=0.6; _rrPath(lv,RX,ry,RW,rH,8); lv.stroke();
    lv.fillStyle=accent; lv.font=`bold 11px ${font}`; lv.textAlign='left';
    lv.fillText(ic,RX+9,ry+rH/2+4);
    lv.fillStyle=ink; lv.font=`9.5px ${font}`;
    lv.fillText(_truncate(lv,val,RW-40),RX+27,ry+rH/2+4);
    ry+=rH+rG;
  });

  if (linkedin) {
    lv.fillStyle='rgba(10,102,194,.09)'; _rrPath(lv,RX,ry,RW,rH,8); lv.fill();
    lv.strokeStyle='rgba(10,102,194,.28)'; lv.lineWidth=0.6; _rrPath(lv,RX,ry,RW,rH,8); lv.stroke();
    lv.fillStyle='#0a66c2'; lv.font=`bold 9px ${font}`; lv.textAlign='left';
    lv.fillText('in',RX+9,ry+rH/2+4);
    lv.fillStyle=ink; lv.font=`9.5px ${font}`;
    lv.fillText(_truncate(lv,'linkedin.com/in/'+linkedin,RW-40),RX+27,ry+rH/2+4);
    ry+=rH+rG;
  }

  // Footer droit
  lv.strokeStyle=wa(panel1,0.11); lv.lineWidth=0.7;
  lv.beginPath(); lv.moveTo(RX,LH-22); lv.lineTo(RX+RW,LH-22); lv.stroke();
  lv.fillStyle=wa(accent,0.70); lv.font=`bold 7.5px ${font}`; lv.textAlign='center';
  lv.fillText('sotchedji.store',RX+RW/2,LH-9);

  // Bordure
  lv.strokeStyle=wa(panel1,0.11); lv.lineWidth=2;
  _rrPath(lv,1,1,LW-2,LH-2,22); lv.stroke();

  // ── Téléchargement ──
  _dlCanvas(cp.canvas,`carte_portrait_${c.prenom}_${c.nom}`);
  setTimeout(()=>_dlCanvas(cl.canvas,`carte_paysage_${c.prenom}_${c.nom}`),400);
  toast(`2 cartes de ${c.prenom} téléchargées !`,'success','🪪');
}
