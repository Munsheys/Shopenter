import { useState, useEffect } from 'react';

export function useDelayedUnmount(open: boolean, delay = 200) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf: number;
    if (open) {
      setMounted(true);
      raf = requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), delay);
      return () => clearTimeout(t);
    }
    return () => cancelAnimationFrame(raf);
  }, [open, delay]);

  return { mounted, visible };
}
