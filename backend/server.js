import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.API_PORT || 4000);
const dataPath = fileURLToPath(new URL('./data.json', import.meta.url));
const exampleDataPath = fileURLToPath(new URL('./data.example.json', import.meta.url));
const categories = new Set(['Food & essentials', 'Transportation', 'Home support', 'Wellbeing', 'Other']);
const urgencies = new Set(['Today', 'This week', 'Flexible']);

function readData() {
  if (!existsSync(dataPath)) {
    writeFileSync(dataPath, readFileSync(exampleDataPath, 'utf8'), 'utf8');
  }
  return JSON.parse(readFileSync(dataPath, 'utf8'));
}

function saveData(data) {
  writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function presentRequest(item) {
  const { id, title, category, location, distance, time, people, urgency, icon, color } = item;
  return { id, title, category, place: `${location} · ${distance || 'nearby'}`, time, people, urgency, icon, color };
}

function validParticipantId(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 100;
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16_384) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, { ok: true, service: 'LifeLink 360 demo API' });
    }
    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const data = readData();
      const id = url.searchParams.get('participantId');
      const missions = data.missions.map(({ participants = [], ...mission }) => ({
        ...mission,
        joinedByMe: validParticipantId(id) && participants.includes(id),
      }));
      return send(res, 200, { stats: data.stats, requests: data.requests.map(presentRequest), missions });
    }
    if (req.method === 'POST' && url.pathname === '/api/requests') {
      const { title, category, location, urgency, details, contact } = await readBody(req);
      const errors = {};
      if (typeof title !== 'string' || title.trim().length < 6 || title.trim().length > 80) errors.title = 'Title must be 6–80 characters.';
      if (!categories.has(category)) errors.category = 'Choose a valid support category.';
      if (typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 60) errors.location = 'Location must be 2–60 characters.';
      if (!urgencies.has(urgency)) errors.urgency = 'Choose a valid time frame.';
      if (typeof details !== 'string' || details.trim().length < 12 || details.trim().length > 400) errors.details = 'Details must be 12–400 characters.';
      if (typeof contact !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) errors.contact = 'Enter a valid email address.';
      if (Object.keys(errors).length) return send(res, 400, { error: 'Please correct the request fields.', fields: errors });
      const data = readData();
      const request = {
        id: `LL-${2050 + data.requests.length}`,
        title: title.trim(), category, location: location.trim(), time: 'Posted just now', people: 0,
        urgency, icon: '💛', color: 'mint', details: details.trim(), offeredBy: [],
      };
      data.requests.unshift(request);
      data.stats.openRequests += 1;
      saveData(data);
      return send(res, 201, { request: presentRequest(request), stats: data.stats });
    }
    const offerMatch = req.method === 'POST' && url.pathname.match(/^\/api\/requests\/([^/]+)\/offers$/);
    if (offerMatch) {
      const { participantId } = await readBody(req);
      if (!validParticipantId(participantId)) return send(res, 400, { error: 'A demo participant ID is required.' });
      const data = readData();
      const item = data.requests.find(request => request.id === decodeURIComponent(offerMatch[1]));
      if (!item) return send(res, 404, { error: 'That request could not be found.' });
      item.offeredBy ??= [];
      const alreadyOffered = item.offeredBy.includes(participantId);
      if (!alreadyOffered) {
        item.offeredBy.push(participantId);
        item.people += 1;
        data.stats.actsOfKindness += 1;
        saveData(data);
      }
      return send(res, 200, { request: presentRequest(item), alreadyOffered, stats: data.stats });
    }
    const joinMatch = req.method === 'POST' && url.pathname.match(/^\/api\/missions\/([^/]+)\/join$/);
    if (joinMatch) {
      const { participantId } = await readBody(req);
      if (!validParticipantId(participantId)) return send(res, 400, { error: 'A demo participant ID is required.' });
      const data = readData();
      const mission = data.missions.find(item => item.slug === decodeURIComponent(joinMatch[1]));
      if (!mission) return send(res, 404, { error: 'That mission could not be found.' });
      mission.participants ??= [];
      const alreadyJoined = mission.participants.includes(participantId);
      if (!alreadyJoined && mission.joined < mission.goal) {
        mission.participants.push(participantId);
        mission.joined += 1;
        data.stats.activeVolunteers += 1;
        data.stats.actsOfKindness += 1;
        saveData(data);
      }
      return send(res, 200, { mission: { ...mission, joinedByMe: !alreadyJoined }, alreadyJoined, stats: data.stats });
    }
    return send(res, 404, { error: 'No demo API route matches this address.' });
  } catch (error) {
    if (error.status) return send(res, error.status, { error: error.message });
    console.error(error);
    return send(res, 500, { error: 'The demo API could not complete that action.' });
  }
});

server.listen(port, () => console.log(`LifeLink 360 API listening at http://localhost:${port}`));
