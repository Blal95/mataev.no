export type StationId =
  | "mailbox"
  | "signpost"
  | "workbench"
  | "cairn"
  | "photos"

// Each value is multiplied by worldScale (=4) inside <Interactable>.
//
// Layout = a "pilgrim's path" running south → north toward the cabin door
// (cabin world position ~(8, _, -7)). The wooden deck (Plane.019_Plane in
// the GLB) sits at world bbox x [8.2, 13.7], y = 4.84, z [-11.4, -2.1] —
// flat and intentional. Stations alternate left/right of the path so the
// player discovers them in sequence.
//
// World coords (for reference in comments):
//   SPAWN     ( 11, 14,  8)   — south of mailbox
//   Mailbox   (  8,  4, 10)   — west gate post (snow)
//   Signpost  ( 14,  4, 10)   — east gate post (snow)
//   Fire pit  ( 11,  4,  4)   — middle of path (snow)
//   Skill tree( 14,  4,  0)   — east of fire, pine w/ ornaments (snow)
//   Workbench (  8.5, 4.84, -3) — south-west of cabin door (deck)
//   Cairn     ( 13.5, 4.84, -3) — south-east of cabin door (deck)
//   Photo wall( 10.5, 4.84, -8) — at the cabin facade (deck)
//   Cabin     (  8 .. 10, _, -14 .. -5) — backdrop, can't enter
export const STATION_POSITIONS: Record<StationId, [number, number, number]> = {
  mailbox: [2.0, 0, 2.5], // world ( 8, _, 10)
  // User-requested world (12.17, 4.04, 10.8). XZ ÷ 4 → model (3.0425, _, 2.7).
  // Y is a yOffset above the ground raycast; snow plane top ≈ 3.96 so 0.08
  // puts the post foot at the requested 4.04.
  signpost: [3.0425, 0.08, 2.7], // world (12.17, 4.04, 10.8)


  workbench: [2.125, 1.21, -0.75], // world ( 8.5, 4.84, -3)
  cairn: [3.375, 1.21, -0.75], // world (13.5, 4.84, -3)
  photos: [2.625, 1.21, -2.0], // world (10.5, 4.84, -8)
}
