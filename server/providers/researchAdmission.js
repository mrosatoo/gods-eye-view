/** MF-11: keyless access alone does not admit a source for this desk's use.
 * Remove an entry only alongside reviewed terms, schema, export and fixture
 * evidence. Keep this middleware ahead of the conditional source proxies.
 */
export const PENDING_RESEARCH_ROUTES = Object.freeze([
  '/api/gdacs', '/api/emsc', '/api/nws-alerts', '/api/marine-weather',
]);

export function researchAdmissionGate() {
  const install = (server) => {
    for (const route of PENDING_RESEARCH_ROUTES) {
      server.middlewares.use(route, (_req, res) => {
        res.writeHead(503, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify({
          status: 'unavailable',
          error: 'source_admission_pending',
          reason: 'MF-11 intended-use terms, schema and sample/export evidence pending',
          observedAt: null,
          fetchedAt: null,
        }));
      });
    }
  };
  return {
    name: 'research-admission-gate',
    configureServer: install,
    configurePreviewServer: install,
  };
}
