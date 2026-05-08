/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { KamajiIcon } from "./icons/kamaji";
import { ClusterPage } from "./pages/cluster/cluster-page";

export default class KamajiRenderer extends Renderer.LensExtension {
  clusterPages = [
    {
      id: "kamaji-main-page",
      components: {
        Page: () => <ClusterPage />,
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
}
