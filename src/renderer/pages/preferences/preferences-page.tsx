import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import {PreferencesStore} from "../../../store/preferences-store";

const {
  Component: {Input},
} = Renderer;

export const PreferencesPage = observer(() => {
  // @ts-ignore
  const preferencesStore: PreferencesStore = PreferencesStore.getInstanceOrCreate<PreferencesStore>();

  return (
    <div>
      <div style={{marginTop: 8, fontWeight: "bold"}}>Kamaji base url</div>
      <Input
        placeholder="Write here the base url of your kamaji console"
        value={preferencesStore.kamajiBaseUrl}
        onChange={(value: string) => {
          console.log(`value: ${value}`);
          preferencesStore.kamajiBaseUrl = value;
        }}
      />
    </div>
  )
});
