// ══════════════════════════════════════════════════════════
// ── CLIENTS ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

let selectedClientId = null;
let ongletActif = 0;
let _photoBase64 = null; // base64 de la photo sélectionnée

async function chargerClients() {
  setTableMessage('tableClients', '⏳', 'Chargement...');
  setTableMessage('tableClients2', '⏳', 'Chargement...');
  const clients = await api('getClients');
  if (clients && clients.error) {
    const msg = 'Erreur Clients : ' + clients.error;
    allClients = [];
    setText('statTotal', '!'); setText('statOnline', '!');
    setText('statPending', '!'); setText('clientCount', '');
    setTableMessage('tableClients', '❌', msg);
    setTableMessage('tableClients2', '❌', msg);
    toast(msg, 'error');
    return;
  }
  allClients = normaliserListe(clients);
  setText('statTotal', allClients.length);
  setText('statOnline', allClients.filter(c=>c.statut==='en_ligne').length);
  setText('statPending', allClients.filter(c=>c.statut==='en_attente'||c.statut==='brouillon').length);
  setText('clientCount', allClients.length ? '('+allClients.length+')' : '');
  renderTable('tableClients');
  renderTable('tableClients2');
}

function renderTable(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  // Mettre à jour le compteur badge
  const badge = document.getElementById('clientsCountBadge');
  if (badge) badge.textContent = allClients.length;

  if (!allClients.length) {
    setTableMessage(tbodyId, '👥', 'Aucun client encore.');
    return;
  }

  tbody.innerHTML = allClients.map(c => {
    const tpl      = allTemplates.find(t => String(t.id) === String(c.template_id));
    const ghUser   = 'sdgpro25-lab';
    const ghUrl    = `https://github.com/${ghUser}/${c.repo_github}`;
    const pubUrl   = `https://${c.sous_domaine}`;
    const initiales = ((c.prenom||'?')[0]+(c.nom||'?')[0]).toUpperCase();
    const isOnline  = c.statut === 'en_ligne';

    // Avatar class
    const avClass = isOnline ? 'cl-av online' : 'cl-av';

    // Template chip class
    const tplNom  = tpl ? tpl.nom : '—';
    const tplCls  = tplNom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'');
    const tplChipCls = ['classique','moderne','elegant'].includes(tplCls) ? tplCls : 'default';

    // Liens — on n'affiche que le sous-domaine public, jamais le repo GitHub
    const liens = isOnline
      ? `<div class="cl-links"><a class="lien-pub2" href="${pubUrl}" target="_blank" rel="noopener">🔗 ${c.sous_domaine}</a></div>`
      : `<div class="cl-links"><span class="lien-waiting">⏳ ${c.sous_domaine||'—'}</span></div>`;

    // Status pill
    const isBrouillon = c.statut === 'brouillon';
    const statusPill = isOnline
      ? `<span class="status-pill online"><span class="status-dot"></span>En ligne</span>`
      : isBrouillon
        ? `<span class="status-pill brouillon"><span class="status-dot"></span>Brouillon</span>`
        : `<span class="status-pill pending"><span class="status-dot"></span>En attente</span>`;

    // Dates
    const dateInscr = c.date_creation
      ? `<div class="cl-date-item">📅 <span>${c.date_creation}</span></div>` : '';
    let dateBadgeHtml = '';
    if (c.date_fin_abonnement) {
      const jours = Math.ceil((new Date(c.date_fin_abonnement) - new Date()) / 86400000);
      const cls   = jours < 0 ? 'expired' : jours <= 30 ? 'warn' : 'ok';
      const label = jours < 0
        ? `Expiré (${c.date_fin_abonnement})`
        : jours <= 30
          ? `⚠ ${jours}j restants`
          : `✓ ${c.date_fin_abonnement}`;
      dateBadgeHtml = `<div class="cl-date-item"><span class="date-chip ${cls}">${label}</span></div>`;
    }

    // Action buttons
    const deployBtn = !isOnline && !isBrouillon
      ? `<button class="btn-deploy" onclick="deployer('${c.id}',this)">🚀 Déployer</button>` : '';
    const majBtn = isOnline
      ? `<button class="btn-maj" onclick="mettreAJour('${c.id}',this)" title="Mettre à jour le portfolio">↻ Màj</button>` : '';

    return `<tr>
      <td>
        <div class="cl-identity">
          <div class="${avClass}">${initiales}</div>
          <div>
            <div class="cl-name">${c.prenom} ${c.nom}</div>
            <div class="cl-email">${c.email||'—'}</div>
          </div>
        </div>
      </td>
      <td><span class="cl-job">${c.profession||'—'}</span></td>
      <td><span class="tpl-chip ${tplChipCls}">${tplNom}</span></td>
      <td>${liens}</td>
      <td>
        <div class="cl-status-wrap">
          ${statusPill}
          <div class="cl-date-row">${dateInscr}${dateBadgeHtml}</div>
        </div>
      </td>
      <td>
        <div class="cl-actions-wrap">
          <div class="cl-act-primary">
            ${deployBtn}${majBtn}
          </div>
          <div class="cl-act-secondary">
            <button class="btn-act design"  onclick="ouvrirModalTemplate('${c.id}')">🎨 Design</button>
            <button class="btn-act edit"    onclick="editerClient('${c.id}')">✏️ Modifier</button>
            <button class="btn-act carte"   onclick="exporterCarteClient('${c.id}')">🪪 Carte</button>
            <button class="btn-act statut"  onclick="voirStatutDeploiement('${c.id}')">📡 Statut</button>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Éditer un client existant ──
function editerClient(id) {
  const c = allClients.find(cl => cl.id === id);
  if (!c) { toast('Client introuvable', 'error'); return; }
  // Remplir le formulaire avec les données du client
  remplirFormulaire({
    prenom:      c.prenom,
    nom:         c.nom,
    email:       c.email,
    telephone:   c.telephone,
    profession:  c.profession,
    photo_url:   c.photo_url,
    sous_domaine: c.sous_domaine,
    domaine:     (c.sous_domaine||'').split('.').slice(1).join('.') || 'sotchedji.store',
    abonnement:  c.type_abonnement,
    template_id: c.template_id,
    duree_mois:  '12',
    statut:      c.statut,
    profil:      c.profil || {}
  });
  // Mettre l'ID dans le champ caché
  const fidEl = document.getElementById('f_id');
  if (fidEl) fidEl.value = id;
  // Changer le titre du formulaire
  const titleEl = document.getElementById('formCardTitle');
  if (titleEl) titleEl.textContent = '✏️ Modifier — ' + c.prenom + ' ' + c.nom;
  const btnEl = document.getElementById('btnEnregistrer');
  if (btnEl) btnEl.textContent = '💾 Sauvegarder les modifications';
  const btnB = document.getElementById('btnBrouillon');
  if (btnB) btnB.style.display = 'inline-flex';
  // Afficher la vue formulaire
  afficherVue('form'); changerOnglet(0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Formulaire chargé — modifie puis clique Sauvegarder', 'info', '✏️');
}

// ── Remplir le formulaire ──
function remplirFormulaire(d) {
  function sv(id, val) { const el=document.getElementById(id); if(el && val!==undefined) el.value = val||''; }
  function sc(id, val) { const el=document.getElementById(id); if(el) el.checked = (val !== false); }

  // Onglet 0 — Identité
  sv('f_prenom',     d.prenom);
  sv('f_nom',        d.nom);
  sv('f_email',      d.email);
  sv('f_tel',        d.telephone);
  sv('f_profession', d.profession);
  _photoBase64 = null;
  if (d.photo_url) {
    _setPhotoPreview(d.photo_url);
    document.getElementById('photoNameTag').classList.remove('show');
    document.getElementById('f_photo').value = d.photo_url;
    document.getElementById('f_photo').style.display = 'none';
    document.getElementById('photoSavedTag').style.display = 'flex';
  } else { clearPhoto(); }
  sv('f_domaine',    d.domaine);
  sv('f_abonnement', d.abonnement);

  const p = d.profil || {};

  // Onglet 1 — Hero
  const h = p.hero || {};
  sv('h_eyebrow',    h.eyebrow);
  sv('h_sous_titre', h.sous_titre);
  sv('h_lead',       h.lead);
  const stats = h.stats || [];
  sv('s1_val', (stats[0]||{}).valeur); sv('s1_desc', (stats[0]||{}).desc);
  sv('s2_val', (stats[1]||{}).valeur); sv('s2_desc', (stats[1]||{}).desc);
  sv('s3_val', (stats[2]||{}).valeur); sv('s3_desc', (stats[2]||{}).desc);

  // Onglet 2 — À propos
  const ap = p.apropos || {};
  sv('ap_titre', ap.titre); sv('ap_intro', ap.intro);
  sv('ap_p1', ap.para1);   sv('ap_p2', ap.para2); sv('ap_p3', ap.para3);
  const apts = ap.apports || [];
  sv('ap1t',(apts[0]||{}).titre); sv('ap1d',(apts[0]||{}).desc);
  sv('ap2t',(apts[1]||{}).titre); sv('ap2d',(apts[1]||{}).desc);
  sv('ap3t',(apts[2]||{}).titre); sv('ap3d',(apts[2]||{}).desc);
  const vals = ap.values || [];
  sv('v1t',(vals[0]||{}).titre); sv('v1d',(vals[0]||{}).desc);
  sv('v2t',(vals[1]||{}).titre); sv('v2d',(vals[1]||{}).desc);
  sv('v3t',(vals[2]||{}).titre); sv('v3d',(vals[2]||{}).desc);

  // Onglet 3 — Compétences
  const listC = document.getElementById('listeCompetences');
  listC.innerHTML = '';
  (p.competences || []).forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'dyn-item comp-item';
    div.innerHTML = `
      <div class="dyn-item-head"><span class="dyn-item-num">Compétence ${i+1}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
      <div class="form-grid">
        <div class="form-group"><label>Sigle</label><input class="ni comp-sigle" value="${esc(c.sigle||'')}" placeholder="WEB · IA"></div>
        <div class="form-group"><label>Titre *</label><input class="ni comp-titre" value="${esc(c.titre||'')}" placeholder="Développement web"></div>
        <div class="form-group full"><label>Description</label><textarea class="ni comp-desc" style="min-height:64px" placeholder="Description courte...">${esc(c.description||'')}</textarea></div>
        <div class="form-group full"><label>Tags</label><input class="ni comp-tags" value="${esc((c.tags||[]).join(', '))}" placeholder="Django, Python..."></div>
      </div>`;
    listC.appendChild(div);
  });

  // Onglet 4 — Expériences
  const listE = document.getElementById('listeExperiences');
  listE.innerHTML = '';
  (p.experiences || []).forEach((e, i) => {
    const div = document.createElement('div');
    div.className = 'dyn-item exp-item';
    div.innerHTML = `
      <div class="dyn-item-head"><span class="dyn-item-num">Expérience ${i+1}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
      <div class="form-grid">
        <div class="form-group"><label>Période</label><input class="ni exp-periode" value="${esc(e.periode||'')}" placeholder="Jan 2022 - Déc 2024"></div>
        <div class="form-group"><label>Label / Chip</label><input class="ni exp-label" value="${esc(e.label||'')}" placeholder="DCH3 · IA"></div>
        <div class="form-group full"><label>Titre du poste *</label><input class="ni exp-titre" value="${esc(e.titre||'')}" placeholder="Coordonnateur des projets"></div>
        <div class="form-group full"><label>Description courte</label><input class="ni exp-desc" value="${esc(e.description||'')}" placeholder="Coordination de projets..."></div>
        <div class="form-group full"><label>Bullets (une par ligne)</label><textarea class="ni exp-bullets" style="min-height:120px" placeholder="Bullet 1&#10;Bullet 2">${esc((e.bullets||[]).join('\n'))}</textarea></div>
      </div>`;
    listE.appendChild(div);
  });

  // Onglet 5 — Projets
  const listP = document.getElementById('listeProjets');
  listP.innerHTML = '';
  (p.projets || []).forEach((pr, i) => {
    const div = document.createElement('div');
    div.className = 'dyn-item proj-item';
    div.innerHTML = `
      <div class="dyn-item-head"><span class="dyn-item-num">Projet ${i+1}${i===0?' (mis en avant)':''}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
      <div class="form-grid">
        <div class="form-group"><label>Sigle</label><input class="ni proj-sigle" value="${esc(pr.sigle||'')}" placeholder="GU · KG · AI"></div>
        <div class="form-group"><label>Type</label><input class="ni proj-type" value="${esc(pr.type||'')}" placeholder="Projet majeur · App web"></div>
        <div class="form-group full"><label>Titre *</label><input class="ni proj-titre" value="${esc(pr.titre||'')}" placeholder="Nom du projet"></div>
        <div class="form-group full"><label>Description</label><textarea class="ni proj-desc" style="min-height:64px" placeholder="Description...">${esc(pr.description||'')}</textarea></div>
        <div class="form-group full"><label>Impact / Résultat clé</label><input class="ni proj-impact" value="${esc(pr.impact||'')}" placeholder="Ex: 20+ communes accompagnées"></div>
        <div class="form-group"><label>Tags</label><input class="ni proj-tags" value="${esc((pr.tags||[]).join(', '))}" placeholder="Django, Python..."></div>
        <div class="form-group"><label>Lien</label><input class="ni proj-lien" value="${esc(pr.lien||'')}" placeholder="https://..."></div>
      </div>`;
    listP.appendChild(div);
  });

  // Onglet 6 — Formations + Certifications + Langues + Intérêts
  const listFm = document.getElementById('listeFormations');
  if (listFm) {
    listFm.innerHTML = '';
    (p.formations || []).forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'dyn-item form-item';
      div.innerHTML = `
        <div class="dyn-item-head"><span class="dyn-item-num">Formation ${i+1}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
        <div class="form-grid">
          <div class="form-group"><label>Année</label><input class="ni form-annee" value="${esc(f.annee||'')}" placeholder="2022"></div>
          <div class="form-group"><label>Diplôme / Titre *</label><input class="ni form-titre" value="${esc(f.titre||'')}" placeholder="Licence en Informatique"></div>
          <div class="form-group"><label>École / Université</label><input class="ni form-inst" value="${esc(f.institution||'')}" placeholder="Université d'Abomey-Calavi"></div>
          <div class="form-group"><label>Lieu</label><input class="ni form-lieu" value="${esc(f.lieu||'')}" placeholder="Cotonou, Bénin"></div>
        </div>`;
      listFm.appendChild(div);
    });
  }

  const listCf = document.getElementById('listeCertifs');
  listCf.innerHTML = '';
  (p.certifications || []).forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'dyn-item certif-item';
    div.innerHTML = `
      <div class="dyn-item-head"><span class="dyn-item-num">Certification ${i+1}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
      <div class="form-grid">
        <div class="form-group"><label>Titre *</label><input class="ni certif-titre" value="${esc(c.titre||'')}" placeholder="Marketing numérique"></div>
        <div class="form-group"><label>Institution</label><input class="ni certif-inst" value="${esc(c.institution||'')}" placeholder="Google, Coursera..."></div>
      </div>`;
    listCf.appendChild(div);
  });
  sv('f_langues',  (p.langues  || []).join(', '));
  sv('f_interets', (p.interets || []).join(', '));

  // Onglet 7 — Contact
  const ct = p.contact || {};
  sv('ct_titre', ct.titre);
  sv('ct_desc',  ct.description);
  sv('ct_loc',   ct.localisation);
  sv('ct_wa',    ct.whatsapp);

  // Onglet 8 — Publication + Visibilité
  if (d.template_id)  sv('f_template',   d.template_id);
  if (d.duree_mois)   sv('f_duree',      String(d.duree_mois));
  // Sous-domaine slug — verrouillé si déjà en ligne
  if (d.sous_domaine) { sv('f_slug', d.sous_domaine.split('.')[0]); checkSlugDispo(); }
  const isLive = d.statut === 'en_ligne';
  const slugEl = document.getElementById('f_slug');
  if (slugEl) { slugEl.disabled = isLive; slugEl.style.opacity = isLive ? '.5' : '1'; slugEl.style.cursor = isLive ? 'not-allowed' : ''; }
  document.getElementById('slugLockMsg').style.display = isLive ? 'block' : 'none';
  document.getElementById('slugHint').style.display    = isLive ? 'none'  : 'block';
  document.getElementById('slugStatus').style.display  = isLive ? 'none'  : '';
  const vis = p.visibilite || {};
  sc('vis_telephone',     vis.telephone);
  sc('vis_email',         vis.email);
  sc('vis_whatsapp',      vis.whatsapp);
  sc('vis_localisation',  vis.localisation);
  sc('vis_eyebrow',       vis.eyebrow);
  sc('vis_stats',         vis.stats);
  sc('vis_proof_tel',     vis.proof_tel);
  sc('vis_proof_email',   vis.proof_email);
  sc('vis_proof_loc',     vis.proof_loc);
  sc('vis_competences',   vis.competences);
  sc('vis_experiences',   vis.experiences);
  sc('vis_projets',       vis.projets);
  sc('vis_formations',    vis.formations);
  sc('vis_certifications',vis.certifications);
  sc('vis_langues',       vis.langues);
  sc('vis_interets',      vis.interets);
  sc('vis_photo_carte',   vis.photo_carte);
}

// Helper HTML escape pour remplirFormulaire
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Lire le formulaire ──
function lireFormulaire() {
  const competences = [...document.querySelectorAll('.comp-item')].map(el => ({
    sigle: el.querySelector('.comp-sigle').value.trim(),
    titre: el.querySelector('.comp-titre').value.trim(),
    description: el.querySelector('.comp-desc').value.trim(),
    tags: el.querySelector('.comp-tags').value.split(',').map(t=>t.trim()).filter(Boolean)
  })).filter(c => c.titre);

  const experiences = [...document.querySelectorAll('.exp-item')].map(el => ({
    periode: el.querySelector('.exp-periode').value.trim(),
    label:   el.querySelector('.exp-label').value.trim(),
    titre:   el.querySelector('.exp-titre').value.trim(),
    description: el.querySelector('.exp-desc').value.trim(),
    bullets: el.querySelector('.exp-bullets').value.split('\n').map(b=>b.trim()).filter(Boolean)
  })).filter(e => e.titre);

  const projets = [...document.querySelectorAll('.proj-item')].map(el => ({
    sigle: el.querySelector('.proj-sigle').value.trim(),
    type:  el.querySelector('.proj-type').value.trim(),
    titre: el.querySelector('.proj-titre').value.trim(),
    description: el.querySelector('.proj-desc').value.trim(),
    impact: el.querySelector('.proj-impact').value.trim(),
    tags:  el.querySelector('.proj-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    lien:  el.querySelector('.proj-lien').value.trim()
  })).filter(p => p.titre);

  const formations = [...document.querySelectorAll('.form-item')].map(el => ({
    annee:       el.querySelector('.form-annee').value.trim(),
    titre:       el.querySelector('.form-titre').value.trim(),
    institution: el.querySelector('.form-inst').value.trim(),
    lieu:        el.querySelector('.form-lieu').value.trim()
  })).filter(f => f.titre);

  const certifications = [...document.querySelectorAll('.certif-item')].map(el => ({
    titre: el.querySelector('.certif-titre').value.trim(),
    institution: el.querySelector('.certif-inst').value.trim()
  })).filter(c => c.titre);

  return {
    id:           g('f_id') || undefined,
    prenom:       g('f_prenom'), nom: g('f_nom'), email: g('f_email'),
    telephone:    g('f_tel'), profession: g('f_profession'), photo_url: g('f_photo'),
    photo_base64: _photoBase64 || undefined,
    sous_domaine_slug: g('f_slug') || undefined,
    template_id: g('f_template'), domaine: g('f_domaine'), abonnement: g('f_abonnement'), duree_mois: g('f_duree') || '12',
    profil: {
      hero: {
        eyebrow:   g('h_eyebrow'),
        sous_titre: g('h_sous_titre'),
        lead:      g('h_lead'),
        stats: [
          { valeur: g('s1_val'), desc: g('s1_desc') },
          { valeur: g('s2_val'), desc: g('s2_desc') },
          { valeur: g('s3_val'), desc: g('s3_desc') }
        ].filter(s => s.valeur)
      },
      apropos: {
        titre: g('ap_titre'), intro: g('ap_intro'),
        para1: g('ap_p1'),  para2: g('ap_p2'), para3: g('ap_p3'),
        apports: [
          {titre:g('ap1t'),desc:g('ap1d')},{titre:g('ap2t'),desc:g('ap2d')},{titre:g('ap3t'),desc:g('ap3d')}
        ].filter(a=>a.titre),
        values: [
          {titre:g('v1t'),desc:g('v1d')},{titre:g('v2t'),desc:g('v2d')},{titre:g('v3t'),desc:g('v3d')}
        ].filter(v=>v.titre)
      },
      competences, experiences, projets, formations, certifications,
      langues:  g('f_langues').split(',').map(l=>l.trim()).filter(Boolean),
      interets: g('f_interets').split(',').map(i=>i.trim()).filter(Boolean),
      contact: {
        titre: g('ct_titre'), description: g('ct_desc'),
        localisation: g('ct_loc'), whatsapp: g('ct_wa')
      },
      visibilite: {
        telephone:      chk('vis_telephone'),
        email:          chk('vis_email'),
        whatsapp:       chk('vis_whatsapp'),
        localisation:   chk('vis_localisation'),
        eyebrow:        chk('vis_eyebrow'),
        stats:          chk('vis_stats'),
        proof_tel:      chk('vis_proof_tel'),
        proof_email:    chk('vis_proof_email'),
        proof_loc:      chk('vis_proof_loc'),
        competences:    chk('vis_competences'),
        experiences:    chk('vis_experiences'),
        projets:        chk('vis_projets'),
        formations:     chk('vis_formations'),
        certifications: chk('vis_certifications'),
        langues:        chk('vis_langues'),
        interets:       chk('vis_interets'),
        photo_carte:    chk('vis_photo_carte'),
      }
    }
  };
}
function g(id) { const el=document.getElementById(id); return el ? el.value.trim() : ''; }
function chk(id) { const el=document.getElementById(id); return el ? el.checked : true; }

function resetForm() {
  ['f_id','f_prenom','f_nom','f_email','f_tel','f_profession','f_photo','f_slug',
   'h_eyebrow','h_sous_titre','h_lead','s1_val','s1_desc','s2_val','s2_desc','s3_val','s3_desc',
   'ap_titre','ap_intro','ap_p1','ap_p2','ap_p3',
   'ap1t','ap1d','ap2t','ap2d','ap3t','ap3d','v1t','v1d','v2t','v2d','v3t','v3d',
   'ct_titre','ct_desc','ct_loc','ct_wa','f_langues','f_interets'
  ].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const fdur = document.getElementById('f_duree'); if(fdur) fdur.value='12';
  ['listeCompetences','listeExperiences','listeProjets','listeFormations','listeCertifs'].forEach(id => {
    const el = document.getElementById(id); if(el) el.innerHTML='';
  });
  _updatePortfolioLink('', 'sotchedji.store');
  // Remettre tous les toggles à ON
  document.querySelectorAll('[id^="vis_"]').forEach(el => el.checked = true);
  const slugSt = document.getElementById('slugStatus'); if(slugSt) slugSt.textContent = '';
  // Réinitialiser la photo
  clearPhoto();
  // Réinitialiser le titre du formulaire
  const titleEl = document.getElementById('formCardTitle');
  if (titleEl) titleEl.textContent = '👤 Identité du client';
  const btnEl = document.getElementById('btnEnregistrer');
  if (btnEl) btnEl.textContent = '✅ Enregistrer le client';
  const btnB = document.getElementById('btnBrouillon');
  if (btnB) btnB.style.display = 'none';
  changerOnglet(0);
}

// ── Enregistrer ──
async function enregistrerClient() {
  const data = lireFormulaire();
  if (!data.prenom || !data.nom || !data.profession) {
    toast('Remplis au moins le prénom, le nom et la profession (onglet Identité)', 'error'); return;
  }
  toast('Enregistrement...', 'info');
  const r = await api('sauvegarderClient', data);
  if (r && r.success) {
    const msg = data.id ? 'Client modifié !' : 'Client enregistré ! Sous-domaine : ' + (r.sousdomaine || '');
    toast(msg, 'success');
    resetForm(); chargerClients(); afficherVue('dashboard');
  } else {
    toast('Erreur : '+(r && r.error ? r.error : 'réponse vide'), 'error');
  }
}

// ── Déployer ──
async function deployer(id, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Déploiement...';
  toast('Déploiement en cours — 30 à 60 secondes...','info','⏳');
  const r = await api('deployerClient', { id });
  if (r && r.success) {
    toast('Déployé ! '+r.url,'success'); chargerClients();
  } else {
    toast('Erreur : '+(r && r.error ? r.error : 'réponse vide'),'error');
    btn.disabled=false; btn.innerHTML='🚀 Déployer';
  }
}

// ── Mettre à jour portfolio ──
async function mettreAJour(id, btn) {
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  toast('Mise à jour en cours...','info');
  const r = await api('mettreAJourPortfolio', { id });
  toast(r && r.success ? 'Portfolio mis à jour !' : 'Erreur : '+(r && r.error ? r.error : '?'), r && r.success ? 'success' : 'error');
  chargerClients();
}

// ── Brouillon ──
async function mettreEnBrouillon() {
  const id = document.getElementById('f_id').value;
  if (!id) return;
  const data = lireFormulaire();
  data.statut = 'brouillon';
  toast('Mise en brouillon...', 'info', '📁');
  const r = await api('sauvegarderClient', data);
  if (r && r.success) {
    toast('Client sauvegardé en brouillon — non publié en ligne', 'success', '📁');
    resetForm(); chargerClients(); afficherVue('dashboard');
  } else {
    toast('Erreur : ' + (r && r.error ? r.error : '?'), 'error');
  }
}

// ── Export Excel client ──
function exporterClientExcel(clientId) {
  const c = allClients.find(x => x.id === clientId);
  if (!c) { toast('Client introuvable', 'error'); return; }
  chargerXLSX(() => {
    const data = {
      prenom: c.prenom, nom: c.nom, email: c.email,
      telephone: c.telephone, profession: c.profession,
      photo_url: c.photo_url, template_id: c.template_id,
      domaine: (c.sous_domaine||'').split('.').slice(1).join('.') || 'sotchedji.store',
      abonnement: c.type_abonnement || 'gratuit',
      profil: c.profil || {}
    };
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataToExcelRows(data));
    ws['!cols'] = [{wch:20},{wch:28},{wch:55},{wch:55}];
    XLSX.utils.book_append_sheet(wb, ws, 'Client');
    _xlsxDownload(wb, `${c.prenom}_${c.nom}_portfolio.xlsx`.replace(/\s+/g,'_').toLowerCase());
    toast(`Excel exporté pour ${c.prenom} ${c.nom}`, 'success', '📊');
  });
}

// ── Voir statut déploiement ──
async function voirStatutDeploiement(id) {
  const c = allClients.find(cl => cl.id === id);
  if (!c) return;
  // Afficher le modal
  const overlay = document.getElementById('modalStatut');
  overlay.classList.add('open');
  document.getElementById('statutLoading').style.display = 'block';
  document.getElementById('statutSteps').style.display = 'none';
  document.getElementById('statutLienPub').style.display = 'none';
  document.getElementById('statutClientInfo').innerHTML =
    `<strong>${c.prenom} ${c.nom}</strong> — <span style="color:var(--muted)">${c.sous_domaine || '—'}</span>`;

  const r = await api('getDeploymentStatus', { id });
  document.getElementById('statutLoading').style.display = 'none';

  if (!r || r.error) {
    document.getElementById('statutSteps').style.display = 'grid';
    document.getElementById('statutSteps').innerHTML =
      `<div class="step-row"><div class="step-icon error">✕</div><div class="step-info"><div class="step-label">Erreur API</div><div class="step-desc">${r ? r.error : 'Réponse vide'}</div></div></div>`;
    return;
  }

  const steps = [
    {
      label: 'Repo GitHub créé',
      ok: r.repo_exists,
      desc_ok:  `github.com/sdgpro25-lab/${c.repo_github}`,
      desc_no:  'Le repo n\'a pas encore été créé. Clique sur 🚀 Déployer.',
    },
    {
      label: 'GitHub Pages activé',
      ok: r.pages_enabled,
      desc_ok:  `Publié sur ${r.pages_url || 'GitHub Pages'}`,
      desc_no:  'Pages non activé. Le déploiement résoudra ça.',
    },
    {
      label: 'Domaine personnalisé (DNS)',
      ok: r.cname_set,
      desc_ok:  `CNAME → sdgpro25-lab.github.io`,
      desc_no:  'Domaine custom non configuré sur GitHub Pages.',
    },
    {
      label: 'Certificat SSL actif',
      ok: r.ssl_active,
      desc_ok:  `HTTPS activé sur ${c.sous_domaine}`,
      desc_no:  'SSL pas encore actif. Attend 30–60 min après le DNS.',
    },
  ];

  document.getElementById('statutSteps').style.display = 'grid';
  document.getElementById('statutSteps').innerHTML = steps.map(s => {
    const cls  = s.ok ? 'ok' : 'pending';
    const icon = s.ok ? '✓' : '⏳';
    const desc = s.ok ? s.desc_ok : s.desc_no;
    return `<div class="step-row">
      <div class="step-icon ${cls}">${icon}</div>
      <div class="step-info">
        <div class="step-label">${s.label}</div>
        <div class="step-desc">${desc}</div>
      </div>
    </div>`;
  }).join('');

  if (r.ssl_active && c.sous_domaine) {
    const lien = document.getElementById('statutLienPub');
    lien.href = 'https://' + c.sous_domaine;
    lien.style.display = 'flex';
  }
}

function fermerModalStatut() {
  document.getElementById('modalStatut').classList.remove('open');
}

// ── Slug ──
function _updatePortfolioLink(slug, domaine) {
  const wrap = document.getElementById('portfolioLinkWrap');
  const link = document.getElementById('portfolioLinkPreview');
  if (!wrap || !link) return;
  if (slug) {
    const url = 'https://' + slug + '.' + (domaine || 'sotchedji.store');
    link.href = url;
    link.textContent = url;
    wrap.style.display = 'flex';
  } else {
    wrap.style.display = 'none';
  }
}

function checkSlugDispo() {
  const input = document.getElementById('f_slug');
  const statusEl = document.getElementById('slugStatus');
  if (!input || !statusEl) return;
  const raw = input.value.trim();
  const slug = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9-]/g,'');
  const domaine = document.getElementById('f_domaine')?.value || 'sotchedji.store';
  _updatePortfolioLink(slug, domaine);
  if (!slug) { statusEl.innerHTML = ''; return; }
  const fullDomain = slug + '.' + domaine;
  const currentId  = document.getElementById('f_id').value;
  const taken = allClients.some(c => c.sous_domaine === fullDomain && String(c.id) !== String(currentId));
  statusEl.innerHTML = taken
    ? '<span style="color:#e53935;font-weight:700">❌ Déjà pris</span>'
    : '<span style="color:#2e7d32;font-weight:700">✅ Disponible</span>';
}

function autoFillSlug() {
  const slugInput = document.getElementById('f_slug');
  if (!slugInput || slugInput.value.trim()) return;
  const prenom = document.getElementById('f_prenom').value.trim();
  const slug = prenom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
  if (slug) { slugInput.value = slug; checkSlugDispo(); }
}

// ── Photo upload helpers ──
function syncPhotoUrl(url) {
  if (url) { _photoBase64 = null; _setPhotoPreview(url); document.getElementById('photoNameTag').classList.remove('show'); }
  else if (!_photoBase64) _setPhotoPreview(null);
}

function previewPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    _photoBase64 = e.target.result; // data:image/...;base64,...
    _setPhotoPreview(_photoBase64);
    document.getElementById('f_photo').value = '';
    document.getElementById('photoFileName').textContent = file.name;
    document.getElementById('photoNameTag').classList.add('show');
  };
  reader.readAsDataURL(file);
}

function _setPhotoPreview(src) {
  const img = document.getElementById('photoImgPreview');
  const ph  = document.getElementById('photoPlaceholder');
  if (src) { img.src = src; img.style.display = 'block'; ph.style.display = 'none'; }
  else     { img.src = ''; img.style.display = 'none';  ph.style.display = 'block'; }
}

function clearPhoto() {
  _photoBase64 = null;
  _setPhotoPreview(null);
  document.getElementById('f_photo_file').value = '';
  document.getElementById('f_photo').value = '';
  document.getElementById('f_photo').style.display = 'none';
  document.getElementById('photoNameTag').classList.remove('show');
  const tag = document.getElementById('photoSavedTag'); if(tag) tag.style.display = 'none';
}

function clearPhotoSaved() {
  document.getElementById('photoSavedTag').style.display = 'none';
  document.getElementById('f_photo').value = '';
  _photoBase64 = null;
  _setPhotoPreview(null);
}

// ── Listes dynamiques ──
function ajouterCompetence() {
  const list = document.getElementById('listeCompetences');
  const n = list.children.length + 1;
  const div = document.createElement('div');
  div.className = 'dyn-item comp-item';
  div.innerHTML = `
    <div class="dyn-item-head"><span class="dyn-item-num">Compétence ${n}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
    <div class="form-grid">
      <div class="form-group"><label>Sigle</label><input class="ni comp-sigle" placeholder="WEB · IA · NET"></div>
      <div class="form-group"><label>Titre *</label><input class="ni comp-titre" placeholder="Développement web"></div>
      <div class="form-group full"><label>Description</label><textarea class="ni comp-desc" style="min-height:64px" placeholder="Description courte..."></textarea></div>
      <div class="form-group full"><label>Tags (séparés par des virgules)</label><input class="ni comp-tags" placeholder="Django, Python, JavaScript, HTML/CSS"></div>
    </div>`;
  list.appendChild(div);
}

function ajouterExperience() {
  const list = document.getElementById('listeExperiences');
  const n = list.children.length + 1;
  const div = document.createElement('div');
  div.className = 'dyn-item exp-item';
  div.innerHTML = `
    <div class="dyn-item-head"><span class="dyn-item-num">Expérience ${n}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
    <div class="form-grid">
      <div class="form-group"><label>Période</label><input class="ni exp-periode" placeholder="Activités récentes · Jan 2022 - Déc 2024"></div>
      <div class="form-group"><label>Label / Chip</label><input class="ni exp-label" placeholder="DCH3 Consulting · IA · Solutions métier"></div>
      <div class="form-group full"><label>Titre du poste *</label><input class="ni exp-titre" placeholder="Coordonnateur des projets à DCH3 Consulting Group"></div>
      <div class="form-group full"><label>Description courte</label><input class="ni exp-desc" placeholder="Coordination de projets, développement de solutions..."></div>
      <div class="form-group full"><label>Bullets (une par ligne)</label><textarea class="ni exp-bullets" style="min-height:120px" placeholder="Développement de l'application King Guest House en Django&#10;Coordination du Guichet Unique dans 20+ communes&#10;..."></textarea></div>
    </div>`;
  list.appendChild(div);
}

function ajouterProjet() {
  const list = document.getElementById('listeProjets');
  const n = list.children.length + 1;
  const div = document.createElement('div');
  div.className = 'dyn-item proj-item';
  div.innerHTML = `
    <div class="dyn-item-head"><span class="dyn-item-num">Projet ${n}${n===1?' (mis en avant)':''}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
    <div class="form-grid">
      <div class="form-group"><label>Sigle</label><input class="ni proj-sigle" placeholder="GU · KG · AI"></div>
      <div class="form-group"><label>Type</label><input class="ni proj-type" placeholder="Projet majeur · Application web · IA"></div>
      <div class="form-group full"><label>Titre *</label><input class="ni proj-titre" placeholder="Nom du projet"></div>
      <div class="form-group full"><label>Description</label><textarea class="ni proj-desc" style="min-height:64px" placeholder="Description du projet..."></textarea></div>
      <div class="form-group full"><label>Impact / Résultat clé (optionnel)</label><input class="ni proj-impact" placeholder="Ex: Impact : 20+ communes du Bénin accompagnées"></div>
      <div class="form-group"><label>Tags</label><input class="ni proj-tags" placeholder="Django, Python, Gestion"></div>
      <div class="form-group"><label>Lien (optionnel)</label><input class="ni proj-lien" placeholder="https://..."></div>
    </div>`;
  list.appendChild(div);
}

function ajouterFormation() {
  const list = document.getElementById('listeFormations');
  const n = list.children.length + 1;
  const div = document.createElement('div');
  div.className = 'dyn-item form-item';
  div.innerHTML = `
    <div class="dyn-item-head"><span class="dyn-item-num">Formation ${n}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
    <div class="form-grid">
      <div class="form-group"><label>Année</label><input class="ni form-annee" placeholder="2022"></div>
      <div class="form-group"><label>Diplôme / Titre *</label><input class="ni form-titre" placeholder="Licence en Informatique"></div>
      <div class="form-group"><label>École / Université</label><input class="ni form-inst" placeholder="Université d'Abomey-Calavi"></div>
      <div class="form-group"><label>Lieu</label><input class="ni form-lieu" placeholder="Cotonou, Bénin"></div>
    </div>`;
  list.appendChild(div);
}

function ajouterCertif() {
  const list = document.getElementById('listeCertifs');
  const n = list.children.length + 1;
  const div = document.createElement('div');
  div.className = 'dyn-item certif-item';
  div.innerHTML = `
    <div class="dyn-item-head"><span class="dyn-item-num">Certification ${n}</span><button class="dyn-remove" onclick="this.closest('.dyn-item').remove()">✕</button></div>
    <div class="form-grid">
      <div class="form-group"><label>Titre *</label><input class="ni certif-titre" placeholder="Marketing numérique"></div>
      <div class="form-group"><label>Institution</label><input class="ni certif-inst" placeholder="Google, Coursera, AFD..."></div>
    </div>`;
  list.appendChild(div);
}
