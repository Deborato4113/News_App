import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTheme from '../hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('starts dark and switches to light, remembering the choice', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('dark');

    act(() => result.current[1]());
    expect(result.current[0]).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('nexusai_theme')).toBe('light');
  });

  it('toggles back to dark', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1]());
    act(() => result.current[1]());
    expect(result.current[0]).toBe('dark');
    expect(localStorage.getItem('nexusai_theme')).toBe('dark');
  });

  it('picks up a theme that was applied before React started', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('light');
  });
});
