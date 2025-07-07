// planning/planutilsClient.js
import fetch from 'node-fetch';

/**
 * Request a PDDL plan from a Planutils-compatible server.
 * @param {Object} params
 * @param {string} params.domain - PDDL domain string
 * @param {string} params.problem - PDDL problem string
 * @param {string} params.serverUrl - Base URL of the Planutils server (e.g., "http://localhost:5001")
 * @returns {Promise<Object>} - Result object from the server (including plan, status, and debug info)
 */
export async function requestPlanutilsPlan({ domain, problem, serverUrl }) {
  const solveUrl = `${serverUrl}/package/lama-first/solve`;

  // 1. Submit job
  const res = await fetch(solveUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, problem }),
  });
  const job = await res.json();

  // 2. Poll for result
  const pollUrl = serverUrl + job.result;
  let result;
  while (true) {
    await new Promise(r => setTimeout(r, 1000));
    const pollRes = await fetch(pollUrl, { method: 'POST' });
    result = await pollRes.json();
    if (result.status !== 'PENDING') break;
  }
  return result;
}