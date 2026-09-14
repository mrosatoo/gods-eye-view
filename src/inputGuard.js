/**
 * Ref-counted enableInputs guard — prevents multiple subsystems from
 * fighting over a single boolean and leaving the camera frozen.
 */

export function createInputGuard(viewer) {
  const holders = new Set();

  function sync() {
    const controller = viewer?.scene?.screenSpaceCameraController;
    if (controller) controller.enableInputs = holders.size === 0;
  }

  function acquire(tag) {
    holders.add(tag);
    sync();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holders.delete(tag);
      sync();
    };
  }

  function releaseAll() {
    holders.clear();
    sync();
  }

  return {
    acquire,
    releaseAll,
    get isLocked() { return holders.size > 0; },
    get holders() { return new Set(holders); },
  };
}
