'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, 'data', 'users.sqlite'));
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 ingame_name TEXT NOT NULL DEFAULT '',
 password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id),
 expires_at INTEGER NOT NULL
);`);
db.exec(`CREATE TABLE IF NOT EXISTS teams (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id),
 name TEXT NOT NULL,
 pokemon_json TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(user_id);`);
const TTL = 7 * 24 * 60 * 60 * 1000;
const privatePages = new Set(['/teambuild.html', '/analysis.html', '/calculator.html', '/team-editor.html']);
const allowed = new Set(['.html','.css','.js','.png','.jpg','.jpeg','.svg','.webp','.ico']);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function derive(password, salt = crypto.randomBytes(16).toString('hex')) {
 return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verify(password, stored) {
 const [algorithm,salt,key] = stored.split(':');
 if (algorithm !== 'scrypt' || !salt || !key) return false;
 const candidate = crypto.scryptSync(password, salt, 64);
 const expected = Buffer.from(key, 'hex');
 return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
function json(res, status, data) {
 res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(data));
}
function getSession(req) {
 const token = /(?:^|;\s*)pokoach_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
 if (!token) return null;
 const row = db.prepare('SELECT users.id,users.username,users.ingame_name FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').get(hash(token), Date.now());
 return row || null;
}
function setCookie(res, token, age) {
 const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
 res.setHeader('Set-Cookie', `pokoach_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure}`);
}
async function body(req) {
 let raw = '';
 for await (const chunk of req) {
  raw += chunk;
  if (raw.length > 8192) throw new Error('BODY_TOO_LARGE');
 }
 return JSON.parse(raw || '{}');
}
function sameOrigin(req) {
 const origin = req.headers.origin;
 if (!origin) return false;
 try { return new URL(origin).host === req.headers.host && ['http:','https:'].includes(new URL(origin).protocol); }
 catch { return false; }
}
async function handler(req,res) {
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','same-origin');
 const pathname = new URL(req.url,'http://localhost').pathname;
 if (pathname.startsWith('/api/')) {
  if (req.method === 'GET' && pathname === '/api/me') {
   const user = getSession(req);
   return user ? json(res,200,{user}) : json(res,401,{error:'Não autenticado.'});
  }
  // Cada operação de equipe é limitada ao usuário autenticado.
  if (pathname === '/api/teams' || /^\/api\/teams\/\d+$/.test(pathname)) {
   const user = getSession(req);
   if (!user) return json(res,401,{error:'Faça login para acessar seus times.'});
   const match = /^\/api\/teams\/(\d+)$/.exec(pathname);
   const id = match ? Number(match[1]) : null;
   const selectTeam = () => db.prepare('SELECT id,name,pokemon_json,created_at,updated_at FROM teams WHERE id=? AND user_id=?').get(id,user.id);
   const serialize = row => ({id:row.id,name:row.name,pokemon:JSON.parse(row.pokemon_json),created_at:row.created_at,updated_at:row.updated_at});
   if (req.method === 'GET') {
    if (id !== null) {
     const row = selectTeam();
     return row ? json(res,200,{team:serialize(row)}) : json(res,404,{error:'Time não encontrado.'});
    }
    const rows = db.prepare('SELECT id,name,pokemon_json,created_at,updated_at FROM teams WHERE user_id=? ORDER BY updated_at DESC,id DESC').all(user.id);
    return json(res,200,{teams:rows.map(serialize)});
   }
   if (req.method !== 'POST' || !sameOrigin(req)) return json(res,403,{error:'Requisição não permitida.'});
   let data;
   try { data = await body(req); } catch { return json(res,400,{error:'Dados inválidos ou muito grandes.'}); }
   if (id !== null && !selectTeam()) return json(res,404,{error:'Time não encontrado.'});
   if (data.action === 'delete' && id !== null) {
    db.prepare('DELETE FROM teams WHERE id=? AND user_id=?').run(id,user.id);
    return json(res,200,{message:'Time excluído.'});
   }
   const name = typeof data.name === 'string' ? data.name.trim() : '';
   if (!name || name.length > 60) return json(res,400,{error:'Nome do time deve ter de 1 a 60 caracteres.'});
   const pokemon = data.pokemon === undefined && id === null ? [] : data.pokemon;
   if (!Array.isArray(pokemon) || pokemon.length > 6 || !pokemon.every(slot =>
    slot && typeof slot === 'object' && !Array.isArray(slot) &&
    typeof slot.name === 'string' && slot.name.length <= 80 &&
    typeof slot.ability === 'string' && slot.ability.length <= 80 &&
    Array.isArray(slot.moves) && slot.moves.length <= 4 &&
    slot.moves.every(move => typeof move === 'string' && move.length <= 80))) {
    return json(res,400,{error:'Equipe inválida: limite de 6 Pokémon e 4 golpes por Pokémon.'});
   }
   const cleaned = pokemon.map(slot => ({name:slot.name.trim().toLowerCase(),ability:slot.ability,moves:slot.moves}));
   if (id === null) {
    const result = db.prepare('INSERT INTO teams(user_id,name,pokemon_json) VALUES(?,?,?)').run(user.id,name,JSON.stringify(cleaned));
    const row = db.prepare('SELECT id,name,pokemon_json,created_at,updated_at FROM teams WHERE id=?').get(result.lastInsertRowid);
    return json(res,201,{team:serialize(row)});
   }
   db.prepare('UPDATE teams SET name=?,pokemon_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').run(name,JSON.stringify(cleaned),id,user.id);
   return json(res,200,{team:serialize(selectTeam())});
  }
  if (req.method !== 'POST') return json(res,405,{error:'Método não permitido.'});
  if (!sameOrigin(req)) return json(res,403,{error:'Origem não permitida.'});
  let data;
  try { data = await body(req); } catch { return json(res,400,{error:'JSON inválido ou muito grande.'}); }
  if (pathname === '/api/register') {
   const username = typeof data.username === 'string' ? data.username.trim() : '';
   const password = data.password;
   const ingameName = typeof data.ingameName === 'string' ? data.ingameName.trim() : '';
   if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return json(res,400,{error:'Usuário deve ter 3 a 24 caracteres (letras, números ou _).'});
   if (typeof password !== 'string' || password.length < 8 || password.length > 128) return json(res,400,{error:'Senha deve ter entre 8 e 128 caracteres.'});
   if (ingameName.length > 40) return json(res,400,{error:'Nome no jogo muito longo.'});
   if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) return json(res,409,{error:'Esse usuário já existe.'});
   try {
    db.prepare('INSERT INTO users(username,ingame_name,password_hash) VALUES(?,?,?)').run(username,ingameName,derive(password));
    return json(res,201,{message:'Conta criada com sucesso.'});
   } catch { return json(res,409,{error:'Esse usuário já existe.'}); }
  }
  if (pathname === '/api/login') {
   const username = typeof data.username === 'string' ? data.username.trim() : '';
   const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
   if (!user || typeof data.password !== 'string' || !verify(data.password,user.password_hash))
    return json(res,401,{error:'Usuário ou senha inválidos.'});
   const token = crypto.randomBytes(32).toString('hex');
   db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(hash(token),user.id,Date.now()+TTL);
   setCookie(res,token,TTL/1000);
   return json(res,200,{user:{id:user.id,username:user.username,ingame_name:user.ingame_name}});
  }
  if (pathname === '/api/logout') {
   const token = /(?:^|;\s*)pokoach_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
   if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
   setCookie(res,'',0);
   return json(res,200,{message:'Sessão encerrada.'});
  }
  return json(res,404,{error:'Rota não encontrada.'});
 }
 if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Método não permitido.'});
 const filePath = pathname === '/' ? '/index.html' : pathname;
 if (privatePages.has(filePath) && !getSession(req)) {
  res.writeHead(302,{Location:'/index.html'}); return res.end();
 }
 let decoded;
 try { decoded = decodeURIComponent(filePath); } catch { return json(res,400,{error:'Caminho inválido.'}); }
 const full = path.resolve(ROOT, '.' + decoded);
 if (!full.startsWith(ROOT + path.sep) || full.startsWith(path.join(ROOT, 'server') + path.sep) || !allowed.has(path.extname(full).toLowerCase())) return json(res,404,{error:'Não encontrado.'});
 fs.stat(full,(err,stat) => {
  if (err || !stat.isFile()) return json(res,404,{error:'Não encontrado.'});
  res.writeHead(200,{'Content-Type':mime[path.extname(full).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-store'});
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(full).pipe(res);
 });
}
const server = http.createServer((req,res) => {
 Promise.resolve(handler(req,res)).catch(err => {console.error(err); if (!res.headersSent) json(res,500,{error:'Erro interno.'}); else res.end();});
});
if (require.main === module) server.listen(PORT,HOST,()=>console.log(`Pokoach em http://${HOST}:${PORT}`));
module.exports = {server,db};
