// script.js

document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const pokemonInputs = Array.from({ length: 6 }, (_, i) => ({
        input: document.getElementById(`pokemon${i + 1}`),
        suggestionsDiv: document.getElementById(`suggestions${i + 1}`)
    }));
    const weaknessTableBody = document.querySelector('#weaknessTable tbody');
    const teamAnalysisContent = document.getElementById('teamAnalysisContent');

    // Define all Pokémon types for iteration
    const ALL_TYPES = [
        'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting',
        'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',
        'dragon', 'steel', 'fairy', 'dark'
    ];

    const TYPE_INTERACTIONS = {
        normal: { weak_to: ['fighting'], resists: [], immune_to: ['ghost'] },
        fire: { weak_to: ['water', 'ground', 'rock'], resists: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immune_to: [] },
        water: { weak_to: ['electric', 'grass'], resists: ['fire', 'water', 'ice', 'steel'], immune_to: [] },
        grass: { weak_to: ['fire', 'ice', 'poison', 'flying', 'bug'], resists: ['water', 'electric', 'grass', 'ground'], immune_to: [] },
        electric: { weak_to: ['ground'], resists: ['electric', 'flying', 'steel'], immune_to: [] },
        ice: { weak_to: ['fire', 'fighting', 'rock', 'steel'], resists: ['ice'], immune_to: [] },
        fighting: { weak_to: ['flying', 'psychic', 'fairy'], resists: ['rock', 'bug', 'dark'], immune_to: [] },
        poison: { weak_to: ['ground', 'psychic'], resists: ['fighting', 'poison', 'grass', 'fairy'], immune_to: [] },
        ground: { weak_to: ['water', 'grass', 'ice'], resists: ['poison', 'rock'], immune_to: ['electric'] },
        flying: { weak_to: ['electric', 'ice', 'rock'], resists: ['fighting', 'bug', 'grass'], immune_to: ['ground'] },
        psychic: { weak_to: ['bug', 'ghost', 'dark'], resists: ['fighting', 'psychic'], immune_to: [] },
        bug: { weak_to: ['fire', 'flying', 'rock'], resists: ['fighting', 'ground', 'grass'], immune_to: [] },
        rock: { weak_to: ['fighting', 'ground', 'steel', 'water', 'grass'], resists: ['normal', 'fire', 'flying', 'poison'], immune_to: [] },
        ghost: { weak_to: ['ghost', 'dark'], resists: ['poison', 'bug'], immune_to: ['normal', 'fighting'] },
        dragon: { weak_to: ['ice', 'dragon', 'fairy'], resists: ['fire', 'water', 'electric', 'grass'], immune_to: [] },
        steel: { weak_to: ['fire', 'fighting', 'ground'], resists: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immune_to: ['poison'] },
        fairy: { weak_to: ['poison', 'steel'], resists: ['fighting', 'bug', 'dark'], immune_to: ['dragon'] },
        dark: { weak_to: ['fighting', 'bug', 'fairy'], resists: ['ghost', 'dark'], immune_to: ['psychic'] }
    };

    const pokemonCache = {};
    const typeEffectivenessCache = {};

    let allPokemonNames = [];
    const MAX_SUGGESTIONS_AUTOCOMPLETE = 10; // Renomeado para clareza
    let fetchTimeout;
    
    const pokemonSpeciesCache = {};
    const evolutionChainCache = {};

    async function fetchAllPokemonNames() {
        try {
            const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10000');
            const data = await response.json();
            allPokemonNames = data.results.map(p => p.name);
            console.log(`Carregou ${allPokemonNames.length} nomes de Pokémon.`);
        } catch (error) {
            console.error('Erro ao carregar lista de Pokémon:', error);
        }
    }

    fetchAllPokemonNames();

    pokemonInputs.forEach(item => {
        item.input.addEventListener('input', () => {
            clearTimeout(fetchTimeout);
            const inputValue = item.input.value.toLowerCase().trim();

            if (inputValue.length < 2) {
                item.suggestionsDiv.innerHTML = '';
                item.suggestionsDiv.classList.remove('show');
                return;
            }

            fetchTimeout = setTimeout(() => {
                const suggestions = allPokemonNames.filter(name =>
                    name.startsWith(inputValue)
                ).slice(0, MAX_SUGGESTIONS_AUTOCOMPLETE);

                displaySuggestions(suggestions, item.suggestionsDiv, item.input);
            }, 300);
        });

        item.input.addEventListener('blur', () => {
            setTimeout(() => {
                item.suggestionsDiv.classList.remove('show');
            }, 150);
        });

        item.input.addEventListener('focus', () => {
            const inputValue = item.input.value.toLowerCase().trim();
            if (inputValue.length >= 2 && item.suggestionsDiv.innerHTML !== '') {
                item.suggestionsDiv.classList.add('show');
            }
        });
    });

    function displaySuggestions(suggestions, suggestionsDiv, inputElement) {
        suggestionsDiv.innerHTML = '';
        if (suggestions.length === 0) {
            suggestionsDiv.classList.remove('show');
            return;
        }

        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
            suggestionItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
                inputElement.value = suggestion;
                suggestionsDiv.classList.remove('show');
            });
            suggestionsDiv.appendChild(suggestionItem);
        });
        suggestionsDiv.classList.add('show');
    }

    async function getTypeData(typeName) {
        if (typeEffectivenessCache[typeName]) {
            return typeEffectivenessCache[typeName];
        }
        const response = await fetch(`https://pokeapi.co/api/v2/type/${typeName}`);
        if (!response.ok) {
            console.error(`Falha ao carregar dados do tipo: ${typeName}`);
            return null;
        }
        const data = await response.json();
        typeEffectivenessCache[typeName] = data;
        return data;
    }

    function getPokemonEffectiveness(pokemonData, attackingTypeData) {
        let multiplier = 1;

        if (!pokemonData || !attackingTypeData) {
            return 1;
        }

        pokemonData.types.forEach(pokemonTypeInfo => {
            const defendingTypeName = pokemonTypeInfo.type.name;

            if (attackingTypeData.damage_relations.half_damage_to.some(rel => rel.name === defendingTypeName)) {
                multiplier *= 0.5;
            } else if (attackingTypeData.damage_relations.double_damage_to.some(rel => rel.name === defendingTypeName)) {
                multiplier *= 2;
            } else if (attackingTypeData.damage_relations.no_damage_to.some(rel => rel.name === defendingTypeName)) {
                multiplier *= 0;
            }
        });
        return multiplier;
    }

    async function getPokemonSpeciesData(pokemonName) {
        if (pokemonSpeciesCache[pokemonName]) {
            return pokemonSpeciesCache[pokemonName];
        }
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonName}`);
            if (!response.ok) return null;
            const data = await response.json();
            pokemonSpeciesCache[pokemonName] = data;
            return data;
        } catch (error) {
            console.error(`Erro ao buscar dados da espécie de ${pokemonName}:`, error);
            return null;
        }
    }

    async function getEvolutionChain(evolutionChainUrl) {
        if (evolutionChainCache[evolutionChainUrl]) {
            return evolutionChainCache[evolutionChainUrl];
        }
        try {
            const response = await fetch(evolutionChainUrl);
            if (!response.ok) return null;
            const data = await response.json();
            evolutionChainCache[evolutionChainUrl] = data;
            return data;
        } catch (error) {
            console.error(`Erro ao buscar cadeia de evolução de ${evolutionChainUrl}:`, error);
            return null;
        }
    }

    async function isFinalEvolution(pokemonName) {
        if (!allPokemonNames.includes(pokemonName)) {
            return false;
        }

        const speciesData = await getPokemonSpeciesData(pokemonName);
        if (!speciesData || !speciesData.evolution_chain || !speciesData.evolution_chain.url) {
            return true;
        }

        const evolutionChain = await getEvolutionChain(speciesData.evolution_chain.url);
        if (!evolutionChain) return false;

        let currentChain = evolutionChain.chain;
        let finalStageName = currentChain.species.name;

        while (currentChain.evolves_to && currentChain.evolves_to.length > 0) {
            currentChain = currentChain.evolves_to[0]; // Simplificação: pega o primeiro caminho
            finalStageName = currentChain.species.name;
        }
        
        return pokemonName === finalStageName;
    }

    // --- NOVO: Função para obter e sortear Pokémon ---
    async function suggestSpecificPokemon(suggestedTypes, currentPokemonNamesInTeam) {
        if (suggestedTypes.size === 0 || currentPokemonNamesInTeam.length === 6) {
            return []; // Não há tipos para sugerir ou time completo
        }

        const finalSuggestions = new Set();
        const POKEMONS_TO_LOAD_PER_TYPE = 15; // Aumentado para ter mais opções para sortear
        const POKEMONS_TO_SUGGEST_PER_TYPE = 3; // Quantos Pokémon sortear por tipo

        for (const type of suggestedTypes) {
            const potentialPokemonForType = [];
            const typeData = await getTypeData(type);
            if (!typeData || !typeData.pokemon) continue;

            let checkedCount = 0;
            // Percorre os Pokémon do tipo até encontrar um número suficiente ou acabar a lista
            for (const pokemonEntry of typeData.pokemon) {
                if (potentialPokemonForType.length >= POKEMONS_TO_LOAD_PER_TYPE) break;
                
                const pokemonName = pokemonEntry.pokemon.name;

                // Ignorar formas alternativas e Pokémon já no time
                if (pokemonName.includes('-')) continue; 
                if (currentPokemonNamesInTeam.includes(pokemonName)) continue;

                // Verificar se é estágio final (usando cache para otimizar)
                if (typeof pokemonCache[pokemonName] !== 'undefined' && pokemonCache[pokemonName].isFinal === true) {
                    potentialPokemonForType.push(pokemonName);
                    continue;
                } else if (typeof pokemonCache[pokemonName] !== 'undefined' && pokemonCache[pokemonName].isFinal === false) {
                     continue;
                }

                // Se não está no cache ou é a primeira vez verificando
                const isFinal = await isFinalEvolution(pokemonName);
                if (isFinal) {
                    potentialPokemonForType.push(pokemonName);
                    pokemonCache[pokemonName] = pokemonCache[pokemonName] || {};
                    pokemonCache[pokemonName].isFinal = true;
                } else {
                    pokemonCache[pokemonName] = pokemonCache[pokemonName] || {};
                    pokemonCache[pokemonName].isFinal = false;
                }
            }

            // Sortear 3 Pokémon desse tipo
            if (potentialPokemonForType.length > 0) {
                // Embaralha o array
                for (let i = potentialPokemonForType.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [potentialPokemonForType[i], potentialPokemonForType[j]] = [potentialPokemonForType[j], potentialPokemonForType[i]];
                }
                // Pega os 3 primeiros (ou menos se não houver 3)
                potentialPokemonForType.slice(0, POKEMONS_TO_SUGGEST_PER_TYPE).forEach(p => finalSuggestions.add(p));
            }
        }
        return Array.from(finalSuggestions);
    }
    // --- FIM NOVO: Função para obter e sortear Pokémon ---


    analyzeBtn.addEventListener('click', async () => {
        weaknessTableBody.innerHTML = ''; // Clear previous results
        teamAnalysisContent.innerHTML = '<p>Analisando equipe...</p>'; // Mensagem de carregamento

        const pokemonNames = pokemonInputs
            .map(item => item.input.value.toLowerCase().trim())
            .filter(name => name);

        const filledSlotsCount = pokemonNames.length;
        
        if (filledSlotsCount === 0) {
            alert('Por favor, insira pelo menos um nome de Pokémon.');
            teamAnalysisContent.innerHTML = '<p>Nenhuma análise disponível. Por favor, analise sua equipe de Pokémon primeiro.</p>';
            return;
        }

        const teamPokemonData = [];

        try {
            for (const name of pokemonNames) {
                let pokemonData = pokemonCache[name];
                if (!pokemonData || !pokemonData.types) {
                    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
                    if (!response.ok) {
                        alert(`Pokémon "${name}" não encontrado. Verifique a grafia.`);
                        continue;
                    }
                    pokemonData = await response.json();
                    pokemonCache[name] = pokemonData;
                }
                teamPokemonData.push(pokemonData);
            }

            if (teamPokemonData.length === 0) {
                 alert('Nenhum Pokémon válido foi encontrado para analisar.');
                 teamAnalysisContent.innerHTML = '<p>Nenhuma análise disponível. Por favor, analise sua equipe de Pokémon primeiro.</p>';
                 return;
            }

            const typeSummary = {};
            ALL_TYPES.forEach(type => {
                typeSummary[type] = {
                    immune: 0,
                    doubleResist: 0,
                    singleResist: 0,
                    singleWeak: 0,
                    doubleWeak: 0
                };
            });

            for (const attackingType of ALL_TYPES) {
                const attackingTypeData = await getTypeData(attackingType);
                if (!attackingTypeData) continue;

                for (const pokemon of teamPokemonData) {
                    const effectiveness = getPokemonEffectiveness(pokemon, attackingTypeData);

                    if (effectiveness === 0) {
                        typeSummary[attackingType].immune++;
                    } else if (effectiveness === 0.25) {
                        typeSummary[attackingType].doubleResist++;
                    } else if (effectiveness === 0.5) {
                        typeSummary[attackingType].singleResist++;
                    } else if (effectiveness === 2) {
                        typeSummary[attackingType].singleWeak++;
                    } else if (effectiveness >= 4) {
                        typeSummary[attackingType].doubleWeak++;
                    }
                }
            }
            
            ALL_TYPES.forEach(type => {
                const summary = typeSummary[type];
                const row = weaknessTableBody.insertRow();
                row.classList.add(`type-${type}`);

                const typeCell = row.insertCell();
                typeCell.textContent = type.charAt(0).toUpperCase() + type.slice(1);

                const immuneCell = row.insertCell();
                immuneCell.textContent = summary.immune > 0 ? `${summary.immune}` : '-';

                const doubleResistCell = row.insertCell();
                doubleResistCell.textContent = summary.doubleResist > 0 ? `${summary.doubleResist}` : '-';

                const singleResistCell = row.insertCell();
                singleResistCell.textContent = summary.singleResist > 0 ? `${summary.singleResist}` : '-';

                const singleWeakCell = row.insertCell();
                singleWeakCell.textContent = summary.singleWeak > 0 ? `${summary.singleWeak}` : '-';

                const doubleWeakCell = row.insertCell();
                doubleWeakCell.textContent = summary.doubleWeak > 0 ? `${summary.doubleWeak}` : '-';
            });

            let analysisHtml = '<h3>Resumo das Fraquezas:</h3>';
            const weakTypes = [];
            const doubleWeakTypes = [];

            ALL_TYPES.forEach(type => {
                if (typeSummary[type].doubleWeak > 0) {
                    doubleWeakTypes.push({ type: type, count: typeSummary[type].doubleWeak });
                } else if (typeSummary[type].singleWeak > 0) {
                    weakTypes.push({ type: type, count: typeSummary[type].singleWeak });
                }
            });

            doubleWeakTypes.sort((a, b) => b.count - a.count);
            weakTypes.sort((a, b) => b.count - a.count);

            const suggestedTypesForCoverage = new Set();

            if (doubleWeakTypes.length > 0) {
                analysisHtml += `<p>Sua equipe possui fraquezas **2x Super Efetivas (4x+)** contra os seguintes tipos (número de Pokémon vulneráveis):</p><ul>`;
                doubleWeakTypes.forEach(w => {
                    analysisHtml += `<li><span class="type-${w.type}">${w.type.charAt(0).toUpperCase() + w.type.slice(1)}</span>: ${w.count} Pokémon</li>`;
                    ALL_TYPES.forEach(typeToCheck => {
                        const interactions = TYPE_INTERACTIONS[typeToCheck];
                        if (interactions && (interactions.resists.includes(w.type) || interactions.immune_to.includes(w.type))) {
                            suggestedTypesForCoverage.add(typeToCheck);
                        }
                    });
                });
                analysisHtml += `</ul>`;
            }

            if (weakTypes.length > 0) {
                analysisHtml += `<p>Além disso, sua equipe possui fraquezas **Super Efetivas (2x)** contra os seguintes tipos (número de Pokémon vulneráveis):</p><ul>`;
                weakTypes.forEach(w => {
                    analysisHtml += `<li><span class="type-${w.type}">${w.type.charAt(0).toUpperCase() + w.type.slice(1)}</span>: ${w.count} Pokémon</li>`;
                     if (doubleWeakTypes.length === 0) {
                        ALL_TYPES.forEach(typeToCheck => {
                            const interactions = TYPE_INTERACTIONS[typeToCheck];
                            if (interactions && (interactions.resists.includes(w.type) || interactions.immune_to.includes(w.type))) {
                                suggestedTypesForCoverage.add(typeToCheck);
                            }
                        });
                    }
                });
                analysisHtml += `</ul>`;
            }

            if (doubleWeakTypes.length === 0 && weakTypes.length === 0) {
                analysisHtml += `<p>Parabéns! Sua equipe não possui grandes fraquezas (2x ou 4x+).</p>`;
            } else {
                analysisHtml += `<h3>Sugestões de Tipos para Cobrir Fraquezas:</h3>`;
                analysisHtml += `<p>Considerando suas maiores vulnerabilidades, procure Pokémon que sejam **resistentes ou imunes** aos tipos listados acima. Aqui estão alguns tipos que podem ajudar a cobrir suas fraquezas:</p><ul>`;
                
                if (suggestedTypesForCoverage.size > 0) {
                    suggestedTypesForCoverage.forEach(type => {
                        analysisHtml += `<li><span class="type-${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</span></li>`;
                    });
                } else {
                    analysisHtml += `<li>Nenhuma sugestão de tipo específica baseada nas fraquezas encontradas.</li>`;
                }
                analysisHtml += `</ul>`;
            }

            // --- Sugestão de Pokémon Específicos de Último Estágio (Modificado) ---
            const emptySlots = 6 - filledSlotsCount;
            if (emptySlots > 0 && suggestedTypesForCoverage.size > 0) {
                analysisHtml += `<h3>Sugestões de Pokémon para Preencher ${emptySlots} Slot${emptySlots > 1 ? 's' : ''}:</h3>`;
                analysisHtml += `<p>Para complementar sua equipe, considere adicionar um dos seguintes Pokémon (último estágio evolutivo), baseados nos tipos sugeridos:</p><ul>`;
                
                const suggestedPokemon = await suggestSpecificPokemon(suggestedTypesForCoverage, pokemonNames); // Passa os nomes já no time

                if (suggestedPokemon.length > 0) {
                    suggestedPokemon.forEach(pName => {
                        analysisHtml += `<li>${pName.charAt(0).toUpperCase() + pName.slice(1)}</li>`;
                    });
                } else {
                    analysisHtml += `<li>Não foi possível encontrar sugestões de Pokémon de último estágio com os tipos desejados.</li>`;
                }
                analysisHtml += `</ul>`;
            } else if (emptySlots > 0) {
                 analysisHtml += `<h3>${emptySlots} Slot${emptySlots > 1 ? 's' : ''} Vazio${emptySlots > 1 ? 's' : ''}:</h3>`;
                 analysisHtml += `<p>Sua equipe tem slots vazios. Complete-a para uma análise mais robusta!</p>`;
            }

            teamAnalysisContent.innerHTML = analysisHtml;

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            alert('Ocorreu um erro ao buscar os dados dos Pokémon. Tente novamente mais tarde.');
            teamAnalysisContent.innerHTML = '<p>Erro ao carregar análise.</p>';
        }
    });
});