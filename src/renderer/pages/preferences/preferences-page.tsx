import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { usePreferencesStore } from "../../../store/use-preference-store";

const {
  Component: { Input },
} = Renderer;

export const PreferencesPage = observer((): any => {
  const preferencesStore = usePreferencesStore();

  return (
    <div>
      <div style={{marginTop: 8, fontWeight: "bold"}}>Kamaji base url</div>
      <Input
        placeholder="Write here the base url of your kamaji console"
        value={preferencesStore.kamajiBaseUrl}
        onChange={(value: string) => preferencesStore.kamajiBaseUrl = value}
      />
    </div>
  )
});
