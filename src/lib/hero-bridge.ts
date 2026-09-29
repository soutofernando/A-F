type Listener = (dolly: number) => void;

let dolly = 0;
const listeners = new Set<Listener>();

export function setHeroDolly(value: number) {
  dolly = value;
  listeners.forEach((listener) => listener(value));
}

export function subscribeHeroDolly(listener: Listener) {
  listeners.add(listener);
  listener(dolly);
  return () => {
    listeners.delete(listener);
  };
}
