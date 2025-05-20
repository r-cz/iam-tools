import { describe, expect, test, beforeEach, mock } from 'bun:test';

// Test the core logic of useSelectiveState without React dependencies
describe('Selective State Management', () => {
  const TEST_KEY = 'test-selective-state';
  
  // Mock localStorage
  const mockStorage: Record<string, string> = {};
  
  const getItem = mock((key: string) => mockStorage[key] || null);
  const setItem = mock((key: string, value: string) => { mockStorage[key] = value; });
  const clear = mock(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); });
  
  // Reset mocks and storage before each test
  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
    getItem.mockClear();
    setItem.mockClear();
    clear.mockClear();
  });
  
  // Helper function to simulate the filter functionality from useSelectiveState
  function filterObject<T extends Record<string, any>>(obj: T, keysToInclude?: (keyof T)[]) {
    if (!keysToInclude) return { ...obj };
    return keysToInclude.reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as Partial<T>);
  }
  
  // Helper to get only storable object (simulates the hook's internal function)
  function getStorableObject<T extends Record<string, any>>(
    obj: T, 
    includeKeys?: (keyof T)[], 
    excludeKeys?: (keyof T)[]
  ) {
    if (includeKeys) {
      return filterObject(obj, includeKeys);
    }
    
    if (excludeKeys) {
      const keysToInclude = Object.keys(obj)
        .filter(k => !excludeKeys.includes(k as keyof T)) as (keyof T)[];
      return filterObject(obj, keysToInclude);
    }
    
    return { ...obj };
  }
  
  // Load initial state helper (simulates the hook's loadInitialState function)
  function loadInitialState<T extends Record<string, any>>(
    key: string, 
    initialValue: T,
    migrate?: (data: any) => any
  ) {
    const stored = getItem(key);
    
    if (!stored) return initialValue;
    
    try {
      const storedData = JSON.parse(stored) as Partial<T>;
      const migratedData = migrate ? migrate(storedData) : storedData;
      
      return {
        ...initialValue,
        ...migratedData
      };
    } catch (error) {
      return initialValue;
    }
  }
  
  // Test initialization and loading
  test('should initialize with provided initial value', () => {
    const initialValue = { count: 0, name: 'test', transient: true };
    
    const state = loadInitialState(TEST_KEY, initialValue);
    
    expect(state).toEqual(initialValue);
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledWith(TEST_KEY);
  });
  
  test('should load from storage and merge with initial value', () => {
    const initialValue = { count: 0, name: 'test', transient: true, newProp: 'default' };
    const storedValue = { count: 5, name: 'stored' };
    
    mockStorage[TEST_KEY] = JSON.stringify(storedValue);
    
    const state = loadInitialState(TEST_KEY, initialValue);
    
    expect(state).toEqual({
      ...initialValue,
      ...storedValue
    });
    expect(getItem).toHaveBeenCalledTimes(1);
  });
  
  test('should apply migrations when loading state', () => {
    const initialValue = { count: 0, name: 'test', version: 2 };
    const storedValue = { count: 5, name: 'stored', version: 1 };
    
    mockStorage[TEST_KEY] = JSON.stringify(storedValue);
    
    const migrateFn = mock((stored: any) => ({
      ...stored,
      version: 2,
      name: `${stored.name}-migrated`
    }));
    
    const state = loadInitialState(TEST_KEY, initialValue, migrateFn);
    
    expect(migrateFn).toHaveBeenCalledTimes(1);
    expect(migrateFn).toHaveBeenCalledWith(storedValue);
    expect(state).toEqual({
      count: 5,
      name: 'stored-migrated',
      version: 2
    });
  });
  
  // Test persistence with includeKeys
  test('should only persist included keys', () => {
    const state = { count: 1, name: 'test', transient: false };
    const includeKeys = ['count', 'name'];
    
    const storableObj = getStorableObject(state, includeKeys);
    setItem(TEST_KEY, JSON.stringify(storableObj));
    
    expect(storableObj).toEqual({ count: 1, name: 'test' });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(TEST_KEY, JSON.stringify({ count: 1, name: 'test' }));
    expect(JSON.parse(mockStorage[TEST_KEY])).toEqual({ count: 1, name: 'test' });
  });
  
  // Test persistence with excludeKeys
  test('should exclude specified keys', () => {
    const state = { count: 1, name: 'test', transient: false };
    const excludeKeys = ['transient'];
    
    const storableObj = getStorableObject(state, undefined, excludeKeys);
    setItem(TEST_KEY, JSON.stringify(storableObj));
    
    expect(storableObj).toEqual({ count: 1, name: 'test' });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(TEST_KEY, JSON.stringify({ count: 1, name: 'test' }));
    expect(JSON.parse(mockStorage[TEST_KEY])).toEqual({ count: 1, name: 'test' });
  });
  
  // Test useEphemeralState logic
  test('useEphemeralState should exclude ephemeral keys from persistence', () => {
    const state = { 
      persistent: 'updated', 
      ephemeral1: 'changed', 
      ephemeral2: { complex: 'object' } 
    };
    const ephemeralKeys = ['ephemeral1', 'ephemeral2'];
    
    const storableObj = getStorableObject(state, undefined, ephemeralKeys);
    setItem(TEST_KEY, JSON.stringify(storableObj));
    
    expect(storableObj).toEqual({ persistent: 'updated' });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(TEST_KEY, JSON.stringify({ persistent: 'updated' }));
    expect(JSON.parse(mockStorage[TEST_KEY])).toEqual({ persistent: 'updated' });
  });
});