// ══════════════════════════════════════════════════════════
// ── EXPORT CARTE PNG ──────────────────────────────════════
// ══════════════════════════════════════════════════════════

async function exporterCarteClient(id) {
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  toast('Génération de la carte...', 'info', '🪪');

  const profil = c.profil || {};
  const initiales = ((c.prenom||'?')[0]+(c.nom||'?')[0]).toUpperCase();

  // ── Palette exacte du template ──
  const tpl = allTemplates.find(t => String(t.id) === String(c.template_id));
  const cssMap = {};
  (extraireSwatchesCss(tpl ? tpl.css_vars : '')).forEach(s => { cssMap[s.name] = s.value; });

  const COL = {
    bg:      cssMap['soft']      || '#f4f8fb',
    surface: cssMap['panel']     || '#ffffff',
    text:    cssMap['ink']       || '#102033',
    muted:   cssMap['muted']     || '#66778e',
    primary: cssMap['navy']      || '#12476d',
    accent:  cssMap['teal']      || '#0aa393',
    gold:    cssMap['gold']      || '#caa04a',
  };
  const tplFont = (cssMap['font']||'').includes('Georgia') ? 'Georgia' : 'Arial';
  const panelDark = cssMap['navy-dark'] || cssMap['ink'] || COL.primary;

  // ── Helpers couleur ──
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    if (h.length===3) return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)];
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  function withAlpha(hex, a) {
    if (!hex||!hex.startsWith('#')) return hex||'transparent';
    try { const [r,g,b]=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; } catch { return hex; }
  }
  function luminance(hex) {
    try { const [r,g,b]=hexToRgb(hex); return (r*299+g*587+b*114)/1000; } catch { return 200; }
  }

  const bgIsDark   = luminance(COL.bg) < 128;
  const onBg       = bgIsDark ? '#ffffff' : COL.text;
  const onBgMuted  = bgIsDark ? 'rgba(255,255,255,0.6)' : withAlpha(COL.muted, 0.9);
  const pillBg     = withAlpha(COL.accent, 0.12);
  const pillStroke = withAlpha(COL.accent, 0.45);
  const pillText   = COL.primary;
  const ringColor  = withAlpha(COL.primary, 0.25);
  const rowBg      = withAlpha(COL.primary, 0.05);
  const rowStroke  = withAlpha(COL.primary, 0.12);

  // ── Données ──
  let desc = ((profil.hero||{}).lead || (profil.apropos||{}).intro || '').trim();
  if (!desc) desc = `Professionnel spécialisé en ${c.profession||'son domaine'}, disponible pour des services, collaborations et opportunités.`;

  const specs       = ((profil.competences||[]).slice(0,6)).map(k=>k.titre).filter(Boolean);
  const specsLeft   = specs.slice(0,3); // pills panel gauche portrait
  const localisation= ((profil.contact||{}).localisation||'').trim();
  const siteWeb     = c.sous_domaine ? 'https://'+c.sous_domaine : 'sotchedji.store';
  const social      = profil.social || {};
  const linkedin    = (social.linkedin||'').replace(/https?:\/\/(www\.)?linkedin\.com\/(in\/)?/,'').replace(/\/$/,'');
  const nbExp       = (profil.experience||[]).length;
  const nbProjets   = (profil.projets||[]).length;
  const nbCertifs   = (profil.certifications||[]).length;

  // ── Photo ──
  // _loadImg gère lui-même raw URL + data URL + fallbacks — on lui passe l'URL d'origine
  const showPhotoOnCard = (profil.visibilite?.photo_carte !== false);
  let photoImg = null;
  if (showPhotoOnCard && c.photo_url) {
    try {
      photoImg = await Promise.race([
        _loadImg(c.photo_url),
        new Promise((_, r) => setTimeout(r, 15000))
      ]);
    } catch(e) { console.warn('[carte] photo timeout ou erreur', e); }
    if (photoImg) toast(`Photo chargée ✓`, 'success', '🖼');
    else toast(`Photo non chargée — initiales utilisées`, 'info', '👤');
  }

  // ── Données contact ──
  const nomComplet  = ((c.prenom||'')+' '+(c.nom||'')).trim().toUpperCase();
  const contactRows = [];
  if (c.email)      contactRows.push({ic:'✉', val: c.email});
  if (c.telephone)  contactRows.push({ic:'✆', val: c.telephone});
  contactRows.push({ic:'⊕', val: siteWeb});
  if (localisation) contactRows.push({ic:'⌖', val: localisation});

  // ── Avatar helper ──
  function drawAvatar(ctx, ax, ay, ar, dark) {
    ctx.save();
    ctx.shadowColor = withAlpha(dark ? COL.accent : COL.primary, 0.4);
    ctx.shadowBlur = 20;
    const ag = ctx.createLinearGradient(ax-ar, ay-ar, ax+ar, ay+ar);
    ag.addColorStop(0, dark ? COL.accent : COL.primary);
    ag.addColorStop(1, dark ? COL.primary : COL.accent);
    ctx.fillStyle = ag; _cercle(ctx, ax, ay, ar); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.22)' : ringColor;
    ctx.lineWidth = 2.5; _cercle(ctx, ax, ay, ar+4); ctx.stroke();
    if (photoImg) {
      ctx.save(); _cercle(ctx, ax, ay, ar); ctx.clip();
      ctx.drawImage(photoImg, ax-ar, ay-ar, ar*2, ar*2);
      ctx.restore();
    } else {
      const initCol = dark ? '#ffffff' : (luminance(COL.primary)<160 ? '#ffffff' : COL.text);
      ctx.fillStyle = initCol;
      ctx.font = `bold ${Math.round(ar*0.58)}px ${tplFont}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initiales, ax, ay); ctx.textBaseline = 'alphabetic';
    }
  }

  // ── Separator helper ──
  function drawSep(ctx, x1, x2, y, alpha=0.14) {
    ctx.strokeStyle = withAlpha(COL.primary, alpha);
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  }

  // ── Section label helper ──
  function drawLabel(ctx, text, x, y, font) {
    ctx.font = font || `bold 7.5px ${tplFont}`;
    ctx.fillStyle = withAlpha(COL.muted, 0.65);
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  }

  // ════════════════════════════════════════════
  // CARTE PORTRAIT (420 × 680)
  // ════════════════════════════════════════════
  const PW = 420, PH = 680;
  const cp = _makeCanvas(PW, PH, 2);
  const p  = cp.ctx;

  // Fond + déco
  p.fillStyle = COL.bg; p.fillRect(0, 0, PW, PH);
  p.save(); p.globalAlpha = 0.06;
  p.fillStyle = COL.accent; _cercle(p, -40, PH*0.18, 200); p.fill();
  p.fillStyle = COL.primary; _cercle(p, PW+40, PH*0.78, 190); p.fill();
  p.restore();

  // Barre top accent
  p.fillStyle = COL.primary; p.fillRect(0, 0, PW, 6);
  const barG = p.createLinearGradient(0,0,PW,0);
  barG.addColorStop(0, COL.primary); barG.addColorStop(1, COL.accent);
  p.fillStyle = barG; p.fillRect(0, 0, PW, 6);

  // Avatar
  const lx = PW/2, ly = 112, lr = 56;
  drawAvatar(p, lx, ly, lr, false);

  // Nom
  p.fillStyle = onBg; p.font = `bold 19px ${tplFont}`; p.textAlign = 'center';
  p.fillText(_truncate(p, nomComplet, PW-40), PW/2, ly+lr+34);

  // Profession portrait — visible sur fond clair (bg)
  const profLinesP = _wrapText(p, c.profession||'', PW-80, 2);
  // Sur fond clair : accent si lisible, sinon primary
  const profColP   = luminance(COL.accent) > 60 ? COL.accent : COL.primary;
  p.fillStyle = profColP; p.font = `11px ${tplFont}`; p.textAlign = 'center';
  profLinesP.forEach((line, i) => p.fillText(line, PW/2, ly+lr+54 + i*14));
  const afterProf = ly+lr+54 + profLinesP.length*14;

  // Ligne sépar
  drawSep(p, PW*0.22, PW*0.78, afterProf+10);

  // Description
  let pY = afterProf+28;
  p.font = `10.5px ${tplFont}`; p.fillStyle = onBgMuted; p.textAlign = 'center';
  _wrapText(p, desc, PW-70, 3).forEach(line => { p.fillText(line, PW/2, pY); pY += 16; });

  // Pills compétences
  if (specsLeft.length > 0) {
    pY += 14;
    const pH2=22, pG=7;
    p.font = `bold 9px ${tplFont}`;
    const pMaxW = Math.floor((PW-44 - pG*(specsLeft.length-1)) / specsLeft.length);
    let sx = 22;
    specsLeft.forEach(spec => {
      const lbl = _truncate(p, spec, pMaxW-16);
      p.fillStyle = pillBg; _rrPath(p, sx, pY, pMaxW, pH2, 11); p.fill();
      p.strokeStyle = pillStroke; p.lineWidth = 1; _rrPath(p, sx, pY, pMaxW, pH2, 11); p.stroke();
      p.fillStyle = pillText; p.textAlign = 'center';
      p.fillText(lbl, sx+pMaxW/2, pY+pH2/2+3.5);
      sx += pMaxW+pG;
    });
    pY += pH2;
  }

  // Stats rapides si dispo (expériences / projets / certifs)
  if (nbExp || nbProjets || nbCertifs) {
    pY += 16;
    drawSep(p, PW*0.08, PW*0.92, pY); pY += 14;
    const statItems = [];
    if (nbExp)     statItems.push({ n: nbExp,     l: nbExp>1?'Expériences':'Expérience' });
    if (nbProjets) statItems.push({ n: nbProjets, l: nbProjets>1?'Projets':'Projet' });
    if (nbCertifs) statItems.push({ n: nbCertifs, l: nbCertifs>1?'Certifications':'Certification' });
    const sW = Math.floor((PW-44) / statItems.length);
    statItems.forEach((st, i) => {
      const sx2 = 22 + i*sW + sW/2;
      p.font = `bold 18px ${tplFont}`; p.fillStyle = COL.accent; p.textAlign = 'center';
      p.fillText(String(st.n), sx2, pY+18);
      p.font = `8.5px ${tplFont}`; p.fillStyle = onBgMuted;
      p.fillText(st.l, sx2, pY+30);
    });
    pY += 36;
  }

  // Sépar contact
  pY += 12; drawSep(p, PW*0.08, PW*0.92, pY); pY += 14;

  // Coordonnées
  const vrH = 38, vrG = 6;
  contactRows.forEach(({ic, val}) => {
    p.fillStyle = rowBg; _rrPath(p, PW*0.07, pY, PW*0.86, vrH, 10); p.fill();
    p.strokeStyle = rowStroke; p.lineWidth = 0.7; _rrPath(p, PW*0.07, pY, PW*0.86, vrH, 10); p.stroke();
    p.fillStyle = COL.accent; p.font = `bold 13px ${tplFont}`; p.textAlign = 'left';
    p.fillText(ic, PW*0.12, pY+vrH/2+5);
    p.fillStyle = onBg; p.font = `10.5px ${tplFont}`;
    p.fillText(_truncate(p, val, PW*0.60), PW*0.19, pY+vrH/2+5);
    pY += vrH+vrG;
  });

  // LinkedIn si dispo
  if (linkedin) {
    pY += 4;
    p.fillStyle = withAlpha('#0a66c2', 0.10); _rrPath(p, PW*0.07, pY, PW*0.86, 28, 8); p.fill();
    p.strokeStyle = withAlpha('#0a66c2', 0.25); p.lineWidth = 0.7; _rrPath(p, PW*0.07, pY, PW*0.86, 28, 8); p.stroke();
    p.fillStyle = '#0a66c2'; p.font = `bold 10px ${tplFont}`; p.textAlign = 'left';
    p.fillText('in', PW*0.12, pY+19);
    p.fillStyle = onBg; p.font = `10px ${tplFont}`;
    p.fillText(_truncate(p, 'linkedin.com/in/'+linkedin, PW*0.60), PW*0.19, pY+19);
    pY += 32;
  }

  // Footer portrait
  pY += 10;
  drawSep(p, PW*0.1, PW*0.9, pY); pY += 14;
  p.fillStyle = onBgMuted; p.font = `8.5px ${tplFont}`; p.textAlign = 'center';
  p.fillText('Généré par PortfolioHub · DS Services', PW/2, pY); pY += 13;
  p.fillStyle = withAlpha(COL.accent, 0.7); p.font = `bold 8px ${tplFont}`;
  p.fillText('sotchedji.store', PW/2, pY);

  // Bordure carte portrait
  p.strokeStyle = withAlpha(COL.primary, 0.12); p.lineWidth = 2;
  _rrPath(p, 1, 1, PW-2, PH-2, 22); p.stroke();

  // ════════════════════════════════════════════
  // CARTE PAYSAGE (700 × 420)
  // ════════════════════════════════════════════
  const LW = 700, LH = 420, LP = 252;
  const cl = _makeCanvas(LW, LH, 2);
  const lv = cl.ctx;

  // Fond
  lv.fillStyle = COL.bg; lv.fillRect(0, 0, LW, LH);

  // ── Panel GAUCHE sombre ──
  const panGrd = lv.createLinearGradient(0, 0, 0, LH);
  panGrd.addColorStop(0, panelDark); panGrd.addColorStop(1, COL.primary);
  lv.fillStyle = panGrd; lv.fillRect(0, 0, LP, LH);

  // Déco cercle bas-droite panel gauche
  lv.save(); lv.globalAlpha = 0.09; lv.fillStyle = COL.accent;
  _cercle(lv, LP*0.85, LH*0.88, 80); lv.fill(); lv.restore();

  // Liseré accent vertical
  const lisG = lv.createLinearGradient(0, 0, 0, LH);
  lisG.addColorStop(0, COL.accent); lisG.addColorStop(0.5, withAlpha(COL.accent, 0.5)); lisG.addColorStop(1, COL.primary);
  lv.fillStyle = lisG; lv.fillRect(LP-4, 0, 4, LH);

  // Avatar — centré verticalement dans le panel gauche
  const lax = LP/2, lay = LH/2 - 30, lar = 54;
  drawAvatar(lv, lax, lay, lar, true);

  // Nom (blanc)
  lv.fillStyle = '#ffffff'; lv.font = `bold 13.5px ${tplFont}`; lv.textAlign = 'center';
  lv.fillText(_truncate(lv, nomComplet, LP-18), lax, lay+lar+24);

  // Profession — wrap 2 lignes max, jamais tronqué avec "..."
  // Contraste : si accent trop proche du fond sombre → blanc
  const profLinesLv  = _wrapText(lv, c.profession||'', LP-28, 2);
  const panelBgLum   = luminance(panelDark);
  const accentLum    = luminance(COL.accent);
  const profColLv    = (accentLum - panelBgLum) > 45
    ? withAlpha(COL.accent, 0.95)   // contraste suffisant → couleur accent
    : 'rgba(255,255,255,0.85)';     // contraste faible (ex: Moderne indigo) → blanc
  lv.fillStyle = profColLv; lv.font = `9px ${tplFont}`; lv.textAlign = 'center';
  profLinesLv.forEach((line, i) => lv.fillText(line, lax, lay+lar+38 + i*12));
  const afterProfLv = lay+lar+38 + profLinesLv.length*12;

  // Sépar gauche
  lv.strokeStyle = 'rgba(255,255,255,0.14)'; lv.lineWidth = 0.8;
  lv.beginPath(); lv.moveTo(LP*0.12, afterProfLv+8); lv.lineTo(LP*0.88, afterProfLv+8); lv.stroke();

  // Pills compétences panel gauche (vertical)
  if (specsLeft.length > 0) {
    let py2 = afterProfLv+20;
    lv.font = `7.5px ${tplFont}`;
    specsLeft.forEach(spec => {
      const lbl = _truncate(lv, spec, LP-32);
      const tw = lv.measureText(lbl).width;
      const px2 = lax-tw/2-8, pw2 = tw+16, ph2 = 16;
      lv.fillStyle = 'rgba(255,255,255,0.10)'; _rrPath(lv, px2, py2, pw2, ph2, 8); lv.fill();
      lv.strokeStyle = 'rgba(255,255,255,0.20)'; lv.lineWidth = 0.6;
      _rrPath(lv, px2, py2, pw2, ph2, 8); lv.stroke();
      lv.fillStyle = 'rgba(255,255,255,0.88)'; lv.textAlign = 'center';
      lv.fillText(lbl, lax, py2+ph2/2+3);
      py2 += ph2+4;
    });
  }

  // Footer panel gauche
  lv.fillStyle = 'rgba(255,255,255,0.25)'; lv.font = `6.5px ${tplFont}`; lv.textAlign = 'center';
  lv.fillText('PortfolioHub · DS Services', lax, LH-13);

  // ── Panel DROIT (sans répétition du nom) ──
  const RX = LP+22, RW = LW-LP-32;

  // Calculer la hauteur totale du contenu pour centrage vertical
  const descLinesR  = _wrapText({ measureText: t => ({ width: t.length*5.5 }) }, desc, RW, 3).length; // estimation
  const specRows    = Math.ceil(specs.length / 3);
  const hasStatsR   = nbExp > 0 || nbProjets > 0 || nbCertifs > 0;
  const nContact    = contactRows.length + (linkedin ? 1 : 0);

  // Hauteur estimée des sections :
  const hApropos    = 10 + descLinesR*14;       // label + desc
  const hSep1       = 18;
  const hSpecs      = specs.length ? (10 + specRows*22) : 0;
  const hSep2       = specs.length ? 18 : 0;
  const hStats      = hasStatsR ? 46 : 0;
  const hSep3       = hasStatsR ? 18 : 0;
  const hCoords     = 10 + nContact*36;
  const hFooter     = 28;
  const totalH = hApropos + hSep1 + hSpecs + hSep2 + hStats + hSep3 + hCoords + hFooter;
  let ry = Math.max(20, Math.round((LH - totalH) / 2));

  // ─ À PROPOS ─
  drawLabel(lv, 'À PROPOS', RX, ry); ry += 13;
  lv.font = `10px ${tplFont}`; lv.fillStyle = onBgMuted; lv.textAlign = 'left';
  _wrapText(lv, desc, RW, 3).forEach(line => { lv.fillText(line, RX, ry); ry += 14; });
  ry += 4;

  // Sépar
  drawSep(lv, RX, RX+RW, ry); ry += hSep1;

  // ─ SPÉCIALITÉS (toutes les compétences, pas seulement les 3 premières) ─
  if (specs.length > 0) {
    drawLabel(lv, 'SPÉCIALITÉS', RX, ry); ry += 13;
    lv.font = `8px ${tplFont}`;
    const pillW = Math.floor((RW - 8) / 3);
    const pillH = 18, pillGx = 4, pillGy = 4;
    specs.forEach((spec, i) => {
      const col = i % 3, row = Math.floor(i/3);
      const px = RX + col*(pillW+pillGx);
      const py = ry + row*(pillH+pillGy);
      const lbl = _truncate(lv, spec, pillW-14);
      lv.fillStyle = pillBg; _rrPath(lv, px, py, pillW, pillH, 9); lv.fill();
      lv.strokeStyle = pillStroke; lv.lineWidth = 0.7; _rrPath(lv, px, py, pillW, pillH, 9); lv.stroke();
      lv.fillStyle = pillText; lv.textAlign = 'center';
      lv.fillText(lbl, px+pillW/2, py+pillH/2+3);
    });
    ry += specRows*(pillH+pillGy) + 2;
    drawSep(lv, RX, RX+RW, ry); ry += hSep2;
  }

  // ─ STATISTIQUES rapides (si données disponibles) ─
  if (hasStatsR) {
    const statItems2 = [];
    if (nbExp)     statItems2.push({ n: nbExp,     l: nbExp>1?'Expériences':'Expérience' });
    if (nbProjets) statItems2.push({ n: nbProjets, l: 'Projets' });
    if (nbCertifs) statItems2.push({ n: nbCertifs, l: 'Certifications' });
    const sW2 = Math.floor(RW / statItems2.length);
    statItems2.forEach((st, i) => {
      const cx = RX + i*sW2 + sW2/2;
      lv.font = `bold 16px ${tplFont}`; lv.fillStyle = COL.accent; lv.textAlign = 'center';
      lv.fillText(String(st.n), cx, ry+16);
      lv.font = `7.5px ${tplFont}`; lv.fillStyle = onBgMuted;
      lv.fillText(st.l, cx, ry+27);
    });
    ry += hStats;
    drawSep(lv, RX, RX+RW, ry); ry += hSep3;
  }

  // ─ COORDONNÉES ─
  drawLabel(lv, 'COORDONNÉES', RX, ry); ry += 12;
  const rH = 32, rG = 4;
  contactRows.forEach(({ic, val}) => {
    lv.fillStyle = rowBg; _rrPath(lv, RX, ry, RW, rH, 8); lv.fill();
    lv.strokeStyle = rowStroke; lv.lineWidth = 0.6; _rrPath(lv, RX, ry, RW, rH, 8); lv.stroke();
    lv.fillStyle = COL.accent; lv.font = `bold 11px ${tplFont}`; lv.textAlign = 'left';
    lv.fillText(ic, RX+9, ry+rH/2+4);
    lv.fillStyle = onBg; lv.font = `9.5px ${tplFont}`;
    lv.fillText(_truncate(lv, val, RW-40), RX+27, ry+rH/2+4);
    ry += rH+rG;
  });

  // LinkedIn si dispo
  if (linkedin) {
    lv.fillStyle = withAlpha('#0a66c2', 0.10); _rrPath(lv, RX, ry, RW, rH, 8); lv.fill();
    lv.strokeStyle = withAlpha('#0a66c2', 0.28); lv.lineWidth = 0.6; _rrPath(lv, RX, ry, RW, rH, 8); lv.stroke();
    lv.fillStyle = '#0a66c2'; lv.font = `bold 9px ${tplFont}`; lv.textAlign = 'left';
    lv.fillText('in', RX+9, ry+rH/2+4);
    lv.fillStyle = onBg; lv.font = `9.5px ${tplFont}`;
    lv.fillText(_truncate(lv, 'linkedin.com/in/'+linkedin, RW-40), RX+27, ry+rH/2+4);
    ry += rH+rG;
  }

  // ─ Footer droit ─
  lv.strokeStyle = withAlpha(COL.primary, 0.11); lv.lineWidth = 0.7;
  lv.beginPath(); lv.moveTo(RX, LH-22); lv.lineTo(RX+RW, LH-22); lv.stroke();
  lv.fillStyle = withAlpha(COL.accent, 0.65); lv.font = `bold 7.5px ${tplFont}`; lv.textAlign = 'center';
  lv.fillText('sotchedji.store', RX+RW/2, LH-9);

  // Bordure carte paysage
  lv.strokeStyle = withAlpha(COL.primary, 0.11); lv.lineWidth = 2;
  _rrPath(lv, 1, 1, LW-2, LH-2, 22); lv.stroke();

  // ── Téléchargement ──
  _dlCanvas(cp.canvas, `carte_portrait_${c.prenom}_${c.nom}`);
  setTimeout(() => _dlCanvas(cl.canvas, `carte_paysage_${c.prenom}_${c.nom}`), 400);
  toast(`2 cartes de ${c.prenom} téléchargées !`, 'success', '🪪');
}
