/**
 * The speed from which a vehicle counts as moving: the platform's own default (`move_speed_kmh` 5,
 * which it applies to two consecutive reports; a single reading is all this can see). Below it a
 * reading is GPS drift or a manoeuvre, and showing "Moving" with a pulsing marker for a parked
 * vehicle that wanders at 1 to 3 km/h is wrong.
 */
export const MOVING_MIN_KMH = 5

export function isMovingSpeed(speed: number | null | undefined): boolean {
  return (speed ?? 0) >= MOVING_MIN_KMH
}
