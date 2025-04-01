import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A hook to get URL search parameters.
 * @returns An object with the URL search parameters
 */
export function useUrlParams<T extends Record<string, string>>(): T {
  const location = useLocation();
  const [params, setParams] = useState<T>({} as T);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paramsObject: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      paramsObject[key] = value;
    });

    setParams(paramsObject as T);
  }, [location.search]);

  return params;
}
