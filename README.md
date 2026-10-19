# Pokoach

## Executar localmente

Requer **Node.js 22.13+** (usa `node:sqlite` nativo; sem dependências npm).

```bash
npm start
```

Acesse **http://127.0.0.1:3000** (não abra o HTML com `file://`).

- Cadastro: `POST /api/register` (`username`, `password`, `ingameName`).
- Login: `POST /api/login` (`username`, `password`).
- Sessão: `GET /api/me`.
- Logout: `POST /api/logout`.

O banco SQLite é criado automaticamente em `server/data/users.sqlite` e não deve ser versionado.
As senhas são armazenadas com scrypt e salt aleatório; sessões usam cookies HttpOnly, SameSite=Strict.

**Produção:** use HTTPS e `COOKIE_SECURE=true`, configure proxy reverso, limite tentativas de login, adicione recuperação de senha e proteção adicional contra abuso. Este é um backend inicial para desenvolvimento local.

## Meus times

Após entrar, a página **Times** lista as equipes salvas. Clique em **Criar novo time** para nomear uma equipe e abrir `team-editor.html?id=...`.
No editor, adicione até seis Pokémon, escolha habilidades e quatro movimentos, e use **Salvar time** ou **← Meus times**. Alterações também são salvas automaticamente após 700 ms de inatividade.

O banco SQLite agora possui a tabela `teams`, com `user_id`, nome e JSON contendo Pokémon, habilidades e movimentos. As rotas autenticadas são `GET /api/teams`, `GET /api/teams/:id`, `POST /api/teams` e `POST /api/teams/:id` (atualização ou `{ "action": "delete" }`).

**Nota:** a saída por links internos aguarda a gravação; o fechamento abrupto da aba ou a perda de conexão pode impedir o último salvamento. Verifique a indicação de salvamento no editor antes de fechar.
