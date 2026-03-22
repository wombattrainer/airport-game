import { GameStateEnum, AircraftState } from '../types';
import { WIN_TARGET, WORLD_WIDTH, WORLD_HEIGHT, MAX_QUEUE_SIZE } from '../config';
import { Clock } from './Clock';
import { Renderer } from '../render/Renderer';
import { Aircraft } from '../entities/Aircraft';
import { Runway } from '../entities/Runway';
import { Airport } from '../entities/Airport';
import { SpawnSystem } from '../systems/SpawnSystem';
import { QueueSystem } from '../systems/QueueSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { checkHoldingEntry, enterHolding, updateHolding } from '../systems/HoldingSystem';
import { beginApproach, updateApproach } from '../systems/ApproachSystem';
import { beginLanding, updateLanding } from '../systems/LandingSystem';
import { updateFuel, beginDivert } from '../systems/FuelSystem';
import { drawRunway } from '../render/RunwayRenderer';
import { drawAircraft } from '../render/AircraftRenderer';
import { drawHud } from '../render/HudRenderer';
import { drawQueuePanel, ClearedToLandHitArea } from '../render/QueuePanelRenderer';
import { drawExplosion, createExplosion, Explosion } from '../render/ExplosionRenderer';
import { checkCollisions } from '../systems/CollisionSystem';
import { DragDropManager } from '../input/DragDropManager';

export class Game {
  private state: GameStateEnum = GameStateEnum.MENU;
  private clock: Clock;
  private renderer: Renderer;
  private runway: Runway;
  private airport: Airport;
  private aircraft: Aircraft[] = [];
  private spawnSystem: SpawnSystem;
  private queueSystem: QueueSystem;
  private weatherSystem: WeatherSystem;
  private dragDrop: DragDropManager;
  private gameOverReason: 'win' | 'bankrupt' = 'win';
  private paused = false;
  private pauseButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  private ctlHitAreas: ClearedToLandHitArea[] = [];
  private explosions: Explosion[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.runway = new Runway();
    this.airport = new Airport();
    this.spawnSystem = new SpawnSystem();
    this.queueSystem = new QueueSystem();
    this.weatherSystem = new WeatherSystem();
    this.dragDrop = new DragDropManager(canvas, this.queueSystem);
    this.clock = new Clock((dt) => this.tick(dt));

    canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  start(): void {
    this.clock.start();
  }

  private handleClick(e: MouseEvent): void {
    if (this.state === GameStateEnum.PLAYING) {
      const rect = this.renderer.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Pause button
      const b = this.pauseButtonRect;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.paused = !this.paused;
        return;
      }

      // Cleared to Land buttons (disabled during weather)
      if (!this.weatherSystem.isStormActive) {
        for (const area of this.ctlHitAreas) {
          if (mx >= area.x && mx <= area.x + area.width &&
              my >= area.y && my <= area.y + area.height) {
            this.clearAircraftToLand(area.callsign);
            return;
          }
        }
      }
    }

    if (this.state === GameStateEnum.MENU) {
      this.startGame();
    } else if (this.state === GameStateEnum.GAME_OVER) {
      this.state = GameStateEnum.MENU;
    }
  }

  private clearAircraftToLand(callsign: string): void {
    const ac = this.queueSystem.remove(callsign);
    if (ac) {
      beginApproach(ac, this.runway);
    }
  }

  private startGame(): void {
    this.state = GameStateEnum.PLAYING;
    this.aircraft = [];
    this.runway.unlock();
    this.airport.reset();
    this.spawnSystem.reset();
    this.queueSystem.reset();
    this.weatherSystem.reset();
    this.dragDrop.reset();
    this.ctlHitAreas = [];
    this.explosions = [];
    this.paused = false;
    this.clock.reset();
  }

  private tick(dt: number): void {
    this.renderer.clear();

    switch (this.state) {
      case GameStateEnum.MENU:
        this.drawMenu();
        break;
      case GameStateEnum.PLAYING:
        if (!this.paused) {
          this.update(dt);
        }
        this.render();
        break;
      case GameStateEnum.GAME_OVER:
        this.drawGameOver();
        break;
    }
  }

  // ── Update ────────────────────────────────────────────

