/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore
import React from "react";

import { Renderer } from "@freelensapp/extensions";
import { KamajiPreferencesStore } from "../common/store";
import { KamajiDetails } from "./details/kamaji-details";
import { KamajiIcon } from "./icons";
import { Kamaji } from "./k8s/kamaji";
import { KamajisPage } from "./pages";
import { KamajiPreferenceHint, KamajiPreferenceInput } from "./preferences";

export default class KamajiRenderer extends Renderer.LensExtension {
  async onActivate() {
    await KamajiPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }

  appPreferences = [
    {
      title: "Kamaji Preferences",
      components: {
        Input: () => <KamajiPreferenceInput />,
        Hint: () => <KamajiPreferenceHint />,
      },
    },
  ];

  kubeObjectDetailItems = [
    {
      kind: "Kamaji",
      apiVersions: ["kamaji.freelens.app/v1alpha1"],
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<Kamaji>) => <KamajiDetails {...props} />,
      },
    },
  ];

  clusterPages = [
    {
      id: "examples-page",
      components: {
        Page: () => <KamajisPage extension={this} />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "kamaji",
      title: "Kamaji",
      target: { pageId: "examples-page" },
      components: {
        Icon: KamajiIcon,
      },
    },
  ];
}
