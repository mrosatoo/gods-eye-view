import test from 'node:test';
import assert from 'node:assert/strict';
import { researchAdmissionGate, PENDING_RESEARCH_ROUTES } from '../../server/providers/researchAdmission.js';

for (const hook of ['configureServer', 'configurePreviewServer']) {
  test(`MF-11 prevents unadmitted upstream requests in ${hook}`, (t) => {
    t.mock.method(globalThis, 'fetch', () => { throw Error('must not contact upstream'); });
    const routes = new Map();
    researchAdmissionGate()[hook]({ middlewares: { use: (route, handler) => routes.set(route, handler) } });
    for (const route of PENDING_RESEARCH_ROUTES) {
      const response = {
        writeHead(status, headers) { this.status = status; this.headers = headers; },
        end(body) { this.body = JSON.parse(body); },
      };
      routes.get(route)({ url: '/?latitude=26&longitude=56' }, response);
      assert.equal(response.status, 503);
      assert.equal(response.body.error, 'source_admission_pending');
      assert.equal(response.body.observedAt, null);
      assert.equal(response.body.fetchedAt, null);
    }
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });
}