  private update(dt: number): void {
    const elapsed = this.clock.elapsed;

    // Weather
    this.weatherSystem.update(dt, this.runway);

    // Spawn (only if queue is below max size)
    if (this.queueSystem.length < MAX_QUEUE_SIZE) {
      const newAircraft = this.spawnSystem.update(dt, elapsed);
      if (newAircraft) {
        this.aircraft.push(newAircraft);
      }
    }

    // Update each aircraft
    for (const ac of this.aircraft) {
      switch (ac.state) {
        case AircraftState.ARRIVING:
          ac.moveForward(dt);
          if (checkHoldingEntry(ac)) {
            enterHolding(ac);
            this.queueSystem.enqueue(ac);
          }
          break;

        case AircraftState.HOLDING:
          updateHolding(ac, dt);
          if (updateFuel(ac, dt)) {
            // Divert
            this.queueSystem.remove(ac.callsign);
            beginDivert(ac);
            this.airport.deduct(ac.value);
          }
          break;

        case AircraftState.APPROACH: {
          const reachedThreshold = updateApproach(ac, this.runway, dt);
          if (reachedThreshold) {
            beginLanding(ac, this.runway);
          }
          break;
        }

        case AircraftState.LANDING: {
          const stopped = updateLanding(ac, this.runway, dt);
          if (stopped) {
            this.airport.earn(ac.value);
          }
          break;
        }

        case AircraftState.DIVERTED:
          ac.moveForward(dt);
          break;
      }
    }

    // Collision detection (APPROACH / LANDING aircraft only)
    const collisions = checkCollisions(this.aircraft, this.renderer);
    if (collisions.length > 0) {
      const collidedCallsigns = new Set<string>();
      for (const col of collisions) {
        this.airport.deduct(col.a.value);
        this.airport.deduct(col.b.value);
        this.explosions.push(createExplosion(col.wx, col.wy));
        collidedCallsigns.add(col.a.callsign);
        collidedCallsigns.add(col.b.callsign);
      }
      this.aircraft = this.aircraft.filter(ac => !collidedCallsigns.has(ac.callsign));
    }

    // Age out finished explosions
    this.explosions = this.explosions.filter(ex => {
      ex.age += dt;
      return ex.age < ex.maxAge;
    });

    // Release top of queue if runway is free
    this.tryReleaseQueue();

    // Remove off-screen or landed aircraft
    this.aircraft = this.aircraft.filter(ac => {
      if (ac.state === AircraftState.LANDED) return false;
      if (ac.state === AircraftState.DIVERTED) {
        return ac.x > -200 && ac.x < WORLD_WIDTH + 200 &&
               ac.y > -200 && ac.y < WORLD_HEIGHT + 200;
      }
      return true;
    });

    // Check win/lose
    if (this.airport.bankBalance >= WIN_TARGET) {
      this.gameOverReason = 'win';
      this.state = GameStateEnum.GAME_OVER;
    } else if (this.airport.bankBalance <= 0) {
      this.gameOverReason = 'bankrupt';
      this.state = GameStateEnum.GAME_OVER;
    }
  }

  private tryReleaseQueue(): void {
    if (this.weatherSystem.isStormActive) return;
    if (this.queueSystem.length === 0) return;

    const approachOrLanding = this.aircraft.some(
      ac => ac.state === AircraftState.APPROACH || ac.state === AircraftState.LANDING,
    );
    if (approachOrLanding) return;

    const next = this.queueSystem.dequeue();
    if (next) {
      beginApproach(next, this.runway);
    }
  }

  // ── Render ────────────────────────────────────────────

  private render(): void {
    // Storm visual overlay
    if (this.weatherSystem.isStormActive) {
      const { ctx } = this.renderer;
      ctx.fillStyle = 'rgba(0, 0, 30, 0.3)';
      ctx.fillRect(0, 0, this.renderer.gameViewWidth, this.renderer.gameViewHeight);
    }

    drawRunway(this.renderer, this.runway);

    for (const ac of this.aircraft) {
      drawAircraft(this.renderer, ac);
    }

    for (const ex of this.explosions) {
      drawExplosion(this.renderer, ex);
    }

    drawHud(
      this.renderer,
      this.airport,
      this.runway,
      this.weatherSystem,
      this.clock.elapsed,
    );

    const activeAircraft = this.aircraft.filter(
      ac => ac.state === AircraftState.APPROACH || ac.state === AircraftState.LANDING,
    );
    const { dragAreas, ctlAreas } = drawQueuePanel(
      this.renderer,
      this.queueSystem,
      activeAircraft,
      this.dragDrop.dragIndex,
      this.dragDrop.dragY,
      this.weatherSystem.isStormActive,
    );
    this.dragDrop.updateHitAreas(dragAreas);
    this.ctlHitAreas = ctlAreas;

    // Pause button at bottom of queue panel
    this.drawPauseButton();
  }

  private drawPauseButton(): void {
    const { ctx } = this.renderer;
    const btnW = this.renderer.queuePanelWidth - 24;
    const btnH = 36;
    const btnX = this.renderer.queuePanelX + 12;
    const btnY = this.renderer.gameViewHeight - btnH - 12;

    this.pauseButtonRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = this.paused ? '#2a5a2a' : '#2a2a4a';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = this.paused ? '#44cc44' : '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = this.paused ? '#44cc44' : '#cccccc';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.paused ? 'Unpause' : 'Pause', btnX + btnW / 2, btnY + btnH / 2 + 5);
  }

  // ── Menu / Game Over screens ──────────────────────────

  private drawMenu(): void {
    const { ctx } = this.renderer;
    const cx = this.renderer.gameViewWidth / 2;
    const cy = this.renderer.gameViewHeight / 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AIRPORT SIMULATOR', cx, cy - 40);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Manage the landing queue. Grow your balance to $500,000.', cx, cy + 10);

    ctx.fillStyle = '#44cc44';
    ctx.font = '18px monospace';
    ctx.fillText('Click to Start', cx, cy + 60);
  }

  private drawGameOver(): void {
    const { ctx } = this.renderer;
    const cx = this.renderer.gameViewWidth / 2;
    const cy = this.renderer.gameViewHeight / 2;

    if (this.gameOverReason === 'win') {
      ctx.fillStyle = '#44cc44';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU WIN!', cx, cy - 40);
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BANKRUPT', cx, cy - 40);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    const mins = Math.floor(this.clock.elapsed / 60);
    const secs = Math.floor(this.clock.elapsed % 60);
    ctx.fillText(
      `Final balance: $${this.airport.bankBalance.toLocaleString()} | Time: ${mins}:${secs.toString().padStart(2, '0')}`,
      cx, cy + 10,
    );

    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText('Click to return to menu', cx, cy + 50);
  }
}
