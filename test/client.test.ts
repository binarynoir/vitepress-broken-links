// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableBrokenLinkHints } from '../src/client.js';

const HINT =
  '<span class="broken-link-hint" data-broken-link-hint="`/nope` does not exist." data-broken-link-hint-line="3" data-broken-link-hint-file="guide/api.md">the page</span>';
const NO_LOCATION = '<span class="broken-link-hint" data-broken-link-hint="Gone.">other page</span>';

const popover = () => document.querySelector<HTMLElement>('.broken-link-hint-popover');
const hint = (index = 0) => document.querySelectorAll<HTMLElement>('.broken-link-hint')[index];
const pointer = (type: string, target: Element, relatedTarget: Element | null = null) =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse', relatedTarget }));

let disable: () => void;

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = `<p>See ${HINT} and ${NO_LOCATION}.</p><p id="other">Other</p>`;
});

afterEach(() => {
  disable?.();
  vi.useRealTimers();
});

describe('enableBrokenLinkHints', () => {
  it('injects the underline, cursor and popover styles once', () => {
    disable = enableBrokenLinkHints();
    enableBrokenLinkHints()();
    const styles = document.querySelectorAll('#broken-link-hint-style');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain('cursor: not-allowed');
    expect(styles[0].textContent).toContain('underline wavy');
  });

  it('keeps only the touch rule with injectStyles: false', () => {
    disable = enableBrokenLinkHints({ injectStyles: false });
    const css = document.getElementById('broken-link-hint-style')!.textContent!;
    expect(css).toContain('cursor: pointer !important');
    expect(css).not.toContain('not-allowed');
  });

  it('opens a popover with the location and message on click, and closes it on a second click', () => {
    disable = enableBrokenLinkHints();
    hint().click();
    expect(popover()?.getAttribute('role')).toBe('tooltip');
    expect(popover()?.querySelector('.broken-link-hint-popover-location')?.textContent).toBe('guide/api.md, line 3');
    expect(popover()?.querySelector('code')?.textContent).toBe('/nope');
    expect(popover()?.textContent).toContain('does not exist.');
    hint().click();
    expect(popover()).toBeNull();
  });

  it('leaves out a missing location', () => {
    disable = enableBrokenLinkHints();
    hint(1).click();
    expect(popover()?.querySelector('.broken-link-hint-popover-location')).toBeNull();
  });

  it('closes on a click elsewhere and on Escape', () => {
    disable = enableBrokenLinkHints();
    hint().click();
    document.getElementById('other')!.click();
    expect(popover()).toBeNull();
    hint().click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(popover()).toBeNull();
  });

  it('opens on mouse hover after the delay and closes when the mouse leaves', () => {
    vi.useFakeTimers();
    disable = enableBrokenLinkHints({ hoverDelay: 300 });
    pointer('pointerover', hint());
    vi.advanceTimersByTime(299);
    expect(popover()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(popover()).not.toBeNull();
    pointer('pointerout', hint(), document.getElementById('other'));
    expect(popover()).toBeNull();
  });

  it('ignores hover with hover: false', () => {
    disable = enableBrokenLinkHints({ hover: false, hoverDelay: 0 });
    pointer('pointerover', hint());
    expect(popover()).toBeNull();
  });

  it('removes its listeners and popover when disabled', () => {
    disable = enableBrokenLinkHints();
    hint().click();
    disable();
    expect(popover()).toBeNull();
    hint().click();
    expect(popover()).toBeNull();
  });
});
