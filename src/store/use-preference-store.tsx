import { useMemo } from "react";
import { PreferencesStore } from "./preferences-store";

export const usePreferencesStore = (): PreferencesStore => {
  return useMemo(
    () => {
      // @ts-ignore
      return PreferencesStore.getInstanceOrCreate<PreferencesStore>();
    },
    []
  );
}
