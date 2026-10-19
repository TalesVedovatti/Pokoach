    const maxTeamSize = 6;
    let pokemonList = [];
    const teamId = Number(new URLSearchParams(location.search).get('id'));
    const statusElement = document.getElementById('saveStatus');
    const teamNameInput = document.getElementById('teamName');
    let saveTimer;
    let saveQueue = Promise.resolve();
    let loadingTeam = true;
    let revision = 0;
    let savedRevision = 0;
    function serializeTeam() {
      return [...document.querySelectorAll('.pokemon-slot')].map(slot => ({
        name: slot.querySelector('input')?.value.trim().toLowerCase() || '',
        ability: slot.querySelector('.ability-select')?.value || '',
        moves: [...slot.querySelectorAll('.move-select')].map(select => select.value || '')
      }));
    }
    function markDirty() {
      if (loadingTeam) return;
      revision++;
      statusElement.textContent = 'Alterações pendentes...';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {saveTeam().catch(() => {});}, 700);
    }
    function saveTeam() {
      clearTimeout(saveTimer);
      const version = revision;
      const payload = {name:teamNameInput.value.trim(), pokemon:serializeTeam()};
      saveQueue = saveQueue.catch(() => {}).then(async () => {
        if (!payload.name) throw new Error('Informe um nome para o time.');
        statusElement.textContent = 'Salvando...';
        const response = await fetch(`/api/teams/${teamId}`, {
          method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
        savedRevision = Math.max(savedRevision, version);
        if (savedRevision === revision) statusElement.textContent = '✓ Todas as alterações salvas';
      }).catch(error => { statusElement.textContent = `Erro ao salvar: ${error.message}`; throw error; });
      return saveQueue;
    }
    async function leaveEditor(url) {
      try { await saveTeam(); location.assign(url); }
      catch(error) { alert('Não foi possível salvar o time. Verifique a conexão e tente novamente antes de sair.'); }
    }


    const vgcSuggestions = {
      "flutter-mane": ["Moonblast", "Shadow Ball", "Protect", "Dazzling Gleam"],
      "landorus-therian": ["Earthquake", "Rock Slide", "Protect", "U-turn"],
      "iron-hands": ["Fake Out", "Wild Charge", "Drain Punch", "Protect"],
      "ting-lu": ["Ruination", "Stomping Tantrum", "Protect", "Heavy Slam"],
      "chi-yu": ["Heat Wave", "Dark Pulse", "Snarl", "Protect"],
      "gothitelle": ["Psychic", "Fake Out", "Helping Hand", "Protect"]
    };

    async function fetchAllPokemonNames() {
      const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
      const data = await res.json();
      pokemonList = data.results.map(p => p.name);
    }

    function addPokemonSlot() {
      const container = document.getElementById('teamBuilder');
      const currentSlots = container.querySelectorAll('.pokemon-slot');

      if (currentSlots.length >= maxTeamSize) {
        alert('Você já adicionou 6 Pokémon.');
        return;
      }

      const slot = document.createElement('div');
      slot.className = 'pokemon-slot';

      const line1 = document.createElement('div');
      line1.id = 'line1'

      const line2 = document.createElement('div');
      line2.id = 'line2'

      const line3 = document.createElement('div');
      line3.id = 'line3'

      const line4 = document.createElement('div');
      line4.id = 'line4'

      const line5 = document.createElement('div');
      line5.id = 'line5'

      const input = document.createElement('input');
      input.placeholder = 'Nome do Pokémon';
      input.addEventListener('input', () => { slot.dataset.pokemonName = ''; markDirty(); });

      const suggestionsBox = document.createElement('div');
      suggestionsBox.className = 'autocomplete-suggestions';
      suggestionsBox.style.display = 'none';

      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        suggestionsBox.innerHTML = '';
        if (query.length === 0) {
          suggestionsBox.style.display = 'none';
          return;
        }
        const matches = pokemonList.filter(name => name.includes(query)).slice(0, 10);
        matches.forEach(match => {
          const suggestion = document.createElement('div');
          suggestion.textContent = match;
          suggestion.onclick = () => {
            input.value = match;
            suggestionsBox.style.display = 'none';
            fetchPokemonData(match, slot);
            markDirty();
          };
          suggestionsBox.appendChild(suggestion);
        });
        suggestionsBox.style.display = matches.length ? 'block' : 'none';
      });

      input.addEventListener('blur', () => {
        setTimeout(() => suggestionsBox.style.display = 'none', 150);
      });

      const img = document.createElement('img');
      img.className = 'pokemon-image';
      img.alt = 'Sprite';
      img.src = '';
      img.style = '';

      const details = document.createElement('div');
      details.className = 'pokemon-details';

      const abilityLabel = document.createElement('div');
      const abilitySelect = document.createElement('select');
      abilitySelect.className = 'ability-select';
      abilitySelect.style.width = '200px';


      const moveSelect = document.createElement('select');
      moveSelect.id = 'move1';
      moveSelect.style.width = '200px'; moveSelect.className = 'move-select';
      const moveSelect2 = document.createElement('select');
      moveSelect2.id = 'move2';
      moveSelect2.style.width = '200px'; moveSelect2.className = 'move-select';
      const moveSelect3 = document.createElement('select');
      moveSelect3.id = 'move3';
      moveSelect3.style.width = '200px'; moveSelect3.className = 'move-select';
      const moveSelect4 = document.createElement('select');
      moveSelect4.id = 'move4';
      moveSelect4.style.width = '200px'; moveSelect4.className = 'move-select';

      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remover';
      removeButton.onclick = () => { container.removeChild(slot); markDirty(); };
      const inputWrapper = document.createElement('div');
      inputWrapper.style.position = 'relative';
      inputWrapper.style.width = '200px'; // ou a largura do input

      inputWrapper.appendChild(input);
      inputWrapper.appendChild(suggestionsBox);
      line1.appendChild(inputWrapper);


      slot.appendChild(line1);
      slot.appendChild(document.createElement('br'));
      slot.appendChild(line2);
      slot.appendChild(document.createElement('br'));
      slot.appendChild(line3);
      slot.appendChild(document.createElement('br'));
      slot.appendChild(line4);
      slot.appendChild(document.createElement('br'));
      slot.appendChild(line5);
      line2.appendChild(img);
      line3.appendChild(details);
      line3.appendChild(abilitySelect);
      line4.appendChild(moveSelect);
      line4.appendChild(moveSelect2);
      line4.appendChild(moveSelect3);
      line4.appendChild(moveSelect4);
      line5.appendChild(removeButton);

      container.appendChild(slot);
      slot.addEventListener('change', markDirty);
      markDirty();
      return slot;
    }

    async function fetchPokemonData(name, slot, previous = null) {
      const details = slot.querySelector('.pokemon-details');
      const img = slot.querySelector('img');
      const moveSelect = slot.querySelector('#move1');
      const moveSelect2 = slot.querySelector('#move2');
      const moveSelect3 = slot.querySelector('#move3');
      const moveSelect4 = slot.querySelector('#move4');
      details.innerHTML = 'Carregando...';

      try {
        //fetches the information of the pokemon
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!res.ok) throw new Error('Pokémon não encontrado');
        const data = await res.json();

        const types = data.types.map(t => t.type.name).join(', ');
        const abilities = data.abilities.map(a => a.ability.name).join(', ');
        const stats = data.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join(', ');

        details.innerHTML = `
          <strong>Tipos:</strong> ${types}<br>
          <strong>Status:</strong> ${stats}<br>
          <strong>Habilidade:</strong><br>
        `;

        img.src = data.sprites.front_default;

        // Empties the select's options before populating them
        moveSelect.innerHTML = '';
        moveSelect2.innerHTML = '';
        moveSelect3.innerHTML = '';
        moveSelect4.innerHTML = '';

        // Populates the selects
        const moves = ['', ...data.moves.map(m => m.move.name).sort()];


        moves.forEach(move => {
          const option = document.createElement('option');
          option.value = move;
          option.textContent = move;
          moveSelect.appendChild(option);
        });
        moves.forEach(move => {
          const option = document.createElement('option');
          option.value = move;
          option.textContent = move;
          moveSelect2.appendChild(option);
        });
        moves.forEach(move => {
          const option = document.createElement('option');
          option.value = move;
          option.textContent = move;
          moveSelect3.appendChild(option);
        });
        moves.forEach(move => {
          const option = document.createElement('option');
          option.value = move;
          option.textContent = move;
          moveSelect4.appendChild(option);
        });

        const abilitySelect = slot.querySelector('.ability-select');

        abilitySelect.innerHTML = '';

        data.abilities.forEach(a => {
          const option = document.createElement('option');
          option.value = a.ability.name;
          option.textContent = a.ability.name;
          abilitySelect.appendChild(option);
        });


        slot.dataset.pokemonName = name; // Save Pokémon name for export
        if (previous) {
          abilitySelect.value = previous.ability || abilitySelect.value;
          [moveSelect,moveSelect2,moveSelect3,moveSelect4].forEach((select,index) => {
            if (previous.moves?.[index] && [...select.options].some(option => option.value === previous.moves[index])) select.value = previous.moves[index];
          });
        }
        markDirty();

      } catch (err) {
        details.innerHTML = `<span style="color: red;">Erro: ${err.message}</span>`;
        img.src = '';
      }
    }

    function exportTeam() {
      const slots = document.querySelectorAll('.pokemon-slot');
      const team = [];

      slots.forEach(slot => {
        const name = slot.dataset.pokemonName;
        const moves = Array.from(slot.querySelectorAll('.move-select')).map(select => select.value);
        const ability = slot.querySelector('.ability-select')?.value || '';
        if (name) {
          team.push({ name, moves, ability });
        }
      });

      const blob = new Blob([JSON.stringify(team, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pokemon-team.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Eventos dos controles estáticos da página.
    document.getElementById('addPokemonButton').addEventListener('click', addPokemonSlot);
    document.getElementById('exportTeamButton').addEventListener('click', exportTeam);

    teamNameInput.addEventListener('input', markDirty);
    document.getElementById('saveTeamButton').addEventListener('click', () => saveTeam().catch(error => alert(error.message)));
    document.getElementById('backToTeams').addEventListener('click', event => {event.preventDefault();leaveEditor('teambuild.html');});
    document.querySelectorAll('nav a').forEach(link => {
      if (link.id === 'logoutLink') return;
      link.addEventListener('click', event => {event.preventDefault();leaveEditor(link.href);});
    });
    // Tenta concluir gravações pendentes antes de trocar de página/aba.
    window.addEventListener('pagehide', () => {
      if (revision > savedRevision) {
        navigator.sendBeacon?.(`/api/teams/${teamId}`, new Blob([JSON.stringify({name:teamNameInput.value.trim(),pokemon:serializeTeam()})], {type:'application/json'}));
      }
    });
    async function initialize() {
      if (!Number.isSafeInteger(teamId) || teamId <= 0) { location.replace('teambuild.html'); return; }
      try {
        const response = await fetch(`/api/teams/${teamId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Time não encontrado.');
        teamNameInput.value = data.team.name;
        await fetchAllPokemonNames().catch(() => { statusElement.textContent = 'Autocompletar indisponível. Você ainda pode editar o time.'; });
        const entries = data.team.pokemon;
        for (const pokemon of entries) {
          const slot = addPokemonSlot();
          slot.querySelector('input').value = pokemon.name;
          if (pokemon.name) await fetchPokemonData(pokemon.name, slot, pokemon);
        }
        loadingTeam = false;
        statusElement.textContent = '✓ Time carregado e salvo';
      } catch(error) { statusElement.textContent = `Erro: ${error.message}`; document.getElementById('addPokemonButton').disabled = true; }
    }
    initialize();
