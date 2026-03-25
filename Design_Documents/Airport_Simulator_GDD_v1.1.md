# AIRPORT SIMULATOR

## Game Design Document

**Version 1.1 — March 2026 — Prototype Specification**

### Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0 | March 2026 | Initial prototype specification |
| 1.1 | March 2026 | Added aircraft approach state visual indicator (Section 7.4) |

Top-down airport landing simulator. Manage arrivals, queues, and weather to build your airport balance from $10,000 to $500,000.

---

# 1. Game Overview

Airport Simulator is a top-down, single-runway airport management game. Aircraft arrive in local airspace and must land on the runway to earn money. When the runway is occupied, aircraft enter a holding pattern and join a queue. The player manages the queue order to maximise revenue and prevent aircraft from running out of fuel and diverting.

## 1.1 Core Concept

The player runs an airport. Aircraft arrive, land, and pay. If aircraft cannot land in time, they divert and the airport loses money. Weather events temporarily close the runway, creating pressure. The goal is to grow the airport bank balance from $10,000 to $500,000 without going bankrupt.

## 1.2 Platform

Initial prototype is a local application with no fixed technology stack, designed to validate game loop and logic. The eventual target is an iOS app with a touch interface. The prototype should use abstract game units for all spatial dimensions to allow visual scaling later.

## 1.3 Win and Lose Conditions

| Condition | Trigger | Result |
|-----------|---------|--------|
| Win | Bank balance reaches $500,000 | Victory screen, game ends |
| Lose | Bank balance reaches $0 | Bankrupt screen, game ends |

## 1.4 Game States

The game has three states: Main Menu (start new game or exit), Playing (active game loop), and Game Over (win or lose, return to menu).

---

# 2. Object Model

## 2.1 Airport

| Property | Type | Description | Initial Value |
|----------|------|-------------|---------------|
| name | String | Airport name | Player-defined or default |
| bankBalance | Number | Current money in dollars | $10,000 |
| runways | Array\<Runway\> | Collection of runway objects | 1 runway (prototype) |

## 2.2 Runway

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| designator | String | Runway designation per aviation convention | 01/19 |
| length | Number | Length in game units (abstract metres) | 2000 |
| width | Number | Width in game units | 45 |
| centrePosition | Point (x, y) | Centre point of runway in game space | (500, 300) |
| isLocked | Boolean | Whether runway is currently occupied or weather-closed | false |
| lockedBy | String \| null | Callsign of aircraft that owns the runway, or 'weather' | null |

## 2.3 Aircraft

| Property | Type | Description |
|----------|------|-------------|
| callsign | String | 3 random alpha characters (e.g. XXH, JRT, ASP) |
| size | Enum | SMALL, MEDIUM, or LARGE |
| speed | Number | Speed in knots, determines position updates and flight path geometry |
| fuelEndurance | Number | Countdown timer in seconds until divert |
| value | Number | Dollar amount earned on landing or lost on divert |
| state | Enum | ARRIVING, HOLDING, APPROACH, LANDING, DIVERTED, LANDED |
| position | Point (x, y) | Current position in game space |
| heading | Number | Current heading in degrees (0–360) |

## 2.4 Aircraft Size Profiles

These are initial tuning values. All values should be defined in a single configuration location for easy adjustment during playtesting.

| Property | Small | Medium | Large |
|----------|-------|--------|-------|
| Speed (knots) | 90 | 140 | 200 |
| Fuel Endurance | 120 sec | 150 sec | 180 sec |
| Value ($) | $1,000 | $3,000 | $6,000 |
| Spawn Weight | 50% | 35% | 15% |

Note: Exact values are placeholders for tuning. The key relationship is that larger aircraft are faster (shorter runway lock time), worth more, and have more fuel. Smaller aircraft are slower (longer runway lock time), worth less, and have less fuel. This creates queue ordering decisions around fuel urgency versus throughput.

---

# 3. Flight Path Mechanics

## 3.1 Aircraft State Machine

Each aircraft progresses through a sequence of states. The transition depends on runway availability at the time of arrival and queue position.

### Happy Path (runway free, no queue)

