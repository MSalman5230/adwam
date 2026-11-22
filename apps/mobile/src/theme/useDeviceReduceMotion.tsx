import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const DeviceReduceMotion = createContext(false);

export function DeviceMotionProvider({ children }: { children: ReactNode }) {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return <DeviceReduceMotion.Provider value={reduced}>{children}</DeviceReduceMotion.Provider>;
}

export function useDeviceReduceMotion() {
  return useContext(DeviceReduceMotion);
}
