export enum AircraftSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export enum AircraftState {
  ARRIVING = 'ARRIVING',
  HOLDING = 'HOLDING',
  APPROACH = 'APPROACH',
  LANDING = 'LANDING',
  LANDED = 'LANDED',
  DIVERTED = 'DIVERTED',
}

export enum HoldingSubState {
  ENTRY_ALIGN = 'ENTRY_ALIGN',
  ENTRY_TURN1 = 'ENTRY_TURN1',
  ENTRY_LEG = 'ENTRY_LEG',
  ENTRY_TURN2 = 'ENTRY_TURN2',
  INBOUND_TURN = 'INBOUND_TURN',
  INBOUND_LEG = 'INBOUND_LEG',
  OUTBOUND_TURN = 'OUTBOUND_TURN',
  OUTBOUND_LEG = 'OUTBOUND_LEG',
}

export enum ApproachSubState {
  DIRECT_TO_BASE = 'DIRECT_TO_BASE',
  BASE_TURN = 'BASE_TURN',
  FINAL = 'FINAL',
}

export enum GameStateEnum {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface AircraftSizeProfile {
  speed: number;
  fuelEndurance: number;
  value: number;
  spawnWeight: number;
}
