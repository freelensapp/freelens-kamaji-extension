/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import { KamajiPreferencesStore } from "../common/store";
import { KamajiIcon } from "./icons/kamaji";
import {MainPage} from "./pages/main/main-page";

export default class KamajiRenderer extends Renderer.LensExtension {
  async onActivate() {
    await KamajiPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }

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

  clusterPages = [
    {
      id: "kamaji-main-page",
      components: {
        Page: () => <MainPage />,
      },
    },
  ];
}
