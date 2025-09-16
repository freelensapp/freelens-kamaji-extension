import { Common } from "@freelensapp/extensions";
import { makeObservable, observable, toJS } from "mobx";

export interface KamajiPreferences {
  kamajiBaseUrl: string;
}

export class PreferencesStore extends Common.Store.ExtensionStore<KamajiPreferences> {
  // Persistent
  @observable accessor kamajiBaseUrl: string = "";

  constructor() {
    super({
      configName: "kamaji-preferences-store",
      defaults: {
        kamajiBaseUrl: "http://localhost/ui/api/trpc/"
      }
    });
    makeObservable(this);
  }

  fromStore = (kamajiPreferences: KamajiPreferences): void => {
    this.kamajiBaseUrl = kamajiPreferences.kamajiBaseUrl;
  };

  toJSON = (): KamajiPreferences => {
    const value: KamajiPreferences = {
      kamajiBaseUrl: this.kamajiBaseUrl
    };
    return toJS(value);
  };
}
