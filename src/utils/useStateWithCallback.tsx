import { useState, useEffect } from "react";

const useStateWithCallback = <T,>(
  initialValue: T,
  callback: (newState: T) => void
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    callback(state);
  }, [state]);
  return [state, setState];
};

export default useStateWithCallback;
