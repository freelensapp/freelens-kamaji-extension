import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { KamajiPreferencesStore } from "../../common/store";

const {
  Component: { Checkbox },
} = Renderer;

const preferences = KamajiPreferencesStore.getInstanceOrCreate();

export const KamajiPreferenceInput = observer(() => {
  return (
    <Checkbox
      label="Kamaji checkbox"
      value={preferences.enabled}
      onChange={(v) => {
        console.log(`[EXAMPLE-PREFERENCES-STORE] onChange ${v}`);
        preferences.enabled = v;
      }}
    />
  );
});

export const KamajiPreferenceHint = () => <span>This is an kamaji of an preference for extensions.</span>;
