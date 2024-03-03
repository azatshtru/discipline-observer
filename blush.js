let RUNNING = undefined;
export const signal = {
  get value() {
    if (RUNNING) { this.dependencies.add(RUNNING) };
    return this._value;
  },
  set value(v) {
    if (v === this._value) { return; }
    this._value = v;
    this.notifyDependents();
  },
  notifyDependents() {
    this.dependencies.forEach(x => x.update());
  }
}

export const effect = {
  update() {
    this.fn();
  }
}

export function createSignal(v) {
  const s = Object.create(signal)
  s._value = v;
  s.dependencies = new Set();
  return s;
}

export function createEffect(fn) {
  const e = Object.create(effect);
  e.fn = fn;
  RUNNING = e;
  e.fn();
  RUNNING = undefined;
}