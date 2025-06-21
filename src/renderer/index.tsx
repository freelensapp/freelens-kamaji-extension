/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore
import React from "react";

import { Renderer } from "@freelensapp/extensions";
import { ExamplePreferencesStore } from "../common/store";
import { ExampleDetails } from "./details/example-details";
import { ExampleIcon } from "./icons";
import { Example } from "./k8s/example";
import { ExamplesPage } from "./pages";
import { ExamplePreferenceHint, ExamplePreferenceInput } from "./preferences";

export default class ExampleRenderer extends Renderer.LensExtension {
  async onActivate() {
    await ExamplePreferencesStore.getInstanceOrCreate().loadExtension(this);
  }

  appPreferences = [
    {
      title: "Example Preferences",
      components: {
        Input: () => <ExamplePreferenceInput />,
        Hint: () => <ExamplePreferenceHint />,
      },
    },
  ];

  kubeObjectDetailItems = [
    {
      kind: "Example",
      apiVersions: ["example.freelens.app/v1alpha1"],
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<Example>) => <ExampleDetails {...props} />,
      },
    },
  ];

  clusterPages = [
    {
      id: "examples-page",
      components: {
        Page: () => <ExamplesPage extension={this} />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "example",
      title: "Example",
      target: { pageId: "examples-page" },
      components: {
        Icon: ExampleIcon,
      },
    },
  ];
}
