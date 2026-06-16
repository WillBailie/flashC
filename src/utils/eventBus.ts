type Listener = () => void;
type EventName = 'decks-changed';

const listeners = new Map<EventName, Set<Listener>>();

function ensure(event: EventName): Set<Listener> {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  return set;
}

export function on(event: EventName, listener: Listener): () => void {
  ensure(event).add(listener);
  return () => {
    ensure(event).delete(listener);
  };
}

export function emit(event: EventName): void {
  ensure(event).forEach((fn) => fn());
}
