import React from 'react';
import { useSelectiveState, useEphemeralState } from '../use-selective-state';

/**
 * Example component showing usage of useSelectiveState
 */
export function SelectiveStateExample() {
  // Define a complex state with some transient (ephemeral) data
  const [formState, setFormState] = useSelectiveState({
    key: 'form-state-example',
    initialValue: {
      // Persistent data
      username: '',
      email: '',
      preferences: {
        notifications: true,
        darkMode: false,
      },
      
      // Ephemeral data we don't want to persist
      isSubmitting: false,
      validationErrors: {},
      lastFocusedField: null as string | null,
    },
    // Only persist these specific keys
    includeKeys: ['username', 'email', 'preferences'],
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('preferences.')) {
      // Handle nested preferences
      const prefName = name.split('.')[1];
      setFormState({
        ...formState,
        preferences: {
          ...formState.preferences,
          [prefName]: type === 'checkbox' ? checked : value,
        },
      });
    } else {
      // Handle regular fields
      setFormState({
        ...formState,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set transient state
    setFormState({
      ...formState,
      isSubmitting: true,
      lastFocusedField: null as string | null,
    });
    
    // Simulate API call
    setTimeout(() => {
      setFormState({
        ...formState,
        isSubmitting: false,
      });
      
      alert('Form submitted!');
    }, 1000);
  };
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      lastFocusedField: e.target.name,
    });
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Selective State Example</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Username
            <input
              type="text"
              name="username"
              value={formState.username}
              onChange={handleInputChange}
              onFocus={handleFocus}
              className="mt-1 block w-full rounded-md border p-2"
            />
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Email
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleInputChange}
              onFocus={handleFocus}
              className="mt-1 block w-full rounded-md border p-2"
            />
          </label>
        </div>
        
        <div>
          <label className="flex items-center text-sm font-medium">
            <input
              type="checkbox"
              name="preferences.notifications"
              checked={formState.preferences.notifications}
              onChange={handleInputChange}
              className="mr-2"
            />
            Enable Notifications
          </label>
        </div>
        
        <div>
          <label className="flex items-center text-sm font-medium">
            <input
              type="checkbox"
              name="preferences.darkMode"
              checked={formState.preferences.darkMode}
              onChange={handleInputChange}
              className="mr-2"
            />
            Dark Mode
          </label>
        </div>
        
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {formState.isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Current State:</h3>
        <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-80">
          {JSON.stringify(formState, null, 2)}
        </pre>
        
        <p className="mt-2 text-sm text-gray-500">
          Note: Only <code>username</code>, <code>email</code>, and <code>preferences</code> will be 
          persisted to localStorage. The ephemeral values are only kept in memory.
        </p>
        
        {formState.lastFocusedField && (
          <p className="mt-2 text-sm">
            Last focused field: <code>{formState.lastFocusedField}</code>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Example component showing the simpler useEphemeralState
 */
export function EphemeralStateExample() {
  // Using the simpler version with just a list of fields to exclude
  const [state, setState] = useEphemeralState(
    'ephemeral-state-example',
    {
      // Persistent data
      counter: 0,
      settings: {
        autoSave: true,
      },
      
      // Ephemeral data
      isLoading: false,
      tempMessage: '',
    },
    // Keys to exclude from persistence
    ['isLoading', 'tempMessage']
  );
  
  const incrementCounter = () => {
    setState({
      ...state,
      counter: state.counter + 1,
      isLoading: true,
      tempMessage: 'Incrementing...',
    });
    
    // Reset ephemeral state after delay
    setTimeout(() => {
      setState(current => ({
        ...current,
        isLoading: false,
        tempMessage: `Incremented to ${current.counter}`,
      }));
    }, 500);
  };
  
  const toggleAutoSave = () => {
    setState({
      ...state,
      settings: {
        ...state.settings,
        autoSave: !state.settings.autoSave,
      },
    });
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Ephemeral State Example</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-lg">Counter: {state.counter}</p>
          {state.tempMessage && (
            <p className="text-sm text-gray-600">{state.tempMessage}</p>
          )}
          <button
            onClick={incrementCounter}
            disabled={state.isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded mt-2"
          >
            {state.isLoading ? 'Loading...' : 'Increment'}
          </button>
        </div>
        
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={state.settings.autoSave}
              onChange={toggleAutoSave}
              className="mr-2"
            />
            Auto-save
          </label>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Current State:</h3>
        <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-80">
          {JSON.stringify(state, null, 2)}
        </pre>
        
        <p className="mt-2 text-sm text-gray-500">
          Note: Only <code>counter</code> and <code>settings</code> will be 
          persisted to localStorage. <code>isLoading</code> and <code>tempMessage</code> 
          are ephemeral.
        </p>
      </div>
    </div>
  );
}