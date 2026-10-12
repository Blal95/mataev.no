"use client"

import type { Object3D } from "three"
import { create } from "zustand"
import type { BookEntry } from "@/types/books"
import type { GalleryImage } from "@/types/gallery"

export type PanelId =
  | "projects"
  | "about"
  | "education"
  | "contact"
  | "record"
  | "signpost"
  | "borzik"
  | "books"
  | "gallery"
  | "heritage"
  | null

/** Stations that count toward the "discovered X/N" progress nudge. The fire
 *  guide ("signpost") is the tutorial, not a destination, so it's excluded. */
export const TRACKED_STATIONS = [
  "projects",
  "about",
  "education",
  "contact",
  "record",
  "borzik",
  "books",
  "gallery",
  "heritage",
] as const

const VISITED_KEY = "mataev_visited"

function loadVisited(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(VISITED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (id): id is string =>
        typeof id === "string" &&
        (TRACKED_STATIONS as readonly string[]).includes(id),
    )
  } catch {
    return []
  }
}

export interface ClearingBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface GameState {
  openPanel: PanelId
  canInteract: PanelId
  /** What the aimed station is called, for the crosshair's tag. */
  interactLabel: string | null
  /** The aimed thing itself, which the one beacon light follows. */
  interactTarget: Object3D | null
  paused: boolean
  audioOn: boolean
  hasBooted: boolean
  worldScale: number
  introPlaying: boolean
  contactOpened: boolean
  /** True once a message has been sent successfully — raises the mailbox flag
   *  in-world as diegetic confirmation. */
  contactSent: boolean
  /** First-visit onboarding: false until the player reads the signpost once
   *  (persisted to localStorage). Drives the "start here" emphasis. */
  signpostSeen: boolean
  /** Tracked station ids the player has opened at least once (persisted).
   *  Drives the subtle "discovered X/N" HUD nudge — completion drive without
   *  going game-y. */
  visitedStations: string[]
  secretMode: boolean
  clearingBounds: ClearingBounds | null
  selectedBook: string | null
  /** The generative vinyl loop keeps playing even after the panel closes. */
  vinylPlaying: boolean
  /** True while the 3D book-open animation plays, before the panel opens. */
  openingBook: boolean
  /** When set, the books panel shows ONLY this book (single open-book view);
   *  null = the full shelf list. Set when a specific spine is interacted with. */
  bookDetailId: string | null
  // Prefetched API data — fetched once after spawn, shared by all consumers.
  booksData: BookEntry[] | null
  galleryData: GalleryImage[] | null
  /** Index (0-8) of the photo wall frame the player is currently aiming at.
   *  Lets the gallery panel open on the exact photo being looked at. */
  focusedGalleryIndex: number
  airborne: boolean
  /** The station the player asked to be guided to. Wind flows until arrival. */
  guidedStation: PanelId
  setAirborne: (b: boolean) => void
  setGuidedStation: (id: PanelId) => void
  setOpenPanel: (p: PanelId) => void
  setCanInteract: (id: PanelId, label?: string | null, target?: Object3D | null) => void
  setPaused: (b: boolean) => void
  toggleAudio: () => void
  setHasBooted: (b: boolean) => void
  markStationVisited: (id: string) => void
  setIntroPlaying: (b: boolean) => void
  toggleSecretMode: () => void
  setClearingBounds: (b: ClearingBounds) => void
  setSelectedBook: (slug: string | null) => void
  setVinylPlaying: (b: boolean) => void
  setContactSent: (b: boolean) => void
  setOpeningBook: (b: boolean) => void
  setBookDetailId: (id: string | null) => void
  reading3DBookId: string | null
  setReading3DBookId: (id: string | null) => void
  setBooksData: (books: BookEntry[]) => void
  setGalleryData: (images: GalleryImage[]) => void
  setFocusedGalleryIndex: (i: number) => void
  /** Persistent Borzik chat history — survives panel close/reopen. */
  borzikMessages: BorzikMsg[]
  addBorzikMessage: (msg: BorzikMsg) => void
}

