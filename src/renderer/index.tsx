/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { KamajiMenuItem, type KamajiMenuItemProps } from "./components/kamaji-menu-item";
import { DataStoreDetails } from "./details/datastore-details";
import { TenantDetails } from "./details/tenant-details";
import { KamajiIcon } from "./icons/kamaji";
import { DataStore } from "./k8s/datastore-v1alpha1";
import { TenantControlPlane } from "./k8s/tenant-control-plane-v1alpha1";
import { DatastoresPage } from "./pages/datastores/datastores-page";
import { TenantsPage } from "./pages/tenants/tenants-page";

export default class KamajiRenderer extends Renderer.LensExtension {
  clusterPages = [
    {
      id: "kamaji-tenants-page",
      components: {
        Page: () => <TenantsPage />,
      },
    },
    {
      id: "kamaji-datastores-page",
      components: {
        Page: () => <DatastoresPage />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "kamaji-icon",
      title: "Kamaji",
      target: { pageId: "kamaji-tenants-page" },
      components: {
        Icon: KamajiIcon,
      },
    },
    {
      id: "kamaji-tenants-menu",
      parentId: "kamaji-icon",
      title: "Tenants",
      target: { pageId: "kamaji-tenants-page" },
      components: {},
    },
    {
      id: "kamaji-datastores-menu",
      parentId: "kamaji-icon",
      title: "Datastores",
      target: { pageId: "kamaji-datastores-page" },
      components: {},
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
    {
      kind: DataStore.kind,
      apiVersions: DataStore.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <DataStoreDetails {...props} extension={this} />
        ),
      },
    },
  ];
}
