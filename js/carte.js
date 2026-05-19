// ══════════════════════════════════════════════════════════
// ── EXPORT CARTE PNG ──────────────────────────────────────
// ══════════════════════════════════════════════════════════

async function exporterCarteClient(id) {
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  toast('Génération de la carte...', 'info', '🪪');

  const W = 420, H = 680, SC = 2;
  const profil = c.profil || {};
  const initiales = ((c.prenom||'?')[0]+(c.nom||'?')[0]).toUpperCase();

  // ── Palette exacte du template (vars réelles: --ink, --navy, --teal, --gold, --soft, --muted) ──
  const tpl = allTemplates.find(t => String(t.id) === String(c.template_id));
  const cssMap = {};
  (extraireSwatchesCss(tpl ? tpl.css_vars : '')).forEach(s => { cssMap[s.name] = s.value; });

  // Mapping exact sur les noms de variables réels des templates PortfolioHub
  const COL = {
    bg:      cssMap['soft']      || '#f4f8fb',   // --soft  : fond clair du template
    surface: cssMap['panel']     || '#ffffff',   // --panel : fond surfaces/cards
    text:    cssMap['ink']       || '#102033',   // --ink   : texte principal
    muted:   cssMap['muted']     || '#66778e',   // --muted : texte secondaire
    primary: cssMap['navy']      || '#12476d',   // --navy  : couleur principale
    accent:  cssMap['teal']      || '#0aa393',   // --teal  : couleur accent (nom trompeur, varie par template)
    gold:    cssMap['gold']      || '#caa04a',   // --gold  : accent secondaire
    cream:   cssMap['cream']     || '#fbf8f1',   // --cream : fond alternatif chaud
  };
  // Police du template (Georgia pour Élégant, Inter/Arial pour les autres)
  const tplFont = (() => {
    const f = cssMap['font'] || '';
    if (f.includes('Georgia')) return 'Georgia';
    return 'Arial';
  })();

  // Helpers couleur
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    if (h.length === 3) return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)];
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  function withAlpha(hex, a) {
    if (!hex || !hex.startsWith('#')) return hex || 'transparent';
    try { const [r,g,b]=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; } catch { return hex; }
  }
  function luminance(hex) {
    try { const [r,g,b]=hexToRgb(hex); return (r*299+g*587+b*114)/1000; } catch { return 200; }
  }

  // --soft est toujours clair dans les 3 templates → texte toujours COL.text
  const bgIsDark  = luminance(COL.bg) < 128;
  const onBg      = bgIsDark ? '#ffffff' : COL.text;
  const onBgMuted = bgIsDark ? 'rgba(255,255,255,0.6)' : withAlpha(COL.muted, 0.9);

  const pillBg    = withAlpha(COL.accent, 0.12);
  const pillStroke= withAlpha(COL.accent, 0.45);
  const pillText  = COL.primary;
  const ringColor = withAlpha(COL.primary, 0.25);
  const rowBg     = withAlpha(COL.primary, 0.05);
  const rowStroke = withAlpha(COL.primary, 0.12);

  // ── Données dynamiques ──
  let desc = ((profil.hero||{}).lead || (profil.apropos||{}).intro || '').trim();
  if (!desc) {
    const p = c.profession || 'son domaine';
    desc = `Professionnel spécialisé en ${p}, disponible pour des services, collaborations et opportunités professionnelles.`;
  }
  const specs      = ((profil.competences||[]).slice(0,3)).map(k=>k.titre).filter(Boolean);
  const localisation= ((profil.contact||{}).localisation||'').trim();
  const siteWeb    = c.sous_domaine ? 'https://'+c.sous_domaine : (c.domaine ? 'https://'+c.domaine : 'sotchedji.store');

  // ── Photo (seulement si le toggle "Photo sur la carte" est activé) ──
  const showPhotoOnCard = (profil.visibilite?.photo_carte !== false);
  let photoImg = null;
  if (showPhotoOnCard && c.photo_url) {
    const rawSrc  = _toRawUrl(c.photo_url);
    const origSrc = c.photo_url;
    try {
      photoImg = await Promise.race([
        _loadImg(rawSrc),
        new Promise((_,r) => setTimeout(r, 10000))
      ]);
    } catch {}
    if (!photoImg && origSrc !== rawSrc) {
      try {
        photoImg = await Promise.race([
          _loadImg(origSrc),
          new Promise((_,r) => setTimeout(r, 6000))
        ]);
      } catch {}
    }
  }

  // Couleur sombre du panel gauche paysage
  const panelDark = cssMap['navy-dark'] || cssMap['ink'] || COL.primary;

  // Données partagées
  const nomComplet  = ((c.prenom||'')+' '+(c.nom||'')).trim().toUpperCase();
  const contactRows = [];
  if (c.email)      contactRows.push({ic:'✉', val: c.email});
  if (c.telephone)  contactRows.push({ic:'✆', val: c.telephone});
  contactRows.push({ic:'⊕', val: siteWeb});
  if (localisation) contactRows.push({ic:'⌖', val: localisation});

  // ── Fonction : dessiner avatar (photo ou initiales) ──
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
      const initCol = dark ? '#ffffff' : (luminance(COL.primary) < 160 ? '#ffffff' : COL.text);
      ctx.fillStyle = initCol;
      ctx.font = `bold ${Math.round(ar*0.58)}px ${tplFont}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initiales, ax, ay); ctx.textBaseline = 'alphabetic';
    }
  }

  // ══════════════════════════════════════════
  // CARTE PORTRAIT (420 × 680)
  // ══════════════════════════════════════════
  const PW = 420, PH = 680;
  const cp = _makeCanvas(PW, PH, SC);
  const p  = cp.ctx;

  p.fillStyle = COL.bg; p.fillRect(0, 0, PW, PH);

  // Cercles déco
  p.save(); p.globalAlpha = 0.07;
  p.fillStyle = COL.accent; _cercle(p, -50, PH*0.18, 200); p.fill();
  p.fillStyle = COL.primary; _cercle(p, PW+50, PH*0.80, 190); p.fill();
  p.restore();

  // Bande top
  p.fillStyle = COL.primary; p.fillRect(0, 0, PW, 7);
  p.strokeStyle = withAlpha(COL.primary, 0.15); p.lineWidth = 1;
  p.beginPath(); p.moveTo(PW*0.08, 26); p.lineTo(PW*0.92, 26); p.stroke();

  // Avatar
  const lx = PW/2, ly = 118, lr = 54;
  drawAvatar(p, lx, ly, lr, false);

  // Nom
  p.fillStyle = onBg; p.font = `bold 20px ${tplFont}`; p.textAlign = 'center';
  p.fillText(_truncate(p, nomComplet, PW-60), PW/2, ly+lr+36);

  // Profession
  p.fillStyle = COL.accent; p.font = `12.5px ${tplFont}`;
  p.fillText(_truncate(p, c.profession||'', PW-90), PW/2, ly+lr+55);

  // Séparateur
  p.strokeStyle = withAlpha(COL.primary, 0.14); p.lineWidth = 1;
  p.beginPath(); p.moveTo(PW*0.18, ly+lr+70); p.lineTo(PW*0.82, ly+lr+70); p.stroke();

  // Description
  let pY = ly+lr+90;
  p.font = `11px ${tplFont}`; p.fillStyle = onBgMuted; p.textAlign = 'center';
  _wrapText(p, desc, PW-80, 3).forEach(line => { p.fillText(line, PW/2, pY); pY += 17; });

  // Pills
  if (specs.length > 0) {
    pY += 16;
    const pH2 = 24, pR = 12, pG = 8;
    p.font = `bold 9.5px ${tplFont}`;
    const pMaxW = Math.floor((PW-44 - pG*(specs.length-1)) / specs.length);
    let sx = 22;
    specs.forEach(spec => {
      const lbl = _truncate(p, spec, pMaxW-18);
      p.fillStyle = pillBg; _rrPath(p, sx, pY, pMaxW, pH2, pR); p.fill();
      p.strokeStyle = pillStroke; p.lineWidth = 1; _rrPath(p, sx, pY, pMaxW, pH2, pR); p.stroke();
      p.fillStyle = pillText; p.textAlign = 'center';
      p.fillText(lbl, sx+pMaxW/2, pY+pH2/2+4);
      sx += pMaxW+pG;
    });
    pY += pH2;
  }

  // Séparateur contact
  pY += 18;
  p.strokeStyle = withAlpha(COL.primary, 0.18); p.lineWidth = 1;
  p.beginPath(); p.moveTo(PW*0.08, pY); p.lineTo(PW*0.92, pY); p.stroke();
  pY += 16;

  // Rows contact
  const vrH = 40, vrG = 7;
  contactRows.forEach(({ic, val}) => {
    p.fillStyle = rowBg; _rrPath(p, PW*0.07, pY, PW*0.86, vrH, 10); p.fill();
    p.strokeStyle = rowStroke; p.lineWidth = 0.8; _rrPath(p, PW*0.07, pY, PW*0.86, vrH, 10); p.stroke();
    p.fillStyle = COL.accent; p.font = `bold 13px ${tplFont}`; p.textAlign = 'left';
    p.fillText(ic, PW*0.12, pY+vrH/2+5);
    p.fillStyle = onBg; p.font = `11.5px ${tplFont}`;
    p.fillText(_truncate(p, val, PW*0.58), PW*0.20, pY+vrH/2+5);
    pY += vrH+vrG;
  });

  // Footer portrait
  pY += 12;
  p.strokeStyle = withAlpha(COL.primary, 0.13); p.lineWidth = 1;
  p.beginPath(); p.moveTo(PW*0.1, pY); p.lineTo(PW*0.9, pY); p.stroke();
  pY += 16;
  p.fillStyle = onBgMuted; p.font = `9px ${tplFont}`; p.textAlign = 'center';
  p.fillText('Généré par PortfolioHub · DS Services', PW/2, pY);
  pY += 14;
  p.fillStyle = withAlpha(COL.accent, 0.65); p.font = `bold 8px ${tplFont}`;
  p.fillText('sotchedji.store', PW/2, pY);

  // Bordure fine carte portrait
  p.strokeStyle = withAlpha(COL.primary, 0.12); p.lineWidth = 2;
  _rrPath(p, 1, 1, PW-2, PH-2, 22); p.stroke();

  // ══════════════════════════════════════════
  // CARTE PAYSAGE (700 × 420)
  // ══════════════════════════════════════════
  const LW = 700, LH = 420, LP = 258; // LP = largeur panel gauche
  const cl = _makeCanvas(LW, LH, SC);
  const lv = cl.ctx;

  // Fond global = bg template
  lv.fillStyle = COL.bg; lv.fillRect(0, 0, LW, LH);

  // ── Panel gauche sombre ──
  const panGrd = lv.createLinearGradient(0, 0, 0, LH);
  panGrd.addColorStop(0, panelDark); panGrd.addColorStop(1, COL.primary);
  lv.fillStyle = panGrd; lv.fillRect(0, 0, LP, LH);

  // Déco cercle discret panel gauche bas-droite
  lv.save(); lv.globalAlpha = 0.10; lv.fillStyle = COL.accent;
  _cercle(lv, LP*0.85, LH*0.85, 90); lv.fill(); lv.restore();

  // Liseré accent droit du panel gauche
  lv.fillStyle = COL.accent; lv.fillRect(LP-4, 0, 4, LH);

  // Avatar dans panel gauche
  const lax = LP/2, lay = LH/2 - 26, lar = 52;
  drawAvatar(lv, lax, lay, lar, true);

  // Nom (blanc dans panel gauche)
  lv.fillStyle = '#ffffff'; lv.font = `bold 14.5px ${tplFont}`; lv.textAlign = 'center';
  lv.fillText(_truncate(lv, nomComplet, LP-22), lax, lay+lar+26);

  // Profession — toujours lisible sur fond sombre
  const profColLv = luminance(COL.accent) > 90 ? withAlpha(COL.accent, 0.95) : 'rgba(255,255,255,0.80)';
  lv.fillStyle = profColLv; lv.font = `10px ${tplFont}`;
  lv.fillText(_truncate(lv, c.profession||'', LP-24), lax, lay+lar+43);

  // Séparateur panel gauche
  lv.strokeStyle = 'rgba(255,255,255,0.14)'; lv.lineWidth = 0.8;
  lv.beginPath(); lv.moveTo(LP*0.12, lay+lar+58); lv.lineTo(LP*0.88, lay+lar+58); lv.stroke();

  // Pills dans panel gauche (vertical)
  if (specs.length > 0) {
    let py2 = lay+lar+74;
    lv.font = `8px ${tplFont}`;
    specs.forEach(spec => {
      const lbl = _truncate(lv, spec, LP-36);
      const tw = lv.measureText(lbl).width;
      const px2 = lax - tw/2 - 9, pw2 = tw+18, ph2 = 17;
      lv.fillStyle = 'rgba(255,255,255,0.1)'; _rrPath(lv, px2, py2, pw2, ph2, 8); lv.fill();
      lv.strokeStyle = 'rgba(255,255,255,0.22)'; lv.lineWidth = 0.7;
      _rrPath(lv, px2, py2, pw2, ph2, 8); lv.stroke();
      lv.fillStyle = 'rgba(255,255,255,0.85)'; lv.textAlign = 'center';
      lv.fillText(lbl, lax, py2+ph2/2+3.5);
      py2 += ph2+5;
    });
  }

  // Footer panel gauche
  lv.fillStyle = 'rgba(255,255,255,0.28)'; lv.font = `7px ${tplFont}`; lv.textAlign = 'center';
  lv.fillText('PortfolioHub · DS Services', lax, LH-14);

  // ── Panel droit ──
  const RX = LP+22, RW = LW-LP-34;

  let ry = 24;

  // Nom + profession en haut du panneau droit
  lv.font = `bold 17px ${tplFont}`; lv.fillStyle = onBg; lv.textAlign = 'left';
  lv.fillText(_truncate(lv, nomComplet, RW), RX, ry); ry += 20;
  const profColR = luminance(COL.accent) > 80 ? COL.accent : COL.primary;
  lv.font = `italic 10.5px ${tplFont}`; lv.fillStyle = profColR;
  lv.fillText(_truncate(lv, c.profession||'', RW), RX, ry); ry += 14;

  // Séparateur
  lv.strokeStyle = withAlpha(COL.primary, 0.18); lv.lineWidth = 0.8;
  lv.beginPath(); lv.moveTo(RX, ry); lv.lineTo(RX+RW, ry); lv.stroke(); ry += 13;

  // À PROPOS
  lv.font = `bold 7px ${tplFont}`; lv.fillStyle = withAlpha(COL.muted, 0.65); lv.textAlign = 'left';
  lv.fillText('À PROPOS', RX, ry); ry += 12;
  lv.font = `10px ${tplFont}`; lv.fillStyle = onBgMuted; lv.textAlign = 'left';
  _wrapText(lv, desc, RW, 2).forEach(line => { lv.fillText(line, RX, ry); ry += 14; });

  // Séparateur
  ry += 5;
  lv.strokeStyle = withAlpha(COL.primary, 0.14); lv.lineWidth = 0.8;
  lv.beginPath(); lv.moveTo(RX, ry); lv.lineTo(RX+RW, ry); lv.stroke(); ry += 12;

  // Label coordonnées
  lv.font = `bold 7px ${tplFont}`; lv.fillStyle = withAlpha(COL.muted, 0.65); lv.textAlign = 'left';
  lv.fillText('COORDONNÉES', RX, ry); ry += 12;

  // Calcul hauteur dispo pour les rows (footer = 28px en bas)
  const rFootH = 28;
  const rAvail = LH - ry - rFootH;
  const rRows  = contactRows.length;
  const rH = Math.min(36, Math.max(28, Math.floor((rAvail - (rRows-1)*5) / rRows)));
  const rG = Math.min(6, Math.floor((rAvail - rRows*rH) / Math.max(1, rRows-1)));

  contactRows.forEach(({ic, val}) => {
    lv.fillStyle = rowBg; _rrPath(lv, RX, ry, RW, rH, 8); lv.fill();
    lv.strokeStyle = rowStroke; lv.lineWidth = 0.7; _rrPath(lv, RX, ry, RW, rH, 8); lv.stroke();
    lv.fillStyle = COL.accent; lv.font = `bold 12px ${tplFont}`; lv.textAlign = 'left';
    lv.fillText(ic, RX+10, ry+rH/2+4.5);
    lv.fillStyle = onBg; lv.font = `10px ${tplFont}`;
    lv.fillText(_truncate(lv, val, RW-46), RX+30, ry+rH/2+4.5);
    ry += rH+rG;
  });

  // Footer paysage (droit) — collé au bas
  lv.strokeStyle = withAlpha(COL.primary, 0.12); lv.lineWidth = 0.8;
  lv.beginPath(); lv.moveTo(RX, LH-rFootH+4); lv.lineTo(RX+RW, LH-rFootH+4); lv.stroke();
  lv.fillStyle = withAlpha(COL.accent, 0.6); lv.font = `bold 8px ${tplFont}`; lv.textAlign = 'center';
  lv.fillText('sotchedji.store', RX+RW/2, LH-10);

  // Bordure fine carte paysage
  lv.strokeStyle = withAlpha(COL.primary, 0.12); lv.lineWidth = 2;
  _rrPath(lv, 1, 1, LW-2, LH-2, 22); lv.stroke();

  // ── Téléchargement des 2 cartes ──
  _dlCanvas(cp.canvas, `carte_portrait_${c.prenom}_${c.nom}`);
  setTimeout(() => _dlCanvas(cl.canvas, `carte_paysage_${c.prenom}_${c.nom}`), 400);
  toast(`2 cartes de ${c.prenom} téléchargées (portrait + paysage) !`, 'success', '🪪');
}
