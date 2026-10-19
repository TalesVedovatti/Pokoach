document.getElementById('logoutLink')?.addEventListener('click', async event => {
  event.preventDefault();
  try { if (typeof saveTeam === 'function') await saveTeam(); await fetch('/api/logout', {method:'POST',credentials:'same-origin'}); }
  catch (error) { alert('Não foi possível salvar o time ou sair: ' + error.message); return; }
  window.location.assign('/index.html');
});
