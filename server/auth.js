import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { one, run, now, token } from './db.js';

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSession(userId) {
  const t = token(32);
  run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', t, userId, now());
  return t;
}

export function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const t = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = t && one(`SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`, t);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  req.token = t;
  next();
}

const ROLE_RANK = { viewer: 0, editor: 1, admin: 2, owner: 3 };

export function memberRole(workspaceId, userId) {
  return one('SELECT role FROM members WHERE workspace_id = ? AND user_id = ?', workspaceId, userId)?.role;
}

// Resolves the workspace for :wid or the agent for :aid and checks the caller's role.
export function requireRole(min = 'viewer') {
  return (req, res, next) => {
    let wid = req.params.wid;
    if (req.params.aid) {
      const agent = one('SELECT * FROM agents WHERE id = ?', req.params.aid);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      req.agent = agent;
      wid = agent.workspace_id;
    }
    const role = memberRole(wid, req.user.id);
    if (!role) return res.status(404).json({ error: 'Workspace not found' });
    if (ROLE_RANK[role] < ROLE_RANK[min]) return res.status(403).json({ error: `Requires ${min} role` });
    req.role = role;
    req.workspaceId = wid;
    next();
  };
}
