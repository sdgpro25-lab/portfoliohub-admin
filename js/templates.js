// ══════════════════════════════════════════════════════════
// ── TEMPLATES ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

let selectedTemplateId = null;
const tplThumbs = ['tpl-t1','tpl-t2','tpl-t3'];

async function chargerTemplates() {
  const tpls = await api('getTemplates');
  if (tpls && tpls.error) {
    allTemplates = [];
    setText('statTemplates', '!');
    toast('Erreur Templates : ' + tpls.error, 'error');
    const sel = document.getElementById('f_template');
    if (sel) sel.innerHTML = '<option value="1">Classique (par défaut)</option>';
    return;
  }
  allTemplates = normaliserListe(tpls);
  const sel = document.getElementById('f_template');
  if (sel) {
    sel.innerHTML = allTemplates.length
      ? allTemplates.map(t => `<option value="${t.id}">${t.nom}${t.prix>0?' — '+Number(t.prix).toLocaleString('fr-FR')+' FCFA':' (Gratuit)'}</option>`).join('')
      : '<option value="1">Classique (par défaut)</option>';
  }
  setText('statTemplates', allTemplates.length);
  renderTable('tableClients');
  renderTable('tableClients2');
}

function renderTemplatesView() {
  const grid = document.getElementById('templatesGrid');
  if (!allTemplates.length) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);grid-column:1/-1">Aucun template. <button class="btn btn-primary btn-sm" onclick="ouvrirEditTemplate(null)">+ Créer le premier</button></div>`;
    return;
  }
  grid.innerHTML = allTemplates.map(t => {
    const swatches = extraireSwatchesCss(t.css_vars || '');
    const swatchHtml = swatches.slice(0,5).map(s =>
      `<div class="tpl-swatch" style="background:${s.value}" title="${s.name}"></div>`
    ).join('');
    const prixBadge = t.prix > 0
      ? `<span class="tpl-prix paid">${Number(t.prix).toLocaleString('fr-FR')} FCFA</span>`
      : `<span class="tpl-prix free">✓ Gratuit</span>`;
    const bgColors = swatches.length >= 2
      ? `background:linear-gradient(135deg,${swatches[0]?.value||'#2176ae'},${swatches[1]?.value||'#0d9e8e'})`
      : 'background:linear-gradient(135deg,#c8d8e8,#d8e8f0)';
    return `
      <div class="tpl-edit-card">
        <div class="tpl-preview-band" style="${bgColors}">${swatchHtml}</div>
        <div class="tpl-edit-body">
          <div class="tpl-edit-name">${t.nom}</div>
          <div class="tpl-edit-desc">${t.description||'—'}</div>
          <div style="margin-bottom:12px">${prixBadge}</div>
          <div class="tpl-edit-actions">
            <button class="btn btn-ghost btn-sm" onclick="ouvrirEditTemplate('${t.id}')">✏️ Modifier</button>
            <button class="btn btn-sm btn-primary" onclick="previewTemplateId('${t.id}')">👁 Prévisualiser</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Modal template (changement de design) ──
function ouvrirModalTemplate(id) {
  selectedClientId = id; selectedTemplateId = null;
  const client = allClients.find(c=>c.id===id);
  document.getElementById('tplChoix').innerHTML = allTemplates.map((t,i) => `
    <div class="tpl-card ${String(t.id)===String(client.template_id)?'selected':''}" onclick="selTpl(this,'${t.id}')">
      <div class="tpl-thumb ${tplThumbs[i%tplThumbs.length]}"></div>
      <div class="tpl-name">${t.nom}</div>
      <div class="tpl-desc">${t.description}</div>
      <span class="tpl-prix ${t.prix>0?'paid':'free'}">${t.prix>0?Number(t.prix).toLocaleString('fr-FR')+' FCFA':'✓ Gratuit'}</span>
    </div>`).join('');
  document.getElementById('modalTemplate').classList.add('open');
}
function selTpl(el,id) { document.querySelectorAll('.tpl-card').forEach(c=>c.classList.remove('selected')); el.classList.add('selected'); selectedTemplateId=id; }
async function appliquerTemplate() {
  if (!selectedTemplateId) { toast('Sélectionne un design','error'); return; }
  toast('Mise à jour du design...','info','🎨'); fermerModal();
  const r = await api('changerTemplate', { clientId: selectedClientId, templateId: selectedTemplateId });
  toast(r && r.success ? 'Design mis à jour !' : 'Erreur : '+(r && r.error ? r.error : '?'), r && r.success ? 'success' : 'error');
  chargerClients();
}
function fermerModal() { document.getElementById('modalTemplate').classList.remove('open'); }

// ── Onglets dans le modal d'édition template ──
let tplTabActif = 0;
function changerTplTab(n) {
  tplTabActif = n;
  document.querySelectorAll('#tplTabsWrap .tab-btn').forEach((b,i) => b.classList.toggle('active', i===n));
  document.querySelectorAll('#modalEditTemplate .tab-panel').forEach((p,i) => p.classList.toggle('active', i===n));
  if (n === 0) updateCSSPreview();
}

function ouvrirEditTemplate(id) {
  const t = id ? allTemplates.find(x => String(x.id)===String(id)) : null;
  document.getElementById('tplEditTitle').textContent = t ? '✏️ Modifier le template' : '✨ Nouveau template';
  document.getElementById('tpl_id').value    = t ? t.id  : '';
  document.getElementById('tpl_nom').value   = t ? t.nom : '';
  document.getElementById('tpl_desc').value  = t ? (t.description||'') : '';
  document.getElementById('tpl_prix').value  = t ? (t.prix||0) : 0;
  document.getElementById('tpl_css').value   = t ? (t.css_vars||'') : '';
  document.getElementById('previewContainer').style.display = 'none';
  document.getElementById('btnSupprimerTpl').style.display  = t ? 'inline-flex' : 'none';
  changerTplTab(0);
  updateCSSPreview();
  document.getElementById('modalEditTemplate').classList.add('open');
}
function fermerEditTemplate() {
  document.getElementById('modalEditTemplate').classList.remove('open');
}

async function sauvegarderTemplateEdit() {
  const nom = document.getElementById('tpl_nom').value.trim();
  if (!nom) { toast('Le nom du template est obligatoire', 'error'); return; }
  const data = {
    id:          document.getElementById('tpl_id').value || null,
    nom,
    description: document.getElementById('tpl_desc').value.trim(),
    prix:        parseFloat(document.getElementById('tpl_prix').value) || 0,
    css_vars:    document.getElementById('tpl_css').value
  };
  toast('Enregistrement...', 'info');
  const r = await api('sauvegarderTemplate', data);
  if (r && r.success) {
    toast('Template enregistré !', 'success', '🎨');
    fermerEditTemplate();
    await chargerTemplates();
    setTimeout(() => renderTemplatesView(), 400);
  } else toast('Erreur : ' + (r && r.error ? r.error : '?'), 'error');
}

async function supprimerTemplateEdit() {
  const id = document.getElementById('tpl_id').value;
  if (!id) return;
  if (!confirm('Supprimer ce template ? Les clients qui l\'utilisent ne seront pas affectés.')) return;
  const r = await api('supprimerTemplate', { id });
  if (r && r.success) {
    toast('Template supprimé', 'success');
    fermerEditTemplate();
    await chargerTemplates();
    setTimeout(renderTemplatesView, 400);
  } else toast('Erreur : ' + (r && r.error ? r.error : '?'), 'error');
}

// Génère les swatches dans le modal d'édition
function updateCSSPreview() {
  const css = document.getElementById('tpl_css').value;
  const swatches = extraireSwatchesCss(css);
  const containers = ['colorSwatches', 'colorSwatchesFull'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!swatches.length) {
      el.innerHTML = '<span style="color:var(--muted);font-size:.8rem;font-style:italic">Aucune couleur détectée</span>';
      return;
    }
    el.innerHTML = swatches.map(s => `
      <div class="color-swatch">
        <div class="color-swatch-dot" style="background:${s.value}" title="${s.name}: ${s.value}"></div>
        <div class="color-swatch-label">--${s.name}</div>
      </div>`).join('');
  });
}

// Charge un exemple CSS dans l'éditeur
function chargerCSSExemple(nom) {
  const mapping = { classique: '1', moderne: '2', elegant: '3' };
  const id  = mapping[nom];
  const tpl = allTemplates.find(t => String(t.id) === id);
  if (tpl && tpl.css_vars) {
    document.getElementById('tpl_css').value = tpl.css_vars;
    updateCSSPreview();
    toast('CSS "' + tpl.nom + '" chargé — modifie-le à ta guise', 'info', '🎨');
  } else toast('Template d\'exemple introuvable', 'error');
}

// Prévisualiser en plein écran (nouvel onglet)
async function previewTemplatePleinEcran() {
  const cssVars = document.getElementById('tpl_css').value;
  if (!cssVars.trim()) { toast('Saisis d\'abord des variables CSS dans l\'onglet 🎨', 'error'); return; }
  toast('Génération du portfolio exemple...', 'info', '🚀');
  const html = await api('previewTemplateHTML', { cssVars });
  if (typeof html !== 'string') { toast('Erreur : '+(html && html.error ? html.error : '?'), 'error'); return; }
  const blob = new Blob([html], {type:'text/html'});
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// Prévisualiser inline dans le modal
async function previewTemplateInline() {
  const cssVars = document.getElementById('tpl_css').value;
  if (!cssVars.trim()) { toast('Saisis d\'abord des variables CSS', 'error'); return; }
  toast('Chargement du portfolio exemple...', 'info');
  const html = await api('previewTemplateHTML', { cssVars });
  if (typeof html !== 'string') { toast('Erreur : '+(html && html.error ? html.error : '?'), 'error'); return; }
  const container = document.getElementById('previewContainer');
  const iframe    = document.getElementById('previewFrame');
  container.style.display = 'block';
  iframe.srcdoc = html;
  iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Prévisualiser un template existant depuis la grid
async function previewTemplateId(id) {
  const tpl = allTemplates.find(t => String(t.id) === String(id));
  if (!tpl) { toast('Template introuvable', 'error'); return; }
  toast('Génération du portfolio exemple...', 'info', '🚀');
  const html = await api('previewTemplateHTML', { cssVars: tpl.css_vars });
  if (typeof html !== 'string') { toast('Erreur : '+(html && html.error ? html.error : '?'), 'error'); return; }
  const blob = new Blob([html], {type:'text/html'});
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ── IMPORT MODAL ──────────────────────────────────────────────
function ouvrirImport() {
  document.getElementById('modalImport').classList.add('open');
  switchImportTab(0);
}
function fermerImport() {
  document.getElementById('modalImport').classList.remove('open');
  document.getElementById('jsonImport').value = '';
  document.getElementById('importStatus').textContent = '';
  document.getElementById('tplPreview').value = '';
  document.getElementById('excelImportStatus').textContent = '';
  document.getElementById('fileChosen').classList.remove('show');
  document.getElementById('excelFile').value = '';
}
function switchImportTab(n) {
  document.querySelectorAll('.import-panel').forEach((p,i) => p.classList.toggle('active', i===n));
  document.querySelectorAll('.import-tab').forEach((b,i)  => b.classList.toggle('active', i===n));
}

// Template JSON complet avec valeurs d'exemple
function getTemplateJSON() {
  return {
    _NOTICE: {
      "🔒 id":           "AUTO — identifiant unique généré automatiquement, ne pas remplir",
      "🔒 sous_domaine": "AUTO — généré d'après le prénom (ex: vincent.sotchedji.store)",
      "🔒 repo_github":  "AUTO — généré d'après le prénom (ex: portfolio-vincent)",
      "🔒 statut":       "AUTO — géré par le système (en_attente → en_ligne après déploiement)",
      "🔒 date_creation":"AUTO — date d'enregistrement, générée automatiquement",
      "ℹ️ template_id":  "1 = Classique (navy/or)  |  2 = Moderne (indigo/violet)  |  3 = Élégant (terra/sépia)",
      "ℹ️ abonnement":   "gratuit  |  standard  |  premium",
      "⚠️ ATTENTION":    "Supprime ou ignore ce bloc _NOTICE lors de l'import — il sera ignoré automatiquement"
    },
    prenom: "Vincent",
    nom: "Dupont",
    email: "vincent@email.com",
    telephone: "+229 01 23 45 67",
    profession: "Développeur web & Consultant IT",
    photo_url: "https://exemple.com/photo.jpg",
    template_id: "1",
    domaine: "sotchedji.store",
    abonnement: "gratuit",
    profil: {
      hero: {
        eyebrow: "Applications web, logiciels desktop, réseaux informatiques et IA",
        sous_titre: "Développeur web & desktop • Consultant IT • Spécialiste réseaux",
        lead: "Je conçois et déploie des solutions numériques adaptées aux réalités terrain. Mon approche combine expertise technique, accompagnement humain et usage de l'IA pour des résultats concrets.",
        stats: [
          { valeur: "8 ans", desc: "d'expérience en développement" },
          { valeur: "50+",   desc: "projets livrés" },
          { valeur: "DCH3",  desc: "fondateur & directeur" }
        ]
      },
      apropos: {
        titre: "Coordonnateur de projets, développeur et consultant IT orienté terrain.",
        intro: "Une expertise construite autour d'applications web, de logiciels desktop, de réseaux informatiques et d'intelligence artificielle.",
        para1: "Premier paragraphe biographique — présente le parcours global et les domaines d'intervention principaux.",
        para2: "Deuxième paragraphe — approfondit une spécialité, un projet marquant ou une philosophie de travail.",
        para3: "Troisième paragraphe — optionnel. Laisse vide si deux paragraphes suffisent.",
        apports: [
          { titre: "Solutions métier", desc: "Applications web, logiciels desktop sur mesure" },
          { titre: "Accompagnement terrain", desc: "Formation, maintenance, support utilisateur" },
          { titre: "IA pratique", desc: "Accompagnement à l'intégration de l'IA en entreprise" }
        ],
        values: [
          { titre: "Coordonnateur projets", desc: "Gestion multi-équipes et pilotage stratégique" },
          { titre: "IA + Productivité", desc: "Outils IA pour automatiser et optimiser les flux" },
          { titre: "Réseaux informatiques", desc: "Maintenance, serveurs, sécurité LAN/WAN" }
        ]
      },
      competences: [
        { sigle: "WEB", titre: "Développement web", description: "Conception d'applications web modernes et responsives", tags: ["Django", "Python", "JavaScript", "HTML/CSS"] },
        { sigle: "NET", titre: "Réseaux & Systèmes", description: "Configuration, maintenance et sécurisation des réseaux", tags: ["LAN", "VPN", "Linux", "Windows Server"] },
        { sigle: "IA",  titre: "Intelligence artificielle", description: "Intégration et usage de l'IA en entreprise", tags: ["ChatGPT", "Automatisation", "Prompt Engineering"] }
      ],
      experiences: [
        {
          periode: "Jan 2022 - Présent",
          label: "DCH3 Consulting · IA · Solutions métier",
          titre: "Coordonnateur des projets",
          description: "Pilotage de projets numériques, développement de solutions sur mesure et accompagnement des équipes.",
          bullets: [
            "Développement de l'application King Guest House en Django",
            "Coordination du Guichet Unique dans 20+ communes du Bénin",
            "Formation de 50+ agents à l'usage des outils numériques"
          ]
        }
      ],
      projets: [
        {
          sigle: "GU",
          type: "Projet majeur",
          titre: "Guichet Unique de l'Agriculture",
          description: "Plateforme nationale de gestion des subventions et accompagnement des agriculteurs.",
          impact: "Impact : 20+ communes du Bénin accompagnées",
          tags: ["Django", "Python", "Gestion publique"],
          lien: ""
        },
        {
          sigle: "KG",
          type: "Application web",
          titre: "King Guest House",
          description: "Système de gestion hôtelière complet — réservations, facturation, reporting.",
          impact: "",
          tags: ["Django", "Bootstrap", "PostgreSQL"],
          lien: ""
        }
      ],
      certifications: [
        { titre: "Marketing numérique", institution: "Google" },
        { titre: "Fondamentaux de la cybersécurité", institution: "Google" }
      ],
      langues: ["Français", "Fon", "Anglais"],
      interets: ["Voyages", "Football", "Basketball", "Lecture"],
      contact: {
        titre: "Un projet à structurer ? Travaillons ensemble.",
        description: "Disponible pour des missions de conseil, de développement sur mesure ou de formation terrain. Réponse sous 24h.",
        localisation: "Abomey-Calavi, Bénin",
        whatsapp: "2290161003280"
      },
      visibilite: {
        telephone: true, email: true, whatsapp: true, localisation: true,
        eyebrow: true, stats: true, proof_tel: true, proof_email: true, proof_loc: true,
        competences: true, experiences: true, projets: true,
        certifications: true, langues: true, interets: true
      }
    }
  };
}

function afficherTemplate() {
  document.getElementById('tplPreview').value = JSON.stringify(getTemplateJSON(), null, 2);
}

function copierTemplate() {
  const json = JSON.stringify(getTemplateJSON(), null, 2);
  navigator.clipboard.writeText(json).then(() => {
    toast('Template JSON copié dans le presse-papiers ! Colle-le dans un éditeur de texte.', 'success', '📋');
  }).catch(() => {
    // Fallback si clipboard API bloquée
    document.getElementById('tplPreview').value = json;
    document.getElementById('tplPreview').select();
    document.execCommand('copy');
    toast('Template JSON copié !', 'success', '📋');
  });
}

// Importer le JSON collé et remplir le formulaire
function importerJSON() {
  const raw = document.getElementById('jsonImport').value.trim();
  const status = document.getElementById('importStatus');
  if (!raw) { status.textContent = '⚠️ Colle d\'abord un JSON.'; return; }

  let data;
  try { data = JSON.parse(raw); }
  catch(err) { status.textContent = '❌ JSON invalide : ' + err.message; toast('JSON invalide — vérifie la syntaxe', 'error'); return; }

  // Ignorer le bloc _NOTICE automatiquement
  delete data._NOTICE;

  if (!data.prenom || !data.nom || !data.profession) {
    status.textContent = '❌ Champs obligatoires manquants : prenom, nom, profession';
    toast('Champs obligatoires manquants : prenom, nom, profession', 'error'); return;
  }
  remplirFormulaire(data);
  fermerImport(); afficherVue('form'); changerOnglet(0);
  toast('Formulaire rempli à partir du JSON — vérifie puis clique Enregistrer', 'success', '📥');
}

// ── Chargeur SheetJS dynamique (évite le blocage CSP) ───────────
let xlsxLoading = false, xlsxCallbacks = [];
function chargerXLSX(cb) {
  if (typeof XLSX !== 'undefined') { cb(); return; }
  xlsxCallbacks.push(cb);
  if (xlsxLoading) return;
  xlsxLoading = true;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload  = () => { xlsxLoading = false; xlsxCallbacks.forEach(f => f()); xlsxCallbacks = []; };
  s.onerror = () => { xlsxLoading = false; toast('Impossible de charger la lib Excel — vérifie ta connexion', 'error'); xlsxCallbacks = []; };
  document.head.appendChild(s);
}

// ── EXCEL : convertit les données en tableau de lignes ──────────
function dataToExcelRows(data) {
  const rows = [];
  const p = data.profil || {};

  rows.push(['SECTION', 'CHAMP', 'VALEUR', 'NOTE / AIDE']);
  rows.push(['', '', '', '']);

  rows.push(['══ IDENTITÉ ══', '', '', '']);
  rows.push(['IDENTITÉ', 'prenom',     data.prenom     || '', '★ Obligatoire']);
  rows.push(['IDENTITÉ', 'nom',        data.nom        || '', '★ Obligatoire']);
  rows.push(['IDENTITÉ', 'profession', data.profession || '', '★ Obligatoire — ex: Développeur web & Consultant IT']);
  rows.push(['IDENTITÉ', 'email',      data.email      || '', '']);
  rows.push(['IDENTITÉ', 'telephone',  data.telephone  || '', 'ex: +229 01 23 45 67']);
  rows.push(['IDENTITÉ', 'photo_url',  data.photo_url  || '', 'URL directe vers la photo (https://...)']);
  rows.push(['', '', '', '']);

  rows.push(['══ PUBLICATION ══', '', '', '']);
  rows.push(['PUBLICATION', 'domaine',     data.domaine     || 'sotchedji.store', '🔒 AUTO si laissé vide']);
  rows.push(['PUBLICATION', 'abonnement',  data.abonnement  || 'gratuit',         'gratuit | standard | premium']);
  rows.push(['PUBLICATION', 'template_id', data.template_id || '1',               '1=Classique(navy/or)  2=Moderne(indigo)  3=Élégant(terra)']);
  rows.push(['', '', '', '']);

  const h = p.hero || {};
  rows.push(['══ HERO ══', '', '', 'Section visible en premier sur la page']);
  rows.push(['HERO', 'eyebrow',    h.eyebrow    || '', 'Petit texte animé en haut (ex: Applications web, IA...)']);
  rows.push(['HERO', 'sous_titre', h.sous_titre || '', 'Sous-titre de profession (ex: Développeur · Consultant IT)']);
  rows.push(['HERO', 'lead',       h.lead       || '', 'Description courte (2-3 phrases)']);
  const stats = h.stats || [{},{},{}];
  for (let i = 0; i < 3; i++) {
    const s = stats[i] || {};
    rows.push(['HERO', `stat_${i+1}_valeur`, s.valeur || '', `Carte stat ${i+1} — ex: 8 ans | 50+ | Mon Entreprise`]);
    rows.push(['HERO', `stat_${i+1}_desc`,   s.desc   || '', `Description stat ${i+1} — ex: d'expérience | projets livrés`]);
  }
  rows.push(['', '', '', '']);

  const ap = p.apropos || {};
  rows.push(['══ À PROPOS ══', '', '', '']);
  rows.push(['À PROPOS', 'titre', ap.titre || '', 'Titre de la section (phrase longue)']);
  rows.push(['À PROPOS', 'intro', ap.intro || '', 'Petite intro à droite du titre']);
  rows.push(['À PROPOS', 'para1', ap.para1 || '', 'Paragraphe 1 de la biographie']);
  rows.push(['À PROPOS', 'para2', ap.para2 || '', 'Paragraphe 2']);
  rows.push(['À PROPOS', 'para3', ap.para3 || '', 'Paragraphe 3 — optionnel, laisser vide si inutile']);
  const apts = ap.apports || [{},{},{}];
  for (let i = 0; i < 3; i++) {
    const a = apts[i] || {};
    rows.push(['À PROPOS', `apport_${i+1}_titre`, a.titre || '', `Point "ce que j'apporte" ${i+1} — titre`]);
    rows.push(['À PROPOS', `apport_${i+1}_desc`,  a.desc  || '', `Point "ce que j'apporte" ${i+1} — description`]);
  }
  const vals = ap.values || [{},{},{}];
  for (let i = 0; i < 3; i++) {
    const v = vals[i] || {};
    rows.push(['À PROPOS', `value_${i+1}_titre`, v.titre || '', `Carte de valeur ${i+1} — titre`]);
    rows.push(['À PROPOS', `value_${i+1}_desc`,  v.desc  || '', `Carte de valeur ${i+1} — description`]);
  }
  rows.push(['', '', '', '']);

  const comps = p.competences || [];
  rows.push(['══ COMPÉTENCES ══', '', '', 'Ajouter comp_4_sigle, comp_4_titre... pour plus de compétences']);
  if (comps.length === 0) {
    rows.push(['COMPÉTENCES', 'comp_1_sigle',       '', 'ex: WEB | IA | NET']);
    rows.push(['COMPÉTENCES', 'comp_1_titre',       '', '★ Obligatoire pour la compétence']);
    rows.push(['COMPÉTENCES', 'comp_1_description', '', 'Description courte']);
    rows.push(['COMPÉTENCES', 'comp_1_tags',        '', 'Tags séparés par des virgules — ex: Django, Python, JS']);
  } else {
    comps.forEach((c, i) => {
      rows.push(['COMPÉTENCES', `comp_${i+1}_sigle`,       c.sigle       || '', 'ex: WEB | IA | NET']);
      rows.push(['COMPÉTENCES', `comp_${i+1}_titre`,       c.titre       || '', '★ Obligatoire']);
      rows.push(['COMPÉTENCES', `comp_${i+1}_description`, c.description || '', '']);
      rows.push(['COMPÉTENCES', `comp_${i+1}_tags`,        (c.tags||[]).join(', '), 'Virgule comme séparateur']);
    });
  }
  rows.push(['', '', '', '']);

  const exps = p.experiences || [];
  rows.push(['══ EXPÉRIENCES ══', '', '', 'Ajouter exp_2_periode, exp_2_titre... pour plus d\'expériences']);
  if (exps.length === 0) {
    rows.push(['EXPÉRIENCES', 'exp_1_periode',     '', 'ex: Jan 2022 - Présent']);
    rows.push(['EXPÉRIENCES', 'exp_1_label',       '', 'ex: DCH3 Consulting · IA · Solutions métier']);
    rows.push(['EXPÉRIENCES', 'exp_1_titre',       '', '★ Titre du poste']);
    rows.push(['EXPÉRIENCES', 'exp_1_description', '', 'Description courte du poste']);
    rows.push(['EXPÉRIENCES', 'exp_1_bullets',     '', 'Points clés — séparer par des retours à la ligne (Alt+Entrée dans Excel)']);
  } else {
    exps.forEach((e, i) => {
      rows.push(['EXPÉRIENCES', `exp_${i+1}_periode`,     e.periode     || '', '']);
      rows.push(['EXPÉRIENCES', `exp_${i+1}_label`,       e.label       || '', '']);
      rows.push(['EXPÉRIENCES', `exp_${i+1}_titre`,       e.titre       || '', '★ Obligatoire']);
      rows.push(['EXPÉRIENCES', `exp_${i+1}_description`, e.description || '', '']);
      rows.push(['EXPÉRIENCES', `exp_${i+1}_bullets`,     (e.bullets||[]).join('\n'), 'Un bullet par ligne']);
    });
  }
  rows.push(['', '', '', '']);

  const projs = p.projets || [];
  rows.push(['══ PROJETS ══', '', '', 'Le 1er projet sera mis en avant (featured). Ajouter proj_3_sigle... pour plus']);
  if (projs.length === 0) {
    rows.push(['PROJETS', 'proj_1_sigle',       '', 'ex: GU | KG | AI — 2-3 lettres']);
    rows.push(['PROJETS', 'proj_1_type',        '', 'ex: Projet majeur | Application web | IA']);
    rows.push(['PROJETS', 'proj_1_titre',       '', '★ Obligatoire']);
    rows.push(['PROJETS', 'proj_1_description', '', '']);
    rows.push(['PROJETS', 'proj_1_impact',      '', 'ex: Impact : 20+ communes accompagnées']);
    rows.push(['PROJETS', 'proj_1_tags',        '', 'Virgule comme séparateur']);
    rows.push(['PROJETS', 'proj_1_lien',        '', 'URL optionnelle — ex: https://monprojet.com']);
  } else {
    projs.forEach((pr, i) => {
      rows.push(['PROJETS', `proj_${i+1}_sigle`,       pr.sigle       || '', '']);
      rows.push(['PROJETS', `proj_${i+1}_type`,        pr.type        || '', '']);
      rows.push(['PROJETS', `proj_${i+1}_titre`,       pr.titre       || '', '★ Obligatoire']);
      rows.push(['PROJETS', `proj_${i+1}_description`, pr.description || '', '']);
      rows.push(['PROJETS', `proj_${i+1}_impact`,      pr.impact      || '', '']);
      rows.push(['PROJETS', `proj_${i+1}_tags`,        (pr.tags||[]).join(', '), '']);
      rows.push(['PROJETS', `proj_${i+1}_lien`,        pr.lien        || '', '']);
    });
  }
  rows.push(['', '', '', '']);

  const certs = p.certifications || [];
  rows.push(['══ CERTIFICATIONS ══', '', '', 'Ajouter certif_3_titre... pour plus']);
  if (certs.length === 0) {
    rows.push(['CERTIFICATIONS', 'certif_1_titre',       '', '★ Titre de la formation']);
    rows.push(['CERTIFICATIONS', 'certif_1_institution', '', 'ex: Google, Coursera, AFD']);
  } else {
    certs.forEach((c, i) => {
      rows.push(['CERTIFICATIONS', `certif_${i+1}_titre`,       c.titre       || '', '']);
      rows.push(['CERTIFICATIONS', `certif_${i+1}_institution`, c.institution || '', '']);
    });
  }
  rows.push(['', '', '', '']);

  rows.push(['══ LANGUES & INTÉRÊTS ══', '', '', '']);
  rows.push(['LANGUES',   'langues',  (p.langues  ||[]).join(', '), 'Séparées par des virgules — ex: Français, Fon, Anglais']);
  rows.push(['INTÉRÊTS',  'interets', (p.interets ||[]).join(', '), 'Séparés par des virgules — ex: Voyages, Football']);
  rows.push(['', '', '', '']);

  const ct = p.contact || {};
  rows.push(['══ CONTACT ══', '', '', '']);
  rows.push(['CONTACT', 'titre',       ct.titre        || '', 'ex: Un projet à structurer ? Travaillons ensemble.']);
  rows.push(['CONTACT', 'description', ct.description  || '', 'Texte d\'invitation (2-3 phrases)']);
  rows.push(['CONTACT', 'localisation',ct.localisation || '', 'ex: Abomey-Calavi, Bénin']);
  rows.push(['CONTACT', 'whatsapp',    ct.whatsapp     || '', 'Avec indicatif, sans espaces — ex: 2290161003280']);
  rows.push(['', '', '', '']);

  const vis = p.visibilite || {};
  rows.push(['══ VISIBILITÉ ══', '', '', 'true = visible sur la page publique  |  false = masqué']);
  const visFields = [
    ['telephone',      'Téléphone dans la section contact'],
    ['email',          'Email dans la section contact'],
    ['whatsapp',       'Bouton WhatsApp'],
    ['localisation',   'Ville / pays'],
    ['eyebrow',        'Tagline animée (chip en haut du hero)'],
    ['stats',          'Cartes statistiques flottantes'],
    ['proof_tel',      'Téléphone dans le hero (proof card)'],
    ['proof_email',    'Email dans le hero (proof card)'],
    ['proof_loc',      'Localisation dans le hero (proof card)'],
    ['competences',    'Section Compétences entière'],
    ['experiences',    'Section Expériences entière'],
    ['projets',        'Section Projets entière'],
    ['certifications', 'Section Certifications entière'],
    ['langues',        'Section Langues entière'],
    ['interets',       'Section Intérêts entière'],
  ];
  visFields.forEach(([key, note]) => {
    rows.push(['VISIBILITÉ', key, vis[key] === false ? 'false' : 'true', note]);
  });

  return rows;
}

// ── EXCEL : parse les lignes en objet data ──────────────────────
function excelRowsToData(rows) {
  const data = {
    profil: {
      hero: { stats: [] },
      apropos: { apports: [], values: [] },
      competences: [], experiences: [], projets: [],
      certifications: [], langues: [], interets: [],
      contact: {}, visibilite: {}
    }
  };

  rows.forEach(row => {
    const sec = String(row[0] || '').trim().toUpperCase()
      .replace(/[═\s]/g,'').replace('ÀPROPOS','APROPOS').replace('INTÉRÊTS','INTERETS')
      .replace('VISIBILITÉ','VISIBILITE').replace('EXPÉRIENCES','EXPERIENCES')
      .replace('COMPÉTENCES','COMPETENCES');
    const field = String(row[1] || '').trim();
    const value = String(row[2] !== undefined ? row[2] : '').trim();
    if (!field || sec.startsWith('══') || sec === '') return;

    switch(sec) {
      case 'IDENTITÉ': case 'IDENTITE':
        if      (field==='prenom')     data.prenom     = value;
        else if (field==='nom')        data.nom        = value;
        else if (field==='profession') data.profession = value;
        else if (field==='email')      data.email      = value;
        else if (field==='telephone')  data.telephone  = value;
        else if (field==='photo_url')  data.photo_url  = value;
        break;
      case 'PUBLICATION':
        if      (field==='domaine')     data.domaine     = value;
        else if (field==='abonnement')  data.abonnement  = value;
        else if (field==='template_id') data.template_id = value;
        break;
      case 'HERO': {
        if      (field==='eyebrow')    data.profil.hero.eyebrow    = value;
        else if (field==='sous_titre') data.profil.hero.sous_titre = value;
        else if (field==='lead')       data.profil.hero.lead       = value;
        else {
          const m = field.match(/^stat_(\d+)_(valeur|desc)$/);
          if (m) {
            const idx = parseInt(m[1])-1;
            while (data.profil.hero.stats.length <= idx) data.profil.hero.stats.push({});
            data.profil.hero.stats[idx][m[2]] = value;
          }
        }
        break;
      }
      case 'APROPOS': {
        if (['titre','intro','para1','para2','para3'].includes(field)) { data.profil.apropos[field] = value; break; }
        let m = field.match(/^apport_(\d+)_(titre|desc)$/);
        if (m) { const i=parseInt(m[1])-1; while(data.profil.apropos.apports.length<=i) data.profil.apropos.apports.push({}); data.profil.apropos.apports[i][m[2]]=value; break; }
        m = field.match(/^value_(\d+)_(titre|desc)$/);
        if (m) { const i=parseInt(m[1])-1; while(data.profil.apropos.values.length<=i) data.profil.apropos.values.push({}); data.profil.apropos.values[i][m[2]]=value; }
        break;
      }
      case 'COMPETENCES': {
        const m = field.match(/^comp_(\d+)_(sigle|titre|description|tags)$/);
        if (m) {
          const i=parseInt(m[1])-1;
          while(data.profil.competences.length<=i) data.profil.competences.push({});
          if (m[2]==='tags') data.profil.competences[i].tags = value.split(',').map(t=>t.trim()).filter(Boolean);
          else data.profil.competences[i][m[2]] = value;
        }
        break;
      }
      case 'EXPERIENCES': {
        const m = field.match(/^exp_(\d+)_(periode|label|titre|description|bullets)$/);
        if (m) {
          const i=parseInt(m[1])-1;
          while(data.profil.experiences.length<=i) data.profil.experiences.push({});
          if (m[2]==='bullets') data.profil.experiences[i].bullets = value.split('\n').map(b=>b.trim()).filter(Boolean);
          else data.profil.experiences[i][m[2]] = value;
        }
        break;
      }
      case 'PROJETS': {
        const m = field.match(/^proj_(\d+)_(sigle|type|titre|description|impact|tags|lien)$/);
        if (m) {
          const i=parseInt(m[1])-1;
          while(data.profil.projets.length<=i) data.profil.projets.push({});
          if (m[2]==='tags') data.profil.projets[i].tags = value.split(',').map(t=>t.trim()).filter(Boolean);
          else data.profil.projets[i][m[2]] = value;
        }
        break;
      }
      case 'CERTIFICATIONS': {
        const m = field.match(/^certif_(\d+)_(titre|institution)$/);
        if (m) {
          const i=parseInt(m[1])-1;
          while(data.profil.certifications.length<=i) data.profil.certifications.push({});
          data.profil.certifications[i][m[2]] = value;
        }
        break;
      }
      case 'LANGUES':
        if (field==='langues')  data.profil.langues  = value.split(',').map(l=>l.trim()).filter(Boolean);
        break;
      case 'INTERETS':
        if (field==='interets') data.profil.interets = value.split(',').map(i=>i.trim()).filter(Boolean);
        break;
      case 'CONTACT':
        if      (field==='titre')        data.profil.contact.titre        = value;
        else if (field==='description')  data.profil.contact.description  = value;
        else if (field==='localisation') data.profil.contact.localisation = value;
        else if (field==='whatsapp')     data.profil.contact.whatsapp     = value;
        break;
      case 'VISIBILITE':
        data.profil.visibilite[field] = (value.toLowerCase() !== 'false');
        break;
    }
  });
  return data;
}

