import { DataLayerManager } from '../data/manager.js';
import { LAYER_STATE_REGISTRY, LAYER_STATE_STORAGE_KEY, parseStoredLayerState } from '../data/layerState.js';
import { THESIS_LAYER_DEFAULTS } from '../thesisDefaults.js';
import { createChokeDensityHud } from '../ui/chokeDensityHud.js';

// Thesis layers — loaded eagerly for fast boot.
import flightsLayer from '../data/flights.js';
import earthquakesLayer from '../data/earthquakes.js';
import satellitesLayer from '../data/satellites.js';
import aisLiveVesselsLayer from '../data/aisLiveVessels.js';
import portWatchOverlay from '../data/portWatchOverlay.js';

const THESIS_IDS = new Set(
  Object.entries(THESIS_LAYER_DEFAULTS).filter(([, v]) => v).map(([k]) => k),
);
const BOOT_DEFERRED_IDS = new Set(['local-firms']);
const EAGER_THESIS_REGISTRY = LAYER_STATE_REGISTRY.filter(
  (e) => THESIS_IDS.has(e.id) && !BOOT_DEFERRED_IDS.has(e.id),
);
const DEFERRED_REGISTRY = LAYER_STATE_REGISTRY.filter(
  (e) => !THESIS_IDS.has(e.id) || BOOT_DEFERRED_IDS.has(e.id),
);

/** Register the standalone layer catalog before allowing state restoration. */
export function createStandaloneData({
  scene: { viewer },
  controls: { styleManager },
  allowQaRegistration,
  defer,
}) {
  // Initialize data layer manager
  const dataManager = new DataLayerManager(viewer, {
    allowQaRegistration,
  });
  defer(async () => {
    await dataManager.destroyAll();
    if (dataManager.layers.size)
      throw new Error(
        `Data layers could not be destroyed: ${[...dataManager.layers.keys()].join(', ')}`,
      );
  });

  // Phase 1: thesis layers — registered and finalized eagerly.
  dataManager.register(flightsLayer);
  dataManager.register(earthquakesLayer);
  dataManager.register(satellitesLayer);
  dataManager.register(aisLiveVesselsLayer);
  dataManager.register(portWatchOverlay);
  dataManager.finalizeRegistrations(EAGER_THESIS_REGISTRY);

  // Phase 2: non-thesis layers — deferred until after first paint.
  let deferredAborted = false;
  const deferredBoot = scheduleDeferredLayers(dataManager, () => deferredAborted);
  defer(() => { deferredAborted = true; });

  if (allowQaRegistration) {
    window.__gevQaRegisterLayer = (targetManager, layerModule) => {
      if (targetManager !== dataManager)
        throw new Error('QA layer manager mismatch');
      return dataManager.registerForQa(layerModule);
    };
    window.__gevQaUnregisterLayer = (targetManager, layerId) => {
      if (targetManager !== dataManager)
        throw new Error('QA layer manager mismatch');
      return dataManager.unregisterForQa(layerId);
    };
    const register = window.__gevQaRegisterLayer;
    const unregister = window.__gevQaUnregisterLayer;
    defer(() => {
      if (window.__gevQaRegisterLayer === register)
        delete window.__gevQaRegisterLayer;
      if (window.__gevQaUnregisterLayer === unregister)
        delete window.__gevQaUnregisterLayer;
    });
  }
  dataManager.buildTogglePanel(document.getElementById('data-toggles'));
  styleManager.attachDataManager(dataManager);

  const chokeDensityHost = document.getElementById('choke-density-hud');
  let chokeDensityHud = null;
  if (chokeDensityHost) {
    chokeDensityHud = createChokeDensityHud({
      aisLayer: aisLiveVesselsLayer,
      host: chokeDensityHost,
    });
    defer(() => chokeDensityHud?.destroy());
  }

  return { dataManager, deferredBoot };
}

async function scheduleDeferredLayers(dataManager, isAborted) {
  await new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(resolve);
    else setTimeout(resolve, 200);
  });
  if (isAborted()) return;

  const [
    { default: militaryFlightsLayer },
    { default: rocketLaunchesLayer },
    { default: trafficLayer },
    { default: cctvLayer },
    { default: radioLayer },
    { default: bikeshareLayer },
    { default: militaryInstallationsLayer },
    { default: militaryAwarenessLayer },
    { default: localDataLayers },
    { default: gdacsAlerts },
    { default: emscQuakes },
    { default: nwsAlerts },
    { default: marineWeather },
  ] = await Promise.all([
    import('../data/militaryFlights.js'),
    import('../data/rocketLaunches.js'),
    import('../data/traffic.js'),
    import('../data/cctv.js'),
    import('../data/radio.js'),
    import('../data/bikeshare.js'),
    import('../data/militaryInstallations.js'),
    import('../data/militaryAwareness.js'),
    import('../data/localLayers.js'),
    import('../data/gdacsAlerts.js'),
    import('../data/emscQuakes.js'),
    import('../data/nwsAlerts.js'),
    import('../data/marineWeather.js'),
  ]);
  if (isAborted()) return;

  const deferredModules = [
    militaryFlightsLayer,
    rocketLaunchesLayer,
    trafficLayer,
    cctvLayer,
    radioLayer,
    bikeshareLayer,
    militaryInstallationsLayer,
    militaryAwarenessLayer,
    ...localDataLayers,
    gdacsAlerts,
    emscQuakes,
    nwsAlerts,
    marineWeather,
  ];

  dataManager.extendRegistrations(deferredModules, DEFERRED_REGISTRY);
  rocketLaunchesLayer.attachDataManager(dataManager);
  militaryAwarenessLayer.attachDataManager(dataManager);

  // Restore saved state for deferred layers; on first boot apply thesis defaults.
  try {
    const storage = globalThis.localStorage;
    const saved = parseStoredLayerState(storage?.getItem?.(LAYER_STATE_STORAGE_KEY));
    if (saved) {
      const enabledSet = new Set(saved.enabledLayerIds);
      for (const mod of deferredModules) {
        if (enabledSet.has(mod.id)) {
          dataManager.setEnabled(mod.id, true, { origin: 'programmatic' });
        }
      }
    } else {
      for (const mod of deferredModules) {
        if (THESIS_LAYER_DEFAULTS[mod.id]) {
          dataManager.setEnabled(mod.id, true, { origin: 'programmatic' });
        }
      }
    }
  } catch { /* best effort — deferred layers stay disabled on corrupt state */ }
}
