import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createQuote, validateSubmission } from './quotes.mjs';

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

export function createApiServer() {
  return createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    try {
      if (path === '/api/policies' && request.method === 'GET') {
        const policies = JSON.parse(await readFile(new URL('../public/policies.json', import.meta.url), 'utf8'));
        return sendJson(response, 200, policies);
      }
      if (path === '/api/quotes' && request.method === 'POST') {
        if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
          return sendJson(response, 415, { message: 'Send the submission as application/json.' });
        }
        const chunks = [];
        let bytes = 0;
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 8192) return sendJson(response, 413, { message: 'Submission is too large.' });
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { return sendJson(response, 400, { message: 'Request body must be valid JSON.' }); }
        const fieldErrors = validateSubmission(input);
        if (Object.keys(fieldErrors).length) {
          return sendJson(response, 422, { message: 'Please check your submission.', fieldErrors });
        }
        return sendJson(response, 201, createQuote(input));
      }
      if (path === '/api/policies' || path === '/api/quotes') {
        response.setHeader('Allow', path === '/api/policies' ? 'GET' : 'POST');
        return sendJson(response, 405, { message: 'Method not allowed.' });
      }
      sendJson(response, 404, { message: 'Endpoint not found.' });
    } catch {
      if (!response.headersSent) sendJson(response, 500, { message: 'Unable to process the request.' });
    }
  });
}