// ── Helper : écrire et télécharger un workbook XLSX ─────────────
function _xlsxDownload(wb, filename) {
  const wbout = XLSX.write(wb, {bookType:'xlsx', type:'binary'});
  const buf = new ArrayBuffer(wbout.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < wbout.length; i++) view[i] = wbout.charCodeAt(i) & 0xFF;
  const blob = new Blob([buf], {type:'application/octet-stream'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Télécharger le template Excel vierge ────────────────────────
function telechargerTemplateExcel() {
  chargerXLSX(() => {
    const tplData = getTemplateJSON();
    delete tplData._NOTICE;
    const rows  = dataToExcelRows(tplData);
    const wb    = XLSX.utils.book_new();
    const ws    = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:20},{wch:28},{wch:55},{wch:55}];
    XLSX.utils.book_append_sheet(wb, ws, 'Client');
    const aide = [
      ['AIDE — NE PAS MODIFIER CETTE FEUILLE'],[''],
      ['1. Va dans l\'onglet "Client"'],
      ['2. Modifie uniquement la colonne C (VALEUR)'],
      ['3. Ne change PAS les colonnes A, B, D'],
      ['4. Ajoute des lignes comp_4_sigle, exp_2_periode... pour plus d\'entrées'],[''],
      ['CHAMPS AUTO (ne pas remplir) :'],
      ['id','','Généré automatiquement'],
      ['sous_domaine','','Généré d\'après le prénom'],
      ['repo_github','','Généré d\'après le prénom'],
      ['statut','','Géré par le système'],
      ['date_creation','','Générée automatiquement'],
    ];
    const wsAide = XLSX.utils.aoa_to_sheet(aide);
    wsAide['!cols'] = [{wch:25},{wch:20},{wch:40}];
    XLSX.utils.book_append_sheet(wb, wsAide, 'Aide');
    _xlsxDownload(wb, 'portfoliohub_client_template.xlsx');
    toast('Template Excel téléchargé !', 'success', '📊');
  });
}

// ── Gestion upload fichier Excel ─────────────────────────────────
function onFileChosen(input) {
  if (!input.files || !input.files[0]) return;
  const name = input.files[0].name;
  const chosen = document.getElementById('fileChosen');
  document.getElementById('fileChosenName').textContent = name;
  chosen.classList.add('show');
  document.getElementById('excelImportStatus').textContent = '';
}

// ── Importer depuis un fichier Excel ────────────────────────────
function importerExcel() {
  const input  = document.getElementById('excelFile');
  const status = document.getElementById('excelImportStatus');
  if (!input.files || !input.files[0]) { status.textContent = '⚠️ Aucun fichier sélectionné.'; return; }
  chargerXLSX(() => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb       = XLSX.read(e.target.result, {type:'binary'});
        const sheet    = wb.SheetNames.includes('Client') ? 'Client' : wb.SheetNames[0];
        const rows     = XLSX.utils.sheet_to_json(wb.Sheets[sheet], {header:1, defval:''});
        const data     = excelRowsToData(rows.slice(1));
        if (!data.prenom || !data.nom || !data.profession) {
          status.textContent = '❌ Champs obligatoires manquants : prenom, nom, profession (colonne C)';
          toast('Champs obligatoires manquants dans l\'Excel', 'error'); return;
        }
        remplirFormulaire(data);
        fermerImport(); afficherVue('form'); changerOnglet(0);
        toast('Formulaire rempli depuis Excel — vérifie puis clique Enregistrer', 'success', '📊');
      } catch(err) {
        status.textContent = '❌ Erreur : ' + err.message;
        toast('Erreur lors de la lecture du fichier Excel', 'error');
      }
    };
    reader.readAsBinaryString(input.files[0]);
  });
}
