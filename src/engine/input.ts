/** Keyboard/mouse state with per-frame edge detection and pointer lock. */
export class Input {
  private down = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private releasedThisFrame = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  sensitivity = 0.0022;
  /** When false (a menu is open) game controls ignore input. */
  enabled = true;
  private lastSpace = 0;
  doubleTapSpace = false;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.down.has(e.code)) {
        this.pressedThisFrame.add(e.code);
        if (e.code === 'Space') {
          const now = performance.now();
          if (now - this.lastSpace < 280) this.doubleTapSpace = true;
          this.lastSpace = now;
        }
      }
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.releasedThisFrame.add(e.code);
    });
    window.addEventListener('blur', () => this.down.clear());
    element.addEventListener('mousedown', (e) => {
      const code = `Mouse${e.button}`;
      if (!this.locked && this.enabled) {
        this.lock();
        return;
      }
      this.down.add(code);
      this.pressedThisFrame.add(code);
    });
    window.addEventListener('mouseup', (e) => {
      const code = `Mouse${e.button}`;
      this.down.delete(code);
      this.releasedThisFrame.add(code);
    });
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    window.addEventListener(
      'wheel',
      (e) => {
        if (this.locked) this.wheel += Math.sign(e.deltaY);
      },
      { passive: true },
    );
  }

  get locked(): boolean {
    return document.pointerLockElement === this.element;
  }

  lock(): void {
    const p = this.element.requestPointerLock() as unknown as Promise<void> | undefined;
    p?.catch?.(() => undefined);
  }

  unlock(): void {
    if (this.locked) document.exitPointerLock();
  }

  isDown(code: string): boolean {
    return this.enabled && this.down.has(code);
  }

  pressed(code: string): boolean {
    return this.enabled && this.pressedThisFrame.has(code);
  }

  released(code: string): boolean {
    return this.releasedThisFrame.has(code);
  }

  /** Simulate input (used by tests / debug hooks). */
  simulatePress(code: string): void {
    this.pressedThisFrame.add(code);
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.doubleTapSpace = false;
  }
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
