'use client';

import { useCallback, useState } from 'react';

export function useRageClickHint() {
  const [hasClickedOnce, setHasClickedOnce] = useState(false);

  const registerClick = useCallback(() => {
    setHasClickedOnce(true);
  }, []);

  return { hasClickedOnce, registerClick };
}