1. **ARRIVING:** Aircraft spawns bottom-left of screen, flying toward airport centre point.
2. **APPROACH:** Aircraft flies direct to dynamically calculated base turn point, executes 3°/sec turn onto runway heading, crosses the final approach point aligned with runway.
3. **LANDING:** Aircraft touches down on runway, decelerates to stop at 75% runway length.
4. **LANDED:** Aircraft removed from game space. Value added to bank balance. Runway unlocked.

### Queue Path (runway locked)

1. **ARRIVING:** Aircraft spawns bottom-left of screen, flying toward airport centre point.
2. **HOLDING:** Aircraft routes to holding fix and enters racetrack holding pattern. Fuel timer counts down. Aircraft is placed in queue.
3. **APPROACH:** When released from queue (runway unlocks, aircraft is top of queue), aircraft flies from current position direct to base turn point, then turns onto final approach.
4. **LANDING:** As above.
5. **LANDED:** As above.

### Divert Path (fuel exhausted in queue)

1. Fuel endurance timer reaches zero while in HOLDING state.
2. **DIVERTED:** Aircraft removed from queue. Aircraft flies off screen in a random direction.
3. Aircraft value is subtracted from airport bank balance.

**Key rule:** Once an aircraft enters APPROACH state (released from queue or direct approach), the fuel endurance timer stops counting down. The aircraft is guaranteed to complete its landing. This represents the aircraft having committed to the approach with sufficient fuel to land.

## 3.2 Holding Pattern Geometry

The holding pattern follows real-world aviation conventions for a standard racetrack hold.

| Component | Specification |
|-----------|---------------|
| Holding Fix | Fixed x,y position in game space. All aircraft fly over this point. |
| Inbound Leg | Straight flight path toward the holding fix, direction left to right. |
| Outbound Leg | Straight flight path away from the holding fix, direction right to left. Duration: 5 seconds. |
| Turns | Standard rate turns at 3° per second, always to the right. |
| Turn Duration | 180° ÷ 3°/sec = 60 seconds per turn. |
| Speed Effect | All aircraft share the same holding fix and turn rate. Faster aircraft produce a larger racetrack footprint because they cover more distance per second during both straight legs and turns. |
| Vertical Stacking | Multiple aircraft may hold over the same fix simultaneously. Visual differentiation is needed (see Section 7). |

## 3.3 Approach Path Geometry

When an aircraft is released to land (either from the queue or on direct arrival with runway free), it flies a curved approach path to align with the runway.

### Key Points

**Final Approach Point:** A fixed x,y position on the extended runway centreline. This is where the aircraft must be aligned with the runway heading. This point is the same for all aircraft regardless of size or speed.

**Base Turn Point:** Not a fixed position. It is dynamically calculated for each aircraft based on its speed. The base turn point is the position where, if the aircraft begins a 3°/sec turn, it will roll out on the runway heading exactly as it crosses the final approach point.

**Speed Effect on Path:** A slower aircraft has a tighter turn radius, so its base turn point is closer to the final approach point and the approach arc is compact. A faster aircraft has a wider turn radius, so its base turn point is further from the final approach point and the approach arc sweeps wider. This is visually distinctive and gives the player intuitive speed feedback.

### Approach Sequence

1. Aircraft flies in a straight line from its current position toward the calculated base turn point.
2. At the base turn point, aircraft begins a 3°/sec turn toward the runway heading.
3. Turn completes as aircraft crosses the final approach point, now aligned with runway centreline.
4. Aircraft continues straight along runway centreline to threshold and touchdown.

### Turn Radius Calculation

Turn rate: 3°/sec (standard rate). Turn radius = speed / angular velocity. Since speed varies by aircraft, the turn radius scales linearly with speed. The base turn point is offset perpendicular to the runway centreline at a distance equal to the turn radius.

## 3.4 Landing and Deceleration

Once the aircraft crosses the runway threshold and touches down, it decelerates to a stop.

| Parameter | Value |
|-----------|-------|
| Touchdown point | Runway threshold (start of runway) |
| Stop point | 75% of runway length from threshold |
| Deceleration | Calculated per aircraft: deceleration rate = v² / (2 × 0.75 × runway length), where v is touchdown speed in game units/sec |
| Runway lock | Runway remains locked from the moment the aircraft is released from queue/begins approach until the aircraft has stopped and is removed |

