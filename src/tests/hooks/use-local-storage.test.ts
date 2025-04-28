import { describe, expect, test, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react'; // Import renderHook and act
import { useLocalStorage } from '../../hooks/use-local-storage'; // Import the hook

describe('useLocalStorage', () => {
  // Clear localStorage before each test to ensure isolation
  beforeEach(() => {
    localStorage.clear();
  });

  test('should return the initial value if nothing is in localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    expect(result.current[0]).toBe('initialValue');
    expect(localStorage.getItem('testKey')).toBeNull(); // Should not write to storage initially
  });

  test('should update localStorage when the value changes', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
    const [, setValue] = result.current;

    act(() => {
      setValue('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(localStorage.getItem('testKey')).toBe(JSON.stringify('newValue'));
  });

  test('should return the value from localStorage if it exists', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  test('should remove the item from localStorage when setting to undefined or null', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
    const [, setValue] = result.current;

    act(() => {
      setValue(null); // Or undefined, depending on hook implementation
    });

    expect(result.current[0]).toBeNull(); // Or undefined
    expect(localStorage.getItem('testKey')).toBeNull();
  });

  // Add more tests for different data types (objects, arrays) if the hook supports them
  test('should handle objects', () => {
    const { result } = renderHook(() => useLocalStorage('objectKey', { name: 'initial' }));
    const [, setValue] = result.current;

    act(() => {
      setValue({ name: 'updated' });
    });

    expect(result.current[0]).toEqual({ name: 'updated' });
    expect(localStorage.getItem('objectKey')).toBe(JSON.stringify({ name: 'updated' }));
  });
});