export interface BorzikMsg {
  role: "borzik" | "you"
  text: string
  ts: number
  image?: string
}

export const useGameStore = create<GameState>((set) => ({
  openPanel: null,
  canInteract: null,
  interactLabel: null,
  interactTarget: null,
  paused: false,
  airborne: false,
  audioOn: true,
  hasBooted: false,
  worldScale: 4,
  introPlaying: false,
  contactOpened: false,
  contactSent: false,
  signpostSeen:
    typeof window !== "undefined" &&
    window.localStorage.getItem("mataev_signpost_seen") === "1",
  visitedStations: loadVisited(),
  secretMode: false,
  clearingBounds: null,
  selectedBook: null,
  vinylPlaying: false,
  openingBook: false,
  bookDetailId: null,
  booksData: null,
  galleryData: null,
  focusedGalleryIndex: 0,
  guidedStation: null,
  setAirborne: (airborne) => set({ airborne }),
  setGuidedStation: (guidedStation) => set({ guidedStation }),
  setOpenPanel: (openPanel) =>
    set((s) => {
      // Reading the signpost retires the first-visit "start here" emphasis.
      if (openPanel === "signpost" && !s.signpostSeen && typeof window !== "undefined") {
        window.localStorage.setItem("mataev_signpost_seen", "1")
      }
      // Record first visit to a tracked station for the "discovered X/N" nudge.
      let visitedStations = s.visitedStations
      if (
        openPanel &&
        (TRACKED_STATIONS as readonly string[]).includes(openPanel) &&
        !s.visitedStations.includes(openPanel)
      ) {
        visitedStations = [...s.visitedStations, openPanel]
        if (typeof window !== "undefined") {
          window.localStorage.setItem(VISITED_KEY, JSON.stringify(visitedStations))
        }
      }
      return {
        visitedStations,
        openPanel,
        paused: openPanel !== null || s.reading3DBookId !== null,
        contactOpened: openPanel === "contact" ? true : s.contactOpened,
        signpostSeen: openPanel === "signpost" ? true : s.signpostSeen,
        // Clear single-book view whenever we leave/!open the books panel.
        bookDetailId: openPanel === "books" ? s.bookDetailId : null,
      }
    }),
  setCanInteract: (canInteract, label = null, target = null) =>
    set({
      canInteract,
      interactLabel: canInteract ? label : null,
      interactTarget: canInteract ? target : null,
    }),
  setPaused: (paused) => set({ paused }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  setHasBooted: (hasBooted) => set({ hasBooted }),
  markStationVisited: (id) =>
    set((s) => {
      if (
        !(TRACKED_STATIONS as readonly string[]).includes(id) ||
        s.visitedStations.includes(id)
      ) {
        return s
      }
      const visitedStations = [...s.visitedStations, id]
      if (typeof window !== "undefined") {
        window.localStorage.setItem(VISITED_KEY, JSON.stringify(visitedStations))
      }
      return { visitedStations }
    }),
  setIntroPlaying: (introPlaying) => set({ introPlaying }),
  toggleSecretMode: () => set((s) => ({ secretMode: !s.secretMode })),
  setClearingBounds: (clearingBounds) => set({ clearingBounds }),
  setSelectedBook: (selectedBook) => set({ selectedBook }),
  setVinylPlaying: (vinylPlaying) => set({ vinylPlaying }),
  setContactSent: (contactSent) => set({ contactSent }),
  setOpeningBook: (openingBook) => set({ openingBook }),
  setBookDetailId: (bookDetailId) => set({ bookDetailId }),
  reading3DBookId: null,
  setReading3DBookId: (reading3DBookId) => set({ reading3DBookId, paused: reading3DBookId !== null }),
  setBooksData: (booksData) => set({ booksData }),
  setGalleryData: (galleryData) => set({ galleryData }),
  setFocusedGalleryIndex: (focusedGalleryIndex) => set({ focusedGalleryIndex }),
  borzikMessages: [],
  addBorzikMessage: (msg) => set((s) => ({ borzikMessages: [...s.borzikMessages, msg] })),
}))