## 3.5 Spawn and Arrival

| Parameter | Value |
|-----------|-------|
| Spawn location | Bottom-left corner of game screen |
| Initial heading | Toward airport centre point |
| Callsign generation | 3 random uppercase alpha characters (A–Z) |
| Size assignment | Random per spawn weights: Small 50%, Medium 35%, Large 15% |
| Simultaneous arrivals | Not possible. Only one aircraft spawns at a time. |

---

# 4. Queue System

## 4.1 Queue Mechanics

The queue is the central player-interaction system. Aircraft in holding are placed in a queue that determines landing order.

| Mechanic | Behaviour |
|----------|-----------|
| Entry | Aircraft enters queue at the back when it begins holding |
| Release | Automatic. When runway unlocks, the aircraft at position 1 (top) is immediately released to commence approach |
| Advancement | When an aircraft is released or diverts, all remaining aircraft advance one position |
| Reordering | Player can drag and drop queue entries to change order |
| Divert removal | Aircraft removed from queue when fuel timer hits zero |

## 4.2 Queue and Runway Interaction

The queue polls the runway state. When the runway transitions from locked to unlocked, the queue immediately releases the top aircraft. The runway is re-locked by the released aircraft as it begins its approach. This means there is no gap between landings unless the queue is empty.

If the runway is unlocked due to weather clearing but an aircraft was mid-approach when weather began, that aircraft completes its landing first. The runway only truly unlocks after the landing aircraft is removed.

## 4.3 Edge Case: Drag During Release

If the player is actively dragging a queue entry when the runway unlocks, the current top-of-queue aircraft is released regardless. The drag operation applies to the queue state after the release. This prevents the player from accidentally blocking releases.

---

# 5. Weather System

## 5.1 Storm Events

Poor weather events add pressure by temporarily closing the runway, forcing queue buildup and increasing divert risk.

| Parameter | Value |
|-----------|-------|
| Trigger | Random timer between 2 minutes and 5 minutes from game start and from end of previous storm |
| Duration | 15 seconds |
| Effect | Runway is locked for the duration. No aircraft can commence a new approach. |
| In-progress landing | Any aircraft already on approach when weather begins will complete its landing normally. |
| Queue behaviour | Queue continues to operate (fuel timers count down, player can reorder) but no releases occur until weather clears and runway unlocks. |
| Visual feedback | To be determined in UI design phase. Should clearly indicate weather status to player. |

## 5.2 Weather and Runway Lock Interaction

When a storm begins, the runway lock state depends on current activity. If the runway is free, it is locked with lockedBy set to 'weather'. If an aircraft is currently on approach or landing, the runway remains locked by that aircraft. When the aircraft completes landing and would normally unlock the runway, the runway remains locked by weather if the storm is still active. The runway only unlocks when both conditions are met: no aircraft is on the runway and no storm is active.

---

# 6. Difficulty Scaling and Arrival System

## 6.1 Arrival Timer

Aircraft arrive on a timer with jitter. The base interval decreases over time, increasing pressure.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Starting interval | 40 seconds | Time between aircraft spawns at game start |
| Jitter | ±3 seconds | Random offset applied to each spawn interval |
| Ramp rate | Every 2 minutes | Interval at which difficulty increases |
| Ramp amount | -5 seconds per step | Reduction in spawn interval per difficulty step |
| Minimum interval | To be tuned | Floor value to prevent impossible spawn rates |

## 6.2 Difficulty Progression Example

| Game Time | Base Interval | Effective Range (with jitter) |
|-----------|---------------|-------------------------------|
| 0:00 – 2:00 | 40 sec | 37–43 sec |
| 2:00 – 4:00 | 35 sec | 32–38 sec |
| 4:00 – 6:00 | 30 sec | 27–33 sec |
| 6:00 – 8:00 | 25 sec | 22–28 sec |
| 8:00 – 10:00 | 20 sec | 17–23 sec |
| 10:00 – 12:00 | 15 sec | 12–18 sec |
| 12:00+ | 10 sec (floor TBD) | 7–13 sec |

