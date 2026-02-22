export const NIGHT_ROOM_OPEN_HOUR = 21;
export const NIGHT_ROOM_CLOSE_HOUR = 4;

export function isNightRoomOpen(now = new Date()) {
  const hour = now.getHours();
  return hour >= NIGHT_ROOM_OPEN_HOUR || hour < NIGHT_ROOM_CLOSE_HOUR;
}

export function getNightRoomWindow(now = new Date()) {
  const current = new Date(now);
  const opensAt = new Date(current);
  const closesAt = new Date(current);
  opensAt.setHours(NIGHT_ROOM_OPEN_HOUR, 0, 0, 0);
  closesAt.setHours(NIGHT_ROOM_CLOSE_HOUR, 0, 0, 0);

  if (isNightRoomOpen(current)) {
    if (current.getHours() < NIGHT_ROOM_CLOSE_HOUR) {
      opensAt.setDate(opensAt.getDate() - 1);
    } else {
      closesAt.setDate(closesAt.getDate() + 1);
    }
  } else {
    if (current.getHours() >= NIGHT_ROOM_OPEN_HOUR) {
      opensAt.setDate(opensAt.getDate() + 1);
    }
    closesAt.setDate(opensAt.getDate());
    closesAt.setHours(NIGHT_ROOM_CLOSE_HOUR, 0, 0, 0);
    if (NIGHT_ROOM_CLOSE_HOUR < NIGHT_ROOM_OPEN_HOUR) {
      closesAt.setDate(closesAt.getDate() + 1);
    }
  }

  return { opensAt, closesAt };
}
