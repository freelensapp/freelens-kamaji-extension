/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { KamajiMenuItem, type KamajiMenuItemProps } from "./components/kamaji-menu-item";
import { TenantDetails } from "./details/tenant-details";
import { KamajiIcon } from "./icons/kamaji";
import { TenantControlPlane } from "./k8s/tenant-control-plane-v1alpha1";
import { TenantsPage } from "./pages/tenants/tenants-page";

export default class KamajiRenderer extends Renderer.LensExtension {
  clusterPages = [
    {
      id: "kamaji-main-page",
      components: {
        Page: () => <TenantsPage />,
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

  kubeObjectMenuItems = [
    {
      kind: TenantControlPlane.kind,
      apiVersions: TenantControlPlane.crd.apiVersions,
      components: {
        MenuItem: (props: KamajiMenuItemProps) => <KamajiMenuItem {...props} />,
      },
    },
  ];

  kubeObjectDetailItems = [
    {
      kind: TenantControlPlane.kind,
      apiVersions: TenantControlPlane.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <TenantDetails {...props} extension={this} />
        ),
      },
    },
  ];
}