The interaction between decreasing arrival intervals, weather events, and fuel endurance timers creates an escalating challenge. As intervals shrink, the queue grows faster, fuel pressure increases, and weather events become proportionally more punishing.

---

# 7. User Interface Layout

## 7.1 Screen Composition

The screen is divided into two areas: the game view (left/centre, approximately 70–75% of screen width) and the queue panel (right, approximately 25–30% of screen width).

### Game View

Top-down, static camera. Contains the runway, holding pattern, aircraft, and approach paths. The runway is positioned in the game area with the holding fix at a suitable distance to allow the racetrack pattern and approach arcs to be visible. Exact positioning is a prototyping decision, guided by ensuring all flight paths fit on screen.

### Queue Panel

Displayed as a vertical list/table on the right side of the screen. Each entry is a card representing one queued aircraft.

| Card Element | Content |
|--------------|---------|
| Callsign | 3-letter callsign (e.g. JRT) |
| Fuel Endurance | Remaining time displayed as mm:ss, counting down in real time |
| Value | Dollar value of the aircraft |
| Position indicator | Top of list = next to land |

### Queue Card Colour States

| Condition | Card Colour | Meaning |
|-----------|-------------|---------|
| Endurance > 60 sec | Default (neutral) | Aircraft is safe |
| Endurance ≤ 60 sec | Yellow | Warning: fuel getting low |
| Endurance ≤ 30 sec | Red | Critical: imminent divert risk |

### Queue Interaction

The player reorders the queue by clicking and dragging individual cards to a new position. This is the primary player interaction in the game. On the eventual iOS version, this will be a touch drag gesture.

## 7.2 Status Display

The following information must be persistently visible to the player. Exact placement is a UI design decision for prototyping.

| Element | Content | Notes |
|---------|---------|-------|
| Bank Balance | Current dollar amount | Primary score display. Updates on landing and divert. |
| Win Target | $500,000 | Can be shown as a progress bar or target marker |
| Runway Status | Open / Occupied / Weather Closed | Clear visual indicator |
| Game Time | Elapsed time since game start | Helps player anticipate difficulty ramps |
| Weather Warning | Storm approaching / Storm active | Visual and/or text warning |

## 7.3 Holding Pattern Visualisation

Multiple aircraft may occupy the holding pattern simultaneously. Since this is a top-down view and vertical stacking is not visually distinct, aircraft in holding should be visually differentiated. Options for prototyping include: slight lateral offsets in orbit, callsign labels rendered on each aircraft, or different orbit sizes per queue position. The exact approach is a visual design decision to be resolved during prototyping.

## 7.4 Aircraft State Indicators

Aircraft render additional visual indicators overlaid on their silhouette to communicate state at a glance.

