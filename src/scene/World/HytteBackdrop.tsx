"use client"

import { useEffect, useMemo } from "react"
import { useGLTF } from "@react-three/drei"
import { RigidBody, CuboidCollider } from "@react-three/rapier"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"

const MODEL_PATH = "/models/hytte.glb"

// GLB is DRACO-compressed with 160 named sub-meshes (door, terrain planes,
// cabin, mountains, etc.). Drei's useGLTF registers the DRACO decoder by
// default. Do NOT re-export via `gltf-transform optimize --join`: it welds
// everything into one node, which kills the door detach + the terrain
// raycasts (Borzik / footprints) and breaks the trimesh collider.
useGLTF.preload(MODEL_PATH)

/** The colour of the model's stand-in chimney smoke. */
const MODEL_SMOKE_GREY = 0x353535

// World position of the GLB origin. The GLB packs the cabin, terrain, snowman,
// mountains, and trees with their own intrinsic positions — we leave them at
// (0, 0, 0) so the snow ground stays centered on the world origin. The cabin
// itself ends up at world (~8, _, -7) which is the NE corner of the clearing.
const CABIN_POSITION: [number, number, number] = [0, 0, 0]

export function HytteBackdrop() {
  const gltf = useGLTF(MODEL_PATH)
  const worldScale = useGameStore((s) => s.worldScale)
  const setClearingBounds = useGameStore((s) => s.setClearingBounds)

  useEffect(() => {
    // World extents of the walkable camp (spawn x≈24, stations span x≈-5..22,
    // z≈-9..16). The old 0..20 box put the spawn permanently "outside".
    setClearingBounds({ minX: -8, maxX: 30, minZ: -14, maxZ: 18 })
  }, [setClearingBounds])

  // Detach the door so it renders as a sibling of the cabin shell (still
  // visible, but pinned at its baked-in rotation — no swing animation).
  const { object, doorClone } = useMemo(() => {
    const root = gltf.scene.clone(true)

    let door: THREE.Object3D | null = null
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const m = node as THREE.Mesh
        m.castShadow = false
        m.receiveShadow = true
      }
      // The model's chimney smoke is a stack of dark grey icospheres, which
      // read as rocks floating over the roof; <ChimneySmoke> rises there now.
      // (The light grey icospheres are snow, and stay.)
      if (
        /^Icosphere/.test(node.name) &&
        ((node as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined)?.color?.getHex() === MODEL_SMOKE_GREY
      ) {
        node.visible = false
      }
      if (
        !door &&
        node.name &&
        /^door/i.test(node.name) &&
        node.name.toLowerCase() !== "doorway" &&
        node.name.toLowerCase() !== "doorframe"
      ) {
        door = node
      }
    })

    let detachedDoor: THREE.Object3D | null = null
    if (door !== null) {
      const d = door as THREE.Object3D
      root.updateMatrixWorld(true)
      const m = d.matrixWorld.clone()
      d.parent?.remove(d)
      m.decompose(d.position, d.quaternion, d.scale)
      detachedDoor = d
    }

    return { object: root, doorClone: detachedDoor }
  }, [gltf])

  // Door swing intentionally disabled — the cabin is a backdrop and the
  // animated swing was distracting. The door mesh is still rendered (just
  // pinned at its baked-in rotation) so the GLB doesn't visually break.

  return (
    <>
      {/* Cabin GLB with trimesh collision so the player can stand on the
          embedded snow / terrain meshes, and is blocked by walls + props. */}
      <RigidBody
        type="fixed"
        colliders="trimesh"
        friction={1}
        position={CABIN_POSITION}
      >
        <group scale={worldScale}>
          <primitive object={object} />
        </group>
      </RigidBody>
      {/* Door mesh, no longer animated. */}
      {doorClone && (
        <group position={CABIN_POSITION}>
          <group scale={worldScale}>
            <primitive object={doorClone} />
          </group>
        </group>
      )}

      {/* Far safety net to catch any fall-through below everything. The
          walkable ground is closed/connected in the GLB itself, so this is
          only a last-resort backstop well below the scene. */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[200, 0.1, 200]} position={[0, -25, 0]} />
      </RigidBody>
    </>
  )
}
