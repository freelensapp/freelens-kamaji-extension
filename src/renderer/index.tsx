/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { KamajiIcon } from "./icons/kamaji";
import { PreferencesPage } from "./pages/preferences/preferences-page";
import { PreferencesStore } from "../store/preferences-store";
import MainPage from "./pages/main/main-page";

export default class KamajiRenderer extends Renderer.LensExtension {
  async onActivate() {
    // @ts-ignore
    PreferencesStore.getInstanceOrCreate<PreferencesStore>().loadExtension(this);
  }

  clusterPages = [
    {
      id: "kamaji-main-page",
      components: {
        Page: () => <MainPage />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "kamaji-icon",
      title: "Kamaji",
      target: { pageId: "kamaji-main-page" },
      components: {
        Icon: KamajiIcon,
      },
    },
  ];

  appPreferences = [
    {
      title: "Kamaji settings",
      components: {
        Input: () => <PreferencesPage />,
        Hint: () => <span></span>,
      },
    },
  ];
}
