import { AircraftSize, AircraftSizeProfile } from './types';

// ── World ──────────────────────────────────────────────
export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 3000;

// 1 knot = this many game-units per second
export const KNOTS_TO_GU_PER_SEC = 1;

// ── Economy ────────────────────────────────────────────
export const STARTING_BALANCE = 10_000;
export const WIN_TARGET = 500_000;

// ── Aircraft size profiles ─────────────────────────────
export const AIRCRAFT_PROFILES: Record<AircraftSize, AircraftSizeProfile> = {
  [AircraftSize.SMALL]: {
    speed: 90,
    fuelEndurance: 120,
    value: 1_000,
    spawnWeight: 0.5,
  },
  [AircraftSize.MEDIUM]: {
    speed: 140,
    fuelEndurance: 150,
    value: 3_000,
    spawnWeight: 0.35,
  },
  [AircraftSize.LARGE]: {
    speed: 200,
    fuelEndurance: 180,
    value: 6_000,
    spawnWeight: 0.15,
  },
};

// ── Arrivals / Difficulty ──────────────────────────────
export const SPAWN_INTERVAL_START = 20;
export const SPAWN_JITTER = 3;
export const SPAWN_RAMP_FREQUENCY = 120; // seconds
export const SPAWN_RAMP_AMOUNT = 5;
export const SPAWN_INTERVAL_MIN = 10;
export const MAX_QUEUE_SIZE = 9;

// ── Flight mechanics ───────────────────────────────────
export const TURN_RATE_DEG_PER_SEC = 30;
export const HOLDING_DIRECTION = 90; // degrees, compass heading of inbound leg toward HF
export const HOLDING_OUTBOUND_DURATION = 5; // seconds

// ── Landing ────────────────────────────────────────────
export const LANDING_STOP_FRACTION = 0.75;

// ── Weather ────────────────────────────────────────────
export const STORM_MIN_INTERVAL = 120; // seconds
export const STORM_MAX_INTERVAL = 300;
export const STORM_DURATION = 15;

// ── Runway ─────────────────────────────────────────────
export const RUNWAY_LENGTH = 600;
export const RUNWAY_WIDTH = 30;
export const RUNWAY_CENTER_X = 2800;
export const RUNWAY_CENTER_Y = 1000;
export const RUNWAY_HEADING = 0; // degrees, 0 = north (up)

// ── Key positions ──────────────────────────────────────
export const SPAWN_POINT_X = 200;
export const SPAWN_POINT_Y = 2800;

export const HOLDING_FIX_X = 1000;
export const HOLDING_FIX_Y = 800;

// Final approach point: on extended runway centreline, south of runway
export const FINAL_APPROACH_X = RUNWAY_CENTER_X;
export const FINAL_APPROACH_Y = RUNWAY_CENTER_Y + RUNWAY_LENGTH * 1.4;

// ── Rendering ──────────────────────────────────────────
export const GAME_VIEW_FRACTION = 0.75; // left 75% of screen
export const BACKGROUND_COLOR = '#1a1a2e';
export const RUNWAY_COLOR = '#555555';
export const RUNWAY_MARKING_COLOR = '#ffffff';
export const QUEUE_PANEL_BG = '#0f0f23';

// ── Arrival proximity threshold ────────────────────────
export const HOLDING_ENTRY_DISTANCE = 50;
