import { Main } from "@freelensapp/extensions";
import { KamajiPreferencesStore } from "../common/store";

export default class KamajiMain extends Main.LensExtension {
  async onActivate() {
    await KamajiPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }
}
