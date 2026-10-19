const grid = document.getElementById('teamsGrid');
const message = document.getElementById('teamsMessage');
async function api(url, options = {}) {
  const response = await fetch(url, {credentials:'same-origin', ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao acessar os times.');
  return data;
}
async function loadTeams() {
  try {
    const {teams} = await api('/api/teams');
    grid.replaceChildren();
    message.textContent = teams.length ? '' : 'Você ainda não tem times. Crie o primeiro!';
    for (const team of teams) {
      const card = document.createElement('article'); card.className = 'team-card';
      const title = document.createElement('h2'); title.textContent = team.name;
      const info = document.createElement('p'); info.className = 'muted';
      info.textContent = `${team.pokemon.filter(p => p.name).length}/6 Pokémon · Atualizado em ${new Date(team.updated_at.replace(' ','T')+'Z').toLocaleString('pt-BR')}`;
      const names = document.createElement('p'); names.className = 'team-names';
      names.textContent = team.pokemon.map(p => p.name).filter(Boolean).join(' · ') || 'Time vazio';
      const actions = document.createElement('div'); actions.className = 'team-actions';
      const edit = document.createElement('a'); edit.className = 'add-button'; edit.href = `team-editor.html?id=${team.id}`; edit.textContent = 'Editar time';
      const analyze = document.createElement('a'); analyze.className = 'add-button analyze-team-button'; analyze.href = `analysis.html?teamId=${encodeURIComponent(team.id)}`; analyze.textContent = 'Analisar time';
      const remove = document.createElement('button'); remove.className = 'delete-button'; remove.textContent = 'Excluir';
      remove.addEventListener('click', async () => {
        if (!confirm(`Excluir o time "${team.name}"? Essa ação não pode ser desfeita.`)) return;
        try { await api(`/api/teams/${team.id}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete'})}); await loadTeams(); }
        catch(error) { message.textContent = error.message; }
      });
      actions.append(edit, analyze, remove); card.append(title,info,names,actions); grid.append(card);
    }
  } catch(error) { message.textContent = error.message; }
}
document.getElementById('newTeamButton').addEventListener('click', async () => {
  const name = prompt('Nome do novo time:', 'Meu time');
  if (name === null) return;
  if (!name.trim()) { message.textContent = 'Informe um nome para o time.'; return; }
  try {
    const {team} = await api('/api/teams', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),pokemon:[]})});
    window.location.assign(`team-editor.html?id=${team.id}`);
  } catch(error) { message.textContent = error.message; }
});
loadTeams();
