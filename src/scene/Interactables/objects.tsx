"use client"

import { RigidBody } from "@react-three/rapier"
import { useTranslations } from "next-intl"
import { Interactable } from "./Interactable"

export function LaptopObject() {
  const t = useTranslations("prompt")
  return (
    <Interactable
      id="projects"
      position={[-3, 0.9, -4.5]}
      radius={2.6}
      label={t("laptop")}
    >
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.2, 0.8, 1.2]} />
          <meshStandardMaterial color="#2a1f17" roughness={0.85} />
        </mesh>
      </RigidBody>
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.9, 0.05, 0.65]} />
        <meshStandardMaterial color="#1a1a22" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.2, -0.25]} rotation={[-Math.PI / 6, 0, 0]}>
        <boxGeometry args={[0.85, 0.55, 0.04]} />
        <meshStandardMaterial
          color="#0a0f1c"
          emissive="#5bc0eb"
          emissiveIntensity={2.2}
        />
      </mesh>
    </Interactable>
  )
}


export function BookshelfObject() {
  const t = useTranslations("prompt")
  return (
    <Interactable
      id="education"
      position={[-6.5, 1.5, 1]}
      radius={2.5}
      label={t("bookshelf")}
    >
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.4, 3, 2.5]} />
          <meshStandardMaterial color="#3a2a1d" roughness={0.95} />
        </mesh>
      </RigidBody>
      {[-0.9, -0.3, 0.3, 0.9].map((y, i) => (
        <group key={i}>
          {Array.from({ length: 5 }).map((_, j) => (
            <mesh key={j} position={[0.18, y, -1 + j * 0.4]} castShadow>
              <boxGeometry args={[0.06, 0.4, 0.18]} />
              <meshStandardMaterial
                color={["#5bc0eb", "#f4a261", "#e8edf5", "#8b5cf6"][j % 4]}
                emissive={["#5bc0eb", "#f4a261", "#e8edf5", "#8b5cf6"][j % 4]}
                emissiveIntensity={0.4}
              />
            </mesh>
          ))}
        </group>
      ))}
    </Interactable>
  )
}

export function PhotoWallObject() {
  const t = useTranslations("prompt")
  return (
    <Interactable
      id="about"
      position={[0, 2.2, 6.8]}
      radius={2.7}
      label={t("photoWall")}
    >
      {[-1.5, 0, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[1, 0.7, 0.05]} />
          <meshStandardMaterial
            color="#e8edf5"
            emissive="#5bc0eb"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </Interactable>
  )
}

export function MailboxObject() {
  const t = useTranslations("prompt")
  return (
    <Interactable
      id="contact"
      position={[6, 0.7, 3]}
      radius={2.2}
      label={t("mailbox")}
    >
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.7]} />
          <meshStandardMaterial
            color="#5bc0eb"
            emissive="#5bc0eb"
            emissiveIntensity={0.7}
          />
        </mesh>
        <mesh position={[0, -0.5, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
          <meshStandardMaterial color="#1a1a22" />
        </mesh>
      </RigidBody>
    </Interactable>
  )
}
