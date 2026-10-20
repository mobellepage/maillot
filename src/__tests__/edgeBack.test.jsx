// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { EdgeBack } from '../app/EdgeBack.tsx';

afterEach(cleanup);

const touch = (type, x, y = 300) => {
  const e = new Event(type, { bubbles: true });
  const list = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
  Object.assign(e, { touches: list, changedTouches: [{ clientX: x, clientY: y }] });
  act(() => document.body.dispatchEvent(e));
};

function setup(standalone) {
  vi.stubGlobal('matchMedia', (q) => ({ matches: standalone && q.includes('standalone'), addEventListener() {}, removeEventListener() {} }));
  render(
    <MemoryRouter initialEntries={['/', '/u/someone/shirt']} initialIndex={1}>
      <EdgeBack />
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/u/:handle/:item" element={<p>shirt</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EdgeBack (swipe from the left edge in the app)', () => {
  it('goes back to the page before', () => {
    setup(true);
    window.history.replaceState({ idx: 1 }, '');
    expect(screen.getByText('shirt')).toBeTruthy();
    touch('touchstart', 8);
    touch('touchmove', 140);
    touch('touchend', 140);
    expect(screen.getByText('home')).toBeTruthy();
  });

  it('does nothing in a normal browser tab (the browser has its own gesture)', () => {
    setup(false);
    window.history.replaceState({ idx: 1 }, '');
    touch('touchstart', 8);
    touch('touchmove', 140);
    touch('touchend', 140);
    expect(screen.getByText('shirt')).toBeTruthy();
  });

  it('ignores swipes that start away from the edge or are too short', () => {
    setup(true);
    window.history.replaceState({ idx: 1 }, '');
    touch('touchstart', 120);
    touch('touchmove', 300);
    touch('touchend', 300);
    touch('touchstart', 6);
    touch('touchmove', 40);
    touch('touchend', 40);
    expect(screen.getByText('shirt')).toBeTruthy();
  });
});
