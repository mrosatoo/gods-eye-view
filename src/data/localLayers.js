import { localGeoJsonServices } from './localGeojson.js';
import { createInfrastructureLayers } from './infrastructure.js';
import { createFirmsHeatmapLayer } from './firmsHeatmap.js';
import submarineCablesLayer from './telegeographySubmarineCables.js';

const [datacenters, dams] = createInfrastructureLayers(localGeoJsonServices);

// NASA FIRMS detections (VIIRS ×3 NRT via the /api/firms proxy). The id keeps
// the historical `local-` prefix for persistence + voice-tool-enum compat,
// but the data is NOT bundled anymore — it needs FIRMS_MAP_KEY server-side.
const fires = createFirmsHeatmapLayer({
  id: 'local-firms',
  name: 'FIRMS NRT Detections',
  icon: '▲',
  source: 'NASA FIRMS · VIIRS NRT',
});

export default [
  datacenters,
  dams,
  submarineCablesLayer,
  fires,
];
