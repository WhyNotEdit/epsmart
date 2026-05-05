// EP Route Ops — Cloud sync API
// GET  /api/state            → returns full state object
// POST /api/state            → replaces full state object
// POST /api/state/complete   → marks a single store complete (atomic)
// POST /api/state/uncomplete → un-marks a store
// POST /api/state/emergency  → applies an emergency reschedule

import { kv } from '@vercel/kv';

const STATE_KEY = 'ep:state:v1';

// CORS headers (in case we ever serve this from a different origin)
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const state = (await kv.get(STATE_KEY)) || { cycleData: {}, updatedAt: null };
      return res.status(200).json(state);
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

      // Full replace (used by Reset Cycle, Export sync, etc.)
      if (!action || action === 'replace') {
        const next = {
          cycleData: payload?.cycleData || {},
          updatedAt: new Date().toISOString(),
          updatedBy: payload?.updatedBy || 'unknown',
        };
        await kv.set(STATE_KEY, next);
        return res.status(200).json(next);
      }

      // Atomic actions — read current state, mutate, write back
      const current = (await kv.get(STATE_KEY)) || { cycleData: {} };

      if (action === 'complete') {
        const { cycleId, unit, date, notes, who } = payload;
        if (!current.cycleData[cycleId]) {
          return res.status(400).json({ error: 'Cycle not initialized' });
        }
        current.cycleData[cycleId].completions = current.cycleData[cycleId].completions || {};
        current.cycleData[cycleId].completions[unit] = {
          date,
          notes: notes || '',
          completedAt: new Date().toISOString(),
          completedBy: who || 'unknown',
        };
      } else if (action === 'uncomplete') {
        const { cycleId, unit } = payload;
        if (current.cycleData[cycleId]?.completions) {
          delete current.cycleData[cycleId].completions[unit];
        }
      } else if (action === 'ensureCycle') {
        // Initialize a cycle if it doesn't exist (client sends fresh schedule)
        const { cycleId, schedule, route } = payload;
        if (!current.cycleData[cycleId]) {
          current.cycleData[cycleId] = {
            schedule,
            route,
            completions: {},
            emergencies: {},
          };
        }
      } else if (action === 'emergency') {
        const { cycleId, unit, originalDate, newDate, notes, who, scheduleUpdate } = payload;
        if (!current.cycleData[cycleId]) {
          return res.status(400).json({ error: 'Cycle not initialized' });
        }
        current.cycleData[cycleId].schedule = scheduleUpdate;
        current.cycleData[cycleId].emergencies = current.cycleData[cycleId].emergencies || {};
        current.cycleData[cycleId].emergencies[unit] = {
          originalDate,
          newDate,
          notes: notes || '',
          requestedAt: new Date().toISOString(),
          requestedBy: who || 'unknown',
        };
      } else if (action === 'resetCycle') {
        const { cycleId } = payload;
        delete current.cycleData[cycleId];
      } else {
        return res.status(400).json({ error: 'Unknown action: ' + action });
      }

      current.updatedAt = new Date().toISOString();
      current.updatedBy = payload.who || 'unknown';
      await kv.set(STATE_KEY, current);
      return res.status(200).json(current);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
