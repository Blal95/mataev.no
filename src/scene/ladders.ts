/**
 * Climb-zone registry — lets the player controller turn gravity off and move
 * vertically while standing inside a ladder volume.
 *
 * The towers register an axis-aligned column (the ladder shaft) at mount and
 * remove it on unmount. `Player` queries `climbZoneAt` every frame; when the
 * capsule centre is inside a zone, forward/jump climbs up and back climbs down.
 */

export interface ClimbZone {
  /** World centre of the ladder column on the XZ plane (visual ladder). */
  cx: number
  cz: number
  /**
   * World XZ point the player snaps to while climbing — typically a small
   * offset south of the ladder so the ladder is in front of the camera and
   * visible during the climb instead of clipping through the player. */
  standX: number
  standZ: number
  /** Half-extents of the column footprint. */
  halfX: number
  halfZ: number
  /** World Y of the ladder foot (interior floor). */
  baseY: number
  /** World Y of the platform the ladder delivers you onto. */
  topY: number
  /**
   * World direction the player should be pushed when dismounting at the top,
   * away from the ladder onto the deck. Unit vector on the XZ plane. */
  dismountX: number
  dismountZ: number
  /**
   * World centre + half-extents of the deck hole above the ladder. When the
   * player stands here on the deck (no floor under the hole) the controller
   * supports them, and holding still over it triggers auto-descent. */
  holeCx: number
  holeCz: number
  holeHalfX: number
  holeHalfZ: number
  /**
   * World XZ landing point on the solid deck, just south of the hole. On
   * reaching the top the controller drives the player here (held up, no fall)
   * before releasing, so they always end up standing on the deck. */
  exitX: number
  exitZ: number
}

const zones = new Set<ClimbZone>()

if (typeof window !== "undefined") {
  ;(window as unknown as { __climbZones: Set<ClimbZone> }).__climbZones = zones
}

/** Register a climb zone; returns a disposer to remove it. */
export function registerClimbZone(zone: ClimbZone): () => void {
  zones.add(zone)
  return () => {
    zones.delete(zone)
  }
}

/**
 * Returns the climb zone containing the given world point, or null. A small
 * vertical slack lets the player engage just below the foot and dismount just
 * above the platform.
 */
export function climbZoneAt(
  x: number,
  y: number,
  z: number,
): ClimbZone | null {
  for (const zone of zones) {
    if (
      x >= zone.cx - zone.halfX &&
      x <= zone.cx + zone.halfX &&
      z >= zone.cz - zone.halfZ &&
      z <= zone.cz + zone.halfZ &&
      y >= zone.baseY - 1.0 &&
      y <= zone.topY + 0.6
    ) {
      return zone
    }
  }
  return null
}