| State | Indicator | Colour | Description |
|-------|-----------|--------|-------------|
| APPROACH | Diamond outline | Yellow (#FFDD00) | A diamond shape is drawn centred on the aircraft, with vertices extending approximately 18 scaled units above, below, left, and right. Rendered as a stroke (outline only, not filled). |

The approach indicator serves as an immediate visual cue that an aircraft has been cleared and is committed to landing. This is particularly useful when multiple aircraft are visible — the player can quickly identify which aircraft are in the approach phase versus holding.

No additional state indicators are defined at this time. Future states may receive indicators as the game is developed.

---

# 8. Tuning Configuration

All tuning values must be centralised in a single configuration file or constants block. This enables rapid iteration during playtesting without code changes scattered across multiple modules.

## 8.1 Complete Tuning Parameter Reference

| Category | Parameter | Initial Value | Notes |
|----------|-----------|---------------|-------|
| Economy | Starting balance | $10,000 | |
| Economy | Win target | $500,000 | |
| Economy | Small aircraft value | $1,000 | Earned on land, lost on divert |
| Economy | Medium aircraft value | $3,000 | |
| Economy | Large aircraft value | $6,000 | |
| Aircraft | Small speed (kts) | 90 | |
| Aircraft | Medium speed (kts) | 140 | |
| Aircraft | Large speed (kts) | 200 | |
| Aircraft | Small fuel endurance | 120 sec | |
| Aircraft | Medium fuel endurance | 150 sec | |
| Aircraft | Large fuel endurance | 180 sec | |
| Aircraft | Small spawn weight | 50% | |
| Aircraft | Medium spawn weight | 35% | |
| Aircraft | Large spawn weight | 15% | |
| Arrivals | Starting interval | 40 sec | |
| Arrivals | Jitter | ±3 sec | |
| Arrivals | Ramp frequency | Every 2 min | |
| Arrivals | Ramp amount | -5 sec | |
| Arrivals | Minimum interval | TBD | Needs playtesting |
| Holding | Outbound leg duration | 5 sec | |
| Holding | Turn rate | 3°/sec | Standard rate turn |
| Approach | Turn rate | 3°/sec | Same as holding |
| Landing | Stop point | 75% runway length | |
| Weather | Storm min interval | 2 min | Time between storms |
| Weather | Storm max interval | 5 min | |
| Weather | Storm duration | 15 sec | |
| Runway | Length | TBD (game units) | |
| Runway | Width | TBD (game units) | |

---

# 9. Design Notes and Watchpoints

## 9.1 Death Spiral Risk

The divert penalty (subtracting aircraft value from balance) combined with weather events that lock the runway can create cascading failures. A single weather event during heavy traffic could cause multiple diverts, rapidly draining the bank balance. This may be the intended tension, or it may need mitigation. Possible mitigations to test include: capping the number of simultaneous diverts, reducing divert penalty to a fraction of aircraft value, or providing a brief grace period after weather clears before fuel timers resume. This is a priority playtesting item.

## 9.2 Queue Ordering as Core Mechanic

The player's primary agency is queue reordering. The key decisions are: prioritise low-fuel aircraft to prevent diverts (defensive play), or prioritise fast/large aircraft to clear the runway quickly and earn more (aggressive play). The tension between these strategies is the game. If playtesting reveals that one strategy always dominates, the tuning values (speed, fuel, value) should be adjusted to restore meaningful choice.

## 9.3 Speed-Based Geometry

Using speed to drive all position calculations (holding pattern shape, approach arc width, runway deceleration) means the simulation is internally consistent. However, this requires careful implementation of the physics update loop. Position should be updated each frame based on speed and heading, with heading changes capped at 3°/sec during turns. The game loop should use a fixed time step (e.g. 60 updates per second) or delta-time scaling to ensure consistent behaviour regardless of frame rate.

## 9.4 Abstract Game Units

All spatial values are in abstract game units with no fixed pixel mapping. The prototype should establish a coordinate system where the runway, holding fix, spawn point, and final approach point are positioned relative to each other in game units. Visual rendering then maps game units to screen coordinates with a configurable scale factor. This allows the same game logic to run at any resolution.

## 9.5 Future Features (Backlog)

The following features have been discussed but are explicitly out of scope for the prototype. They are noted here for future reference: multiple runways, runway size restrictions (small runway cannot accept large aircraft), helicopter pads, scoring and leaderboards, unlockable upgrades and progression, and additional game events beyond weather.

---

# 10. Glossary

| Term | Definition |
|------|------------|
| Holding Fix | The fixed x,y point that all holding pattern orbits pass through |
| Racetrack Pattern | The oval holding pattern flown by aircraft waiting to land, consisting of two straight legs connected by 180° turns |
| Base Turn Point | The dynamically calculated point where an aircraft begins its turn onto the runway heading. Not fixed; varies with aircraft speed. |
| Final Approach Point | The fixed x,y point on the extended runway centreline where the aircraft must be aligned with the runway heading after completing its base turn |
| Standard Rate Turn | A turn at 3° per second, standard in aviation. Completes 360° in 2 minutes. |
| Divert | When an aircraft runs out of fuel endurance and must leave the airspace without landing. Results in a financial penalty. |
| Runway Lock | The state where a runway is unavailable for new approaches. Caused by an aircraft on approach/landing or by weather. |
| Game Units | Abstract spatial units used for all positions and dimensions. No fixed mapping to pixels. |
