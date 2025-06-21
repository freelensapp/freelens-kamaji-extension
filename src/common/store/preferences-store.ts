import { Common } from "@freelensapp/extensions";
import { makeObservable, observable } from "mobx";

export interface KamajiPreferencesModel {
  enabled: boolean;
}

export class KamajiPreferencesStore extends Common.Store.ExtensionStore<KamajiPreferencesModel> {
  @observable accessor enabled = false;

  constructor() {
    super({
      configName: "kamaji-preferences-store",
      defaults: {
        enabled: false,
      },
    });
    console.log("[EXAMPLE-PREFERENCES-STORE] constructor");
    makeObservable(this);
  }

  static getInstanceOrCreate() {
    try {
      return this.getInstance();
    } catch (e) {
      if (e instanceof TypeError) {
        return this.createInstance();
      } else {
        throw e;
      }
    }
  }

  fromStore({ enabled }: KamajiPreferencesModel): void {
    console.log(`[EXAMPLE-PREFERENCES-STORE] set ${enabled}`);

    this.enabled = enabled;
  }

  toJSON(): KamajiPreferencesModel {
    const enabled = this.enabled;
    console.log(`[EXAMPLE-PREFERENCES-STORE] get ${enabled}`);
    return {
      enabled,
    };
  }
}
