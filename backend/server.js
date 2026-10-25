import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('./data.json', import.meta.url));
const exampleDataPath = fileURLToPath(new URL('./data.example.json', import.meta.url));
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
loadLocalEnvironment();
const port = Number(process.env.API_PORT || 4000);
const categories = new Set(['Food & essentials', 'Transportation', 'Home support', 'Wellbeing', 'Other']);
const urgencies = new Set(['Today', 'This week', 'Flexible']);
let stateCollection = null;
let pendingWrite = Promise.resolve();

function loadLocalEnvironment() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function readLocalData() {
  if (!existsSync(dataPath)) {
    writeFileSync(dataPath, readFileSync(exampleDataPath, 'utf8'), 'utf8');
  }
  return JSON.parse(readFileSync(dataPath, 'utf8'));
}

function saveLocalData(data) {
  writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function getData() {
  if (!stateCollection) return readLocalData();
  await pendingWrite;
  const document = await stateCollection.findOne({ _id: 'dashboard' });
  if (!document) throw new Error('MongoDB demo data is missing. Restart the API to initialize it.');
  const { _id, ...data } = document;
  return data;
}

async function updateData(update) {
  if (!stateCollection) {
    const data = readLocalData();
    const result = update(data);
    saveLocalData(data);
    return result;
  }
  const operation = pendingWrite.then(async () => {
    const document = await stateCollection.findOne({ _id: 'dashboard' });
    if (!document) throw new Error('MongoDB demo data is missing. Restart the API to initialize it.');
    const { _id, ...data } = document;
    const result = update(data);
    await stateCollection.replaceOne({ _id: 'dashboard' }, { _id: 'dashboard', ...data });
    return result;
  });
  pendingWrite = operation.then(() => undefined, () => undefined);
  return operation;
}

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  const { MongoClient, ServerApiVersion } = await import('mongodb');
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  await client.connect();
  await client.db('admin').command({ ping: 1 });
  const database = client.db(process.env.MONGODB_DB_NAME || 'lifelink360');
  stateCollection = database.collection('appState');
  if (!await stateCollection.findOne({ _id: 'dashboard' })) {
    const seed = JSON.parse(readFileSync(exampleDataPath, 'utf8'));
    await stateCollection.insertOne({ _id: 'dashboard', ...seed });
  }
  return true;
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
      return send(res, 200, { ok: true, service: 'LifeLink 360 demo API', storage: stateCollection ? 'mongodb' : 'json' });
    }
    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const data = await getData();
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
      const result = await updateData(data => {
        const request = {
          id: `LL-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          title: title.trim(), category, location: location.trim(), time: 'Posted just now', people: 0,
          urgency, icon: '💛', color: 'mint', details: details.trim(), offeredBy: [],
        };
        data.requests.unshift(request);
        data.stats.openRequests += 1;
        return { request: presentRequest(request), stats: data.stats };
      });
      return send(res, 201, result);
    }
    const offerMatch = req.method === 'POST' && url.pathname.match(/^\/api\/requests\/([^/]+)\/offers$/);
    if (offerMatch) {
      const { participantId } = await readBody(req);
      if (!validParticipantId(participantId)) return send(res, 400, { error: 'A demo participant ID is required.' });
      const result = await updateData(data => {
        const item = data.requests.find(request => request.id === decodeURIComponent(offerMatch[1]));
        if (!item) return { notFound: true };
        item.offeredBy ??= [];
        const alreadyOffered = item.offeredBy.includes(participantId);
        if (!alreadyOffered) {
          item.offeredBy.push(participantId);
          item.people += 1;
          data.stats.actsOfKindness += 1;
        }
        return { request: presentRequest(item), alreadyOffered, stats: data.stats };
      });
      if (result.notFound) return send(res, 404, { error: 'That request could not be found.' });
      return send(res, 200, result);
    }
    const joinMatch = req.method === 'POST' && url.pathname.match(/^\/api\/missions\/([^/]+)\/join$/);
    if (joinMatch) {
      const { participantId } = await readBody(req);
      if (!validParticipantId(participantId)) return send(res, 400, { error: 'A demo participant ID is required.' });
      const result = await updateData(data => {
        const mission = data.missions.find(item => item.slug === decodeURIComponent(joinMatch[1]));
        if (!mission) return { notFound: true };
        mission.participants ??= [];
        const alreadyJoined = mission.participants.includes(participantId);
        if (!alreadyJoined && mission.joined < mission.goal) {
          mission.participants.push(participantId);
          mission.joined += 1;
          data.stats.activeVolunteers += 1;
          data.stats.actsOfKindness += 1;
        }
        return { mission: { ...mission, joinedByMe: mission.participants.includes(participantId) }, alreadyJoined, stats: data.stats };
      });
      if (result.notFound) return send(res, 404, { error: 'That mission could not be found.' });
      return send(res, 200, result);
    }
    return send(res, 404, { error: 'No demo API route matches this address.' });
  } catch (error) {
    if (error.status) return send(res, error.status, { error: error.message });
    console.error(error);
    return send(res, 500, { error: 'The demo API could not complete that action.' });
  }
});

connectMongoDB().then(usingMongoDB => {
  server.listen(port, () => {
    const storage = usingMongoDB ? 'MongoDB' : 'local JSON';
    console.log(`LifeLink 360 API listening at http://localhost:${port} (${storage} storage)`);
  });
}).catch(error => {
  const safeMessage = process.env.MONGODB_URI ? error.message.replaceAll(process.env.MONGODB_URI, '[redacted MongoDB URI]') : error.message;
  console.error(`LifeLink 360 could not connect to MongoDB: ${safeMessage}`);
  process.exitCode = 1;
});
