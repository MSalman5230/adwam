const minute = 60_000;

export function runMinuteClock(update: (now: number) => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  function tick() {
    const now = Date.now();
    update(now);
    timer = setTimeout(tick, minute - now % minute);
  }
  tick();
  return () => clearTimeout(timer);
}
