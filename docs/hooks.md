# Hooks API

## Core Hooks

### `useLocalStorage`

Persists state in localStorage with automatic serialization/deserialization.

```tsx
const [value, setValue] = useLocalStorage<T>(key, initialValue);
```

### `useSelectiveState`

A specialized hook for managing state with granular control over which properties are persisted to localStorage.

```tsx
const [state, setState] = useSelectiveState<T>({
  key: 'storage-key',
  initialValue: { /* initial state */ },
  includeKeys: ['propertyToPersist1', 'propertyToPersist2'],
  // Or alternatively
  excludeKeys: ['temporaryProp1', 'temporaryProp2'],
  migrate: (storedData) => /* optional migration logic */,
  preserveOnUnmount: true // whether to save on unmount (default: true)
});
```

#### Options

- `key` - The localStorage key to use for persistence
- `initialValue` - Default state value if nothing is found in localStorage
- `includeKeys` - (Optional) Array of keys to include in persistence (if provided, only these keys will be stored)
- `excludeKeys` - (Optional) Array of keys to exclude from persistence (ignored if includeKeys is provided)
- `migrate` - (Optional) Function to apply migrations to stored data when loading
- `preserveOnUnmount` - (Optional) Whether to save to localStorage on component unmount (default: true)

### `useEphemeralState`

A simplified version of `useSelectiveState` that only requires specifying which keys are ephemeral (not persisted).

```tsx
const [state, setState] = useEphemeralState<T>(
  'storage-key',
  { /* initial state */ },
  ['temporaryProp1', 'temporaryProp2'],
  (storedData) => /* optional migration logic */
);
```

### `useDebounce`

Creates a debounced value that only updates after the specified delay.

```tsx
const debouncedValue = useDebounce<T>(value, delay);
```

### `useIsMobile`

Hook to detect whether the current viewport is mobile-sized.

```tsx
const isMobile = useIsMobile();
```

### `useClipboard`

Hook for copying text to the clipboard with success/error state.

```tsx
const { copy, error, success, reset } = useClipboard();

// Usage
copy('Text to copy');
```

### `useUrlParams`

Hook to read and update URL parameters.

```tsx
const [urlParams, setUrlParams] = useUrlParams();
```

## Data Fetching Hooks

Specialized hooks for fetching IAM-related data are available in the `hooks/data-fetching` directory:

### `useOidcConfig`

```tsx
const { data, error, isLoading, refetch } = useOidcConfig(issuerUrl);
```

### `useJwks`

```tsx
const { data, error, isLoading, refetch } = useJwks(jwksUri);
```