import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureCameraControls,
  INERTIA_SPIN,
  INERTIA_TRANSLATE,
  INERTIA_ZOOM,
  MINIMUM_ZOOM_DISTANCE,
  MAXIMUM_ZOOM_DISTANCE,
  MINIMUM_COLLISION_TERRAIN_HEIGHT,
  WHEEL_ZOOM_FACTOR,
} from './cameraControlConfig.js';
import { createInputGuard } from './inputGuard.js';

function mockViewer() {
  const controller = {
    inertiaSpin: 0.9,
    inertiaTranslate: 0.9,
    inertiaZoom: 0.9,
    minimumZoomDistance: 1,
    maximumZoomDistance: Infinity,
    minimumCollisionTerrainHeight: 15000,
    enableCollisionDetection: true,
    enableInputs: true,
    _zoomFactor: 5.0,
    zoomEventTypes: [],
  };
  return {
    scene: { screenSpaceCameraController: controller },
    gevInputGuard: null,
  };
}

test('configureCameraControls applies all expected SSCC properties', () => {
  const viewer = mockViewer();
  const ctrl = configureCameraControls(viewer);
  assert.equal(ctrl.inertiaSpin, INERTIA_SPIN);
  assert.equal(ctrl.inertiaTranslate, INERTIA_TRANSLATE);
  assert.equal(ctrl.inertiaZoom, INERTIA_ZOOM);
  assert.equal(ctrl.minimumZoomDistance, MINIMUM_ZOOM_DISTANCE);
  assert.equal(ctrl.maximumZoomDistance, MAXIMUM_ZOOM_DISTANCE);
  assert.equal(ctrl.minimumCollisionTerrainHeight, MINIMUM_COLLISION_TERRAIN_HEIGHT);
  assert.equal(ctrl.enableCollisionDetection, true);
  assert.equal(ctrl._zoomFactor, 3.0);
});

test('configured inertia values are in [0, 1)', () => {
  for (const v of [INERTIA_SPIN, INERTIA_TRANSLATE, INERTIA_ZOOM]) {
    assert.ok(v >= 0 && v < 1, `inertia ${v} out of valid range [0, 1)`);
  }
});

test('configured zoom bounds are sane', () => {
  assert.ok(MINIMUM_ZOOM_DISTANCE > 0, 'minimum zoom must be positive');
  assert.ok(MAXIMUM_ZOOM_DISTANCE > MINIMUM_ZOOM_DISTANCE, 'max > min');
});

test('free-globe inertia tuned for fluidity', () => {
  assert.equal(INERTIA_SPIN, 0.92, 'inertiaSpin above Cesium default for fluid globe spin');
  assert.equal(INERTIA_TRANSLATE, 0.92, 'inertiaTranslate above Cesium default for fluid pan');
  assert.equal(INERTIA_ZOOM, 0.8, 'inertiaZoom preserves Cesium default');
});

test('WHEEL_ZOOM_FACTOR provides substantial zoom punch', () => {
  assert.ok(WHEEL_ZOOM_FACTOR >= 0.0005, 'zoom factor must be at least 0.0005 for usable wheel zoom');
  assert.ok(WHEEL_ZOOM_FACTOR <= 0.005, 'zoom factor must not exceed 0.005 to avoid overshooting');
  assert.equal(WHEEL_ZOOM_FACTOR, 0.001, 'zoom factor is the expected production value');
});

test('wheel zoom delta at representative altitudes', () => {
  const deltaY = 100;
  const altitudes = [500, 10000, 1_000_000];
  for (const h of altitudes) {
    const amount = deltaY * WHEEL_ZOOM_FACTOR * Math.max(h, 50);
    assert.ok(amount > 0, `zoom amount must be positive at ${h}m`);
    assert.ok(amount < h, `single scroll must not exceed current altitude at ${h}m`);
  }
});

test('wheel zoom scales proportionally with altitude', () => {
  const deltaY = 100;
  const low = deltaY * WHEEL_ZOOM_FACTOR * Math.max(500, 50);
  const high = deltaY * WHEEL_ZOOM_FACTOR * Math.max(1_000_000, 50);
  assert.ok(high / low > 100, 'high-altitude zoom must be orders of magnitude larger than low');
});

test('inputGuard ref-counting: two holders, release one then second', () => {
  const viewer = mockViewer();
  const guard = createInputGuard(viewer);
  const ctrl = viewer.scene.screenSpaceCameraController;

  assert.equal(guard.isLocked, false);
  assert.equal(ctrl.enableInputs, true);

  const releaseA = guard.acquire('a');
  assert.equal(guard.isLocked, true);
  assert.equal(ctrl.enableInputs, false);

  const releaseB = guard.acquire('b');
  assert.equal(guard.holders.size, 2);
  assert.equal(ctrl.enableInputs, false);

  releaseA();
  assert.equal(guard.isLocked, true);
  assert.equal(ctrl.enableInputs, false);

  releaseB();
  assert.equal(guard.isLocked, false);
  assert.equal(ctrl.enableInputs, true);
});

test('inputGuard.releaseAll clears all holders', () => {
  const viewer = mockViewer();
  const guard = createInputGuard(viewer);
  const ctrl = viewer.scene.screenSpaceCameraController;

  guard.acquire('cockpit');
  guard.acquire('gizmo');
  assert.equal(ctrl.enableInputs, false);

  guard.releaseAll();
  assert.equal(guard.isLocked, false);
  assert.equal(ctrl.enableInputs, true);
});

test('inputGuard prevents double-release underflow', () => {
  const viewer = mockViewer();
  const guard = createInputGuard(viewer);
  const ctrl = viewer.scene.screenSpaceCameraController;

  const release = guard.acquire('test');
  release();
  assert.equal(ctrl.enableInputs, true);

  release();
  assert.equal(ctrl.enableInputs, true);
  assert.equal(guard.holders.size, 0);
});

test('inputGuard same-tag acquire replaces without stacking', () => {
  const viewer = mockViewer();
  const guard = createInputGuard(viewer);
  const ctrl = viewer.scene.screenSpaceCameraController;

  const release1 = guard.acquire('cockpit');
  const release2 = guard.acquire('cockpit');
  assert.equal(guard.holders.size, 1);

  release1();
  assert.equal(ctrl.enableInputs, true);

  release2();
  assert.equal(ctrl.enableInputs, true);
});
