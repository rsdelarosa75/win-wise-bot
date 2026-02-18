import { useState } from "react";

interface UseVipReturn {
  isVIP: boolean;
  setVIP: (value: boolean) => void;
}

export const useVip = (): UseVipReturn => {
  const [isVIP, setIsVIP] = useState<boolean>(
    localStorage.getItem("bv_vip") === "true"
  );

  const setVIP = (value: boolean) => {
    if (value) {
      localStorage.setItem("bv_vip", "true");
    } else {
      localStorage.removeItem("bv_vip");
    }
    setIsVIP(value);
  };

  return { isVIP, setVIP };
};
