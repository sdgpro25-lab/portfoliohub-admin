// ══════════════════════════════════════════════════════════
// ── AUTH (via Google Sheets Utilisateurs) ─────────────────
// ══════════════════════════════════════════════════════════
const SESS_KEY = 'pf_session';
const SESS_DUR = 8 * 3600 * 1000;
let sessionUser = null; // { nom, email, role }

function isAuthenticated() {
  const s = sessionStorage.getItem(SESS_KEY);
  if (!s) return false;
  try {
    const parsed = JSON.parse(s);
    if (Date.now() - parsed.ts >= SESS_DUR) return false;
    sessionUser = parsed.user;
    return true;
  } catch { return false; }
}

async function checkAuth() {
  if (isAuthenticated()) { showAdmin(); return; }
  // Vérifier s'il existe des comptes dans Sheets
  showLoginLoading();
  const users = await api('listerUtilisateurs');
  if (Array.isArray(users) && users.length > 0) {
    showLogin();
  } else {
    showSetup();
  }
}

function showLoginLoading() {
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('authLogin').style.display  = 'none';
  document.getElementById('authSetup').style.display  = 'none';
}

function showLogin() {
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('authSetup').style.display  = 'none';
  document.getElementById('authLogin').style.display  = 'block';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginPwd').value   = '';
  document.getElementById('loginEmail').value = '';
  setTimeout(() => document.getElementById('loginEmail').focus(), 100);
}

function showSetup() {
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('authSetup').style.display  = 'block';
  document.getElementById('authLogin').style.display  = 'none';
  document.getElementById('setupError').style.display = 'none';
  setTimeout(() => document.getElementById('setupNom').focus(), 100);
}

function showAdmin() {
  document.getElementById('authOverlay').style.display = 'none';
  // Afficher le nom de l'utilisateur connecté
  const av = document.getElementById('avatarAdmin');
  if (av && sessionUser) av.textContent = (sessionUser.nom||'?')[0].toUpperCase();
  chargerTemplates();
  setTimeout(chargerClients, 600);
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pwd   = document.getElementById('loginPwd').value;
  if (!email || !pwd) return;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Connexion...';
  const r = await api('authentifier', { email, password: pwd });
  if (r && r.success) {
    sessionUser = { nom: r.nom, email: r.email, role: r.role };
    sessionStorage.setItem(SESS_KEY, JSON.stringify({ ts: Date.now(), user: sessionUser }));
    showAdmin();
  } else {
    document.getElementById('loginError').textContent =
      (r && r.error && r.error !== 'Identifiants incorrects') ? r.error : 'Email ou mot de passe incorrect.';
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginPwd').value = '';
    document.getElementById('loginPwd').focus();
    btn.disabled = false; btn.textContent = 'Se connecter →';
  }
}

async function doSetup() {
  const nom  = document.getElementById('setupNom').value.trim();
  const email = document.getElementById('setupEmail').value.trim();
  const pwd  = document.getElementById('setupPwd').value;
  const pwd2 = document.getElementById('setupPwd2').value;
  const errEl = document.getElementById('setupError');
  errEl.style.display = 'none';
  if (!nom)  { errEl.textContent = 'Saisis ton nom.'; errEl.style.display='block'; return; }
  if (!email) { errEl.textContent = 'Saisis ton email.'; errEl.style.display='block'; return; }
  if (!pwd || pwd.length < 6) { errEl.textContent = 'Mot de passe trop court (minimum 6 caractères).'; errEl.style.display='block'; return; }
  if (pwd !== pwd2) { errEl.textContent = 'Les mots de passe ne correspondent pas.'; errEl.style.display='block'; return; }
  const btn = document.getElementById('setupBtn');
  btn.disabled = true; btn.textContent = 'Création du compte...';
  const r = await api('creerUtilisateur', { nom, email, password: pwd, role: 'admin' });
  if (r && r.success) {
    sessionUser = { nom, email, role: 'admin' };
    sessionStorage.setItem(SESS_KEY, JSON.stringify({ ts: Date.now(), user: sessionUser }));
    showAdmin();
    toast('Compte admin créé ! Tu peux ajouter d\'autres utilisateurs depuis la section 👥.', 'success', '✅');
  } else {
    errEl.textContent = (r && r.error) ? r.error : 'Erreur de création.';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Créer mon compte →';
  }
}

function logout() {
  if (!confirm('Se déconnecter de PortfolioHub Admin ?')) return;
  sessionStorage.removeItem(SESS_KEY);
  sessionUser = null;
  checkAuth();
}
