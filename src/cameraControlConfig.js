import * as Cesium from 'cesium';

// Free-globe inertia — preserve upstream Cesium feel per UX thesis.
export const INERTIA_SPIN = 0.9;
export const INERTIA_TRANSLATE = 0.9;
export const INERTIA_ZOOM = 0.8;

// Zoom distance bounds.
export const MINIMUM_ZOOM_DISTANCE = 5;
export const MAXIMUM_ZOOM_DISTANCE = 50_000_000;

// Collision — tighter detection near ground.
export const MINIMUM_COLLISION_TERRAIN_HEIGHT = 4000;

// Fixed-pivot wheel zoom sensitivity.
const WHEEL_ZOOM_FACTOR = 0.0003;
const WHEEL_ZOOM_DECAY = 0.82;
const WHEEL_ZOOM_DEAD_ZONE = 0.5;

export function configureCameraControls(viewer) {
  const controller = viewer.scene.screenSpaceCameraController;

  controller.inertiaSpin = INERTIA_SPIN;
  controller.inertiaTranslate = INERTIA_TRANSLATE;
  controller.inertiaZoom = INERTIA_ZOOM;

  controller.minimumZoomDistance = MINIMUM_ZOOM_DISTANCE;
  controller.maximumZoomDistance = MAXIMUM_ZOOM_DISTANCE;

  controller.minimumCollisionTerrainHeight = MINIMUM_COLLISION_TERRAIN_HEIGHT;
  controller.enableCollisionDetection = true;

  controller._zoomFactor = 3.0;

  return controller;
}

/**
 * Fixed-pivot wheel zoom: zooms toward screen center (not cursor ray)
 * when free-globe. Tracked entities keep Cesium's default range-zoom.
 */
export function installFixedPivotWheelZoom(viewer) {
  const camera = viewer.camera;
  const scene = viewer.scene;
  const controller = scene.screenSpaceCameraController;
  const canvas = viewer.canvas;
  let velocity = 0;

  // Remove WHEEL from Cesium's zoom so we can handle it ourselves for
  // free-globe. Keep RIGHT_DRAG and PINCH for Cesium.
  controller.zoomEventTypes = [
    Cesium.CameraEventType.RIGHT_DRAG,
    Cesium.CameraEventType.PINCH,
  ];

  canvas.addEventListener('wheel', (e) => {
    if (!controller.enableInputs) return;

    // When tracking, re-inject zoom into Cesium's default path by adjusting
    // the tracked-entity range directly through the camera.
    if (viewer.trackedEntity) {
      // Let the default EntityView handle zoom via camera.zoomIn/zoomOut.
      const height = scene.camera.positionCartographic?.height ?? 10000;
      const amount = e.deltaY * WHEEL_ZOOM_FACTOR * Math.max(height, 50);
      if (amount > 0) camera.zoomOut(Math.abs(amount));
      else camera.zoomIn(Math.abs(amount));
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const height = scene.camera.positionCartographic?.height ?? 10000;
    velocity += e.deltaY * WHEEL_ZOOM_FACTOR * Math.max(height, 50);
  }, { passive: false });

  const preRenderListener = () => {
    if (Math.abs(velocity) < WHEEL_ZOOM_DEAD_ZONE) {
      velocity = 0;
      return;
    }
    if (velocity > 0) camera.zoomOut(velocity);
    else camera.zoomIn(-velocity);
    velocity *= WHEEL_ZOOM_DECAY;
  };

  scene.preRender.addEventListener(preRenderListener);

  return () => {
    scene.preRender.removeEventListener(preRenderListener);
  };
}
