import { Main } from "@freelensapp/extensions";
import { PreferencesStore } from "../store/preferences-store";

export default class KamajiMain extends Main.LensExtension {
  async onActivate() {
    // @ts-ignore
    PreferencesStore.getInstanceOrCreate<PreferencesStore>().loadExtension(this);
  }
}
