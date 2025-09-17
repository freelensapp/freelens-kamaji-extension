import { Common } from "@freelensapp/extensions";
import { makeObservable, observable, toJS } from "mobx";

export interface KamajiPreferences {
  kamajiBaseUrl: string;
  accessToken: string;
  refreshToken: string;
}

export class PreferencesStore extends Common.Store.ExtensionStore<KamajiPreferences> {
  // Persistent
  @observable accessor kamajiBaseUrl: string = "";
  @observable accessor accessToken: string = "";
  @observable accessor refreshToken: string = "";

  constructor() {
    super({
      configName: "kamaji-preferences-store",
      defaults: {
        kamajiBaseUrl: "http://localhost:3000/ui/api/trpc/",
      }
    });
    makeObservable(this);
  }

  fromStore = (kamajiPreferences: KamajiPreferences): void => {
    this.kamajiBaseUrl = kamajiPreferences.kamajiBaseUrl;
    this.accessToken = kamajiPreferences.accessToken;
    this.refreshToken = kamajiPreferences.refreshToken;
  };

  toJSON = (): KamajiPreferences => {
    const value: KamajiPreferences = {
      kamajiBaseUrl: this.kamajiBaseUrl,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    };
    return toJS(value);
  };
}
