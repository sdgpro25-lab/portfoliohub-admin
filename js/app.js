// ══════════════════════════════════════════════════════════
// ── APP — Init, routing, utilisateurs ─────────────────────
// ══════════════════════════════════════════════════════════

let allUtilisateurs = [];

// ── Navigation vues ──
function afficherVue(vue) {
  ['dashboard','clients','form','templates','utilisateurs'].forEach(v => {
    const el = document.getElementById('vue-'+v);
    if (el) el.style.display = v === vue ? 'block' : 'none';
  });
  document.querySelectorAll('.sb-item').forEach((el,i) => {
    el.classList.toggle('active', ['dashboard','clients','form','templates','utilisateurs'][i] === vue);
  });
  const titres = {dashboard:'Tableau de bord', clients:'Clients', form:'Nouveau client', templates:'Templates', utilisateurs:'Utilisateurs'};
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titres[vue] || '';
  if (vue === 'clients')      renderTable('tableClients2');
  if (vue === 'templates')    renderTemplatesView();
  if (vue === 'utilisateurs') chargerUtilisateurs();
}

// ── Onglets formulaire ──
function changerOnglet(n) {
  ongletActif = n;
  document.querySelectorAll('.tab-panel').forEach((p,i) => p.classList.toggle('active', i===n));
  document.querySelectorAll('.tab-btn').forEach((b,i)  => b.classList.toggle('active', i===n));
}

// ── Utilisateurs ──
async function chargerUtilisateurs() {
  const tbody = document.getElementById('tableUtilisateurs');
  if (tbody) tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">⏳</div><p>Chargement...</p></div></td></tr>`;
  const r = await api('listerUtilisateurs');
  allUtilisateurs = Array.isArray(r) ? r : [];
  renderTableUtilisateurs();
}

function renderTableUtilisateurs() {
  const tbody = document.getElementById('tableUtilisateurs');
  if (!tbody) return;
  if (!allUtilisateurs.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👥</div><p>Aucun utilisateur.</p></div></td></tr>`;
    return;
  }
  const moi = sessionUser ? sessionUser.email : '';
  tbody.innerHTML = allUtilisateurs.map(u => {
    const isMe = u.email === moi;
    const roleBadge = u.role === 'admin'
      ? `<span style="padding:3px 10px;border-radius:6px;font-size:.72rem;font-weight:700;background:#e8f3fc;color:#1a6fa8;border:1px solid #c5dcf0">Admin</span>`
      : `<span style="padding:3px 10px;border-radius:6px;font-size:.72rem;font-weight:700;background:var(--bg);color:var(--muted);border:1px solid var(--border)">Viewer</span>`;
    return `<tr>
      <td>
        <div class="cl-identity">
          <div class="cl-av" style="background:linear-gradient(135deg,#2176ae,#0d9e8e)">${(u.nom||'?')[0].toUpperCase()}</div>
          <div><div class="cl-name">${u.nom}${isMe?' <span style="font-size:.68rem;color:var(--teal);font-weight:700">(vous)</span>':''}</div></div>
        </div>
      </td>
      <td style="font-size:.83rem;color:var(--muted)">${u.email}</td>
      <td>${roleBadge}</td>
      <td style="font-size:.78rem;color:var(--muted)">${u.date_creation||'—'}</td>
      <td>
        ${!isMe ? `<button class="btn-act" style="background:var(--rose-lt);color:var(--rose);border:1px solid #f9c8cc" onclick="supprimerUtilisateurUI('${u.id}','${u.nom}')">🗑 Supprimer</button>` : '<span style="font-size:.75rem;color:var(--muted)">—</span>'}
      </td>
    </tr>`;
  }).join('');
}

function ouvrirModalUtilisateur() {
  ['u_nom','u_email','u_pwd','u_pwd2'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('modalUtilisateur').classList.add('open');
  setTimeout(() => document.getElementById('u_nom').focus(), 100);
}

function fermerModalUtilisateur() {
  document.getElementById('modalUtilisateur').classList.remove('open');
}

async function soumettreUtilisateur() {
  const nom   = document.getElementById('u_nom').value.trim();
  const email = document.getElementById('u_email').value.trim();
  const pwd   = document.getElementById('u_pwd').value;
  const pwd2  = document.getElementById('u_pwd2').value;
  const role  = document.getElementById('u_role').value;
  if (!nom || !email || !pwd) { toast('Remplis tous les champs obligatoires', 'error'); return; }
  if (pwd !== pwd2) { toast('Les mots de passe ne correspondent pas', 'error'); return; }
  toast('Création du compte...', 'info');
  const r = await api('creerUtilisateur', { nom, email, password: pwd, role });
  if (r && r.success) {
    toast(`Compte créé pour ${nom} (${role})`, 'success', '✅');
    fermerModalUtilisateur();
    chargerUtilisateurs();
  } else {
    toast('Erreur : ' + (r && r.error ? r.error : '?'), 'error');
  }
}

async function supprimerUtilisateurUI(id, nom) {
  if (!confirm(`Supprimer le compte de ${nom} ?`)) return;
  const r = await api('supprimerUtilisateur', { id });
  if (r && r.success) {
    toast(`Compte de ${nom} supprimé`, 'success');
    chargerUtilisateurs();
  } else {
    toast('Erreur : ' + (r && r.error ? r.error : '?'), 'error');
  }
}

// ── Exposer toutes les fonctions sur window ──
Object.assign(window, {
  afficherVue, changerOnglet, chargerTemplates, chargerClients, enregistrerClient,
  deployer, mettreAJour, ouvrirModalTemplate, selTpl, appliquerTemplate, fermerModal,
  ajouterCompetence, ajouterExperience, ajouterProjet, ajouterCertif, resetForm,
  renderTemplatesView, changerTplTab, ouvrirEditTemplate, fermerEditTemplate,
  sauvegarderTemplateEdit, supprimerTemplateEdit, chargerCSSExemple,
  previewTemplatePleinEcran, previewTemplateInline, previewTemplateId,
  ouvrirImport, fermerImport, switchImportTab, copierTemplate, afficherTemplate,
  importerJSON, chargerXLSX, telechargerTemplateExcel, exporterClientExcel,
  onFileChosen, doLogin, doSetup, logout, exporterCarteClient, mettreEnBrouillon,
  previewPhoto, clearPhoto, clearPhotoSaved, syncPhotoUrl, checkSlugDispo, autoFillSlug,
  chargerUtilisateurs, ouvrirModalUtilisateur, fermerModalUtilisateur,
  soumettreUtilisateur, supprimerUtilisateurUI,
  fermerModalStatut
});

// ── Event listeners modaux ──
document.getElementById('modalTemplate').addEventListener('click', e => {
  if(e.target===document.getElementById('modalTemplate')) fermerModal();
});
document.getElementById('modalEditTemplate').addEventListener('click', e => {
  if (e.target === document.getElementById('modalEditTemplate')) fermerEditTemplate();
});
document.getElementById('modalImport').addEventListener('click', e => {
  if (e.target === document.getElementById('modalImport')) fermerImport();
});
document.getElementById('modalUtilisateur').addEventListener('click', e => {
  if (e.target === document.getElementById('modalUtilisateur')) fermerModalUtilisateur();
});

// ── Clock démarrage ──
tick();
setInterval(tick, 30000);

// ── Init ──
checkAuth();
