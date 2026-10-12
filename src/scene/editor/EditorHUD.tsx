"use client"

import { useEditorStore } from "./editorStore"

/**
 * Tiny HTML overlay that shows the editor state. Rendered outside the
 * Canvas (no R3F context) — mounted next to the canvas in CabinExperience.
 */
export function EditorHUD() {
  const enabled = useEditorStore((s) => s.enabled)
  const selectedId = useEditorStore((s) => s.selectedId)
  const items = useEditorStore((s) => s.items)
  const order = useEditorStore((s) => s.order)

  if (!enabled) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 50,
        background: "rgba(10, 15, 28, 0.92)",
        border: "1px solid #2A3147",
        borderRadius: 8,
        padding: "10px 12px",
        font: "12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#E8EDF5",
        maxWidth: 360,
        pointerEvents: "none",
      }}
    >
      <div style={{ color: "#F4A261", marginBottom: 6 }}>
        POSITION EDITOR (P to close)
      </div>
      <div style={{ color: "#8A93A6", marginBottom: 8 }}>
        Tab cycle · arrows XZ · Q/E Y · Z/X yaw · T/Y pitch · B/N roll · R
        reset rot · Shift 5× · Alt 0.1× · C copy · L log all · Esc deselect
      </div>
      {order.map((id) => {
        const it = items[id]
        if (!it) return null
        const active = id === selectedId
        const hasRot = it.rot[0] !== 0 || it.rot[1] !== 0 || it.rot[2] !== 0
        return (
          <div
            key={id}
            style={{
              color: active ? "#5BC0EB" : "#E8EDF5",
              fontWeight: active ? 700 : 400,
            }}
          >
            {active ? "▶ " : "  "}
            {it.label.padEnd(20, " ")} ({it.pos[0].toFixed(2)},{" "}
            {it.pos[1].toFixed(2)}, {it.pos[2].toFixed(2)})
            {hasRot && (
              <span style={{ color: "#F4A261", marginLeft: 4 }}>
                r({it.rot[0].toFixed(2)}, {it.rot[1].toFixed(2)},{" "}
                {it.rot[2].toFixed(2)})
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
