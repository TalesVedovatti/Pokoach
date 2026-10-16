    // Declare as variáveis globais para as bibliotecas
    let Pokedex; // Para pkmn.dex.Dex
    let SmogonCalculator; // Para smogon.calc ou calc

    // Função de inicialização que aguarda o carregamento do DOM e das bibliotecas
    document.addEventListener('DOMContentLoaded', async () => {
      // Garante que 'pkmn' está disponível
      if (typeof pkmn === 'undefined' || typeof pkmn.dex === 'undefined' || typeof pkmn.dex.Dex === 'undefined') {
        console.error('Erro: @pkmn/dex ou @pkmn/data não carregado corretamente.');
        document.getElementById('result').innerText = 'Erro de carregamento: dados Pokémon não disponíveis.';
        return;
      }
      Pokedex = pkmn.dex.Dex; // Atribua a Pokedex globalmente

      // Garante que 'calc' (do smogon) está disponível
      if (typeof calc === 'undefined') { // 'calc' é o nome que a produção.min.js expõe
        console.error('Erro: @smogon/calc não carregado corretamente.');
        document.getElementById('result').innerText = 'Erro de carregamento: calculadora de dano não disponível.';
        return;
      }
      SmogonCalculator = calc; // Atribua a calculadora globalmente

      // Popule os dropdowns (agora que Pokedex está garantido)
      await populateDropdowns();

      console.log('Bibliotecas carregadas e prontas!');
      console.log('Pokedex:', Pokedex);
      console.log('SmogonCalculator:', SmogonCalculator);
    });


    async function populateDropdowns() {
      // Use Pokedex diretamente
      const list = await Pokedex.species.all();
      const pokemonList = document.getElementById('pokemonList');
      list.forEach(p => {
        const option = document.createElement('option');
        option.value = p.name;
        pokemonList.appendChild(option);
      });

      const moves = await Pokedex.moves.all();
      const moveList = document.getElementById('moveList');
      moves.forEach(m => {
        const option = document.createElement('option');
        option.value = m.name;
        moveList.appendChild(option);
      });
    }

    async function calculateDamage() {
      // Verifique se as bibliotecas foram inicializadas
      if (!Pokedex || !SmogonCalculator) {
        document.getElementById('result').innerText = 'Aguarde o carregamento das bibliotecas. Tente novamente.';
        console.error('Bibliotecas não inicializadas para cálculo.');
        return;
      }

      const attackerName = document.getElementById('atk-name').value;
      const defenderName = document.getElementById('def-name').value;
      const moveName = document.getElementById('atk-move').value;

      if (!attackerName || !defenderName || !moveName) {
        document.getElementById('result').innerText = 'Por favor, insira o nome dos Pokémon e do movimento.';
        return;
      }

      const level = parseInt(document.getElementById('atk-level').value);
      const nature = document.getElementById('atk-nature').value;
      const ability = document.getElementById('atk-ability').value;
      const item = document.getElementById('atk-item').value;

      const attackerEvs = {
        hp: parseInt(document.getElementById('atk-hp-evs').value) || 0,
        atk: parseInt(document.getElementById('atk-atk-evs').value) || 0,
        def: parseInt(document.getElementById('atk-def-evs').value) || 0,
        spa: parseInt(document.getElementById('atk-spa-evs').value) || 0,
        spd: parseInt(document.getElementById('atk-spd-evs').value) || 0,
        spe: parseInt(document.getElementById('atk-spe-evs').value) || 0,
      };

      try {
        const gen = new SmogonCalculator.Generations.get(9);
        const attacker = new SmogonCalculator.Pokemon(gen, attackerName, {
          level,
          nature,
          ability,
          item,
        });
        console.log(attacker)

        const defLevel = parseInt(document.getElementById('def-level').value);
        const defNature = document.getElementById('def-nature').value;
        const defAbility = document.getElementById('def-ability').value;
        const defItem = document.getElementById('def-item').value;

        const defenderEvs = {
          hp: parseInt(document.getElementById('def-hp-evs').value) || 0,
          atk: parseInt(document.getElementById('def-atk-evs').value) || 0,
          def: parseInt(document.getElementById('def-def-evs').value) || 0,
          spa: parseInt(document.getElementById('def-spa-evs').value) || 0,
          spd: parseInt(document.getElementById('def-spd-evs').value) || 0,
          spe: parseInt(document.getElementById('def-spe-evs').value) || 0,
        };

        const defender = new SmogonCalculator.Pokemon(gen, defenderName, {
          level: defLevel,
          nature: defNature,
          ability: defAbility,
          item: defItem,
        });
        console.log(defender)
        const move = new SmogonCalculator.Move(gen, moveName);
        console.log(move)
        const field = new SmogonCalculator.Field();
        console.log(field)

        const attackerBoosts = {
          atk: parseInt(document.getElementById('atk-buff').value) || 0,
          spa: 0,
          def: 0, spd: 0, spe: 0
        };
        const defenderBoosts = {
          def: parseInt(document.getElementById('def-debuff').value) || 0,
          spd: 0,
          atk: 0, spa: 0, spe: 0
        };

        attacker.boosts = attackerBoosts;
        defender.boosts = defenderBoosts;

        const result = SmogonCalculator.calculate(gen, attacker, defender, move, field);

        if (result && result.range().length === 2) {
          document.getElementById('result').innerText = `Estimated Damage: ${result.range()[0]} - ${result.range()[1]} HP`;
        } else {
          document.getElementById('result').innerText = 'Não foi possível calcular o dano. Verifique os dados inseridos.';
          console.log('Objeto de resultado do cálculo:', result);
        }
      } catch (e) {
        document.getElementById('result').innerText = `Erro no cálculo: ${e.message}. Verifique os nomes e valores.`;
        console.error('Erro durante o cálculo de dano:', e);
        console.log('teste2')
        console.log(teste)
      }
    }

    document.getElementById('atk-move').addEventListener('input', async function () {
      if (!Pokedex) {
        console.warn('Pokedex não disponível ainda.');
        return;
      }
      const moveName = this.value;

      try {
        const move = await Pokedex.moves.get(moveName);
        console.log(move);
        if (move && move.type && move.category) {
          document.getElementById('atk-move-type').value = move.type;
          document.getElementById('atk-move-power').value = move.basePower;
          document.getElementById('atk-move-category').value = move.category;
        } else {
          document.getElementById('atk-move-type').value = '';
          document.getElementById('atk-move-power').value = '';
          document.getElementById('atk-move-category').value = '';
        }
      } catch (e) {
        console.warn('Move not found or failed to load:', moveName, e);
        document.getElementById('atk-move-type').value = '';
        document.getElementById('atk-move-power').value = '';
        document.getElementById('atk-move-category').value = '';
      }
    });


// Associa o botão de cálculo sem usar onclick no HTML.
document.getElementById("calculateDamageButton").addEventListener("click", calculateDamage);
