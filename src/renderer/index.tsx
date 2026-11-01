/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import {
  withDetailsErrorBoundary,
  withMenuItemErrorBoundary,
  withPageErrorBoundary,
} from "./components/error-boundary";
import { KamajiMenuItem } from "./components/kamaji-menu-item";
import { DataStoreDetails } from "./details/datastore-details";
import { TenantDetails } from "./details/tenant-details";
import { KamajiIcon } from "./icons/kamaji";
import { DataStore } from "./k8s/datastore-v1alpha1";
import { TenantControlPlane } from "./k8s/tenant-control-plane-v1alpha1";
import { DatastoresPage } from "./pages/datastores/datastores-page";
import { TenantsPage } from "./pages/tenants/tenants-page";

// Every page, details panel and menu item renders inside an error boundary, so that an error it throws stays in its
// place: the host has none around the details drawer or a menu item, and its boundary around the cluster frame would
// replace the whole cluster view. Each registration field is mapped through its wrapper, so an entry added to it is
// wrapped too.
export default class KamajiRenderer extends Renderer.LensExtension {
  clusterPages: Renderer.LensExtension["clusterPages"] = [
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
  ].map((registration) => withPageErrorBoundary(this, registration));

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

  // The Tenants and Datastores pages list the two kinds, so the Custom Resources tree of the cluster sidebar leaves
  // them out.
  customResources = [TenantControlPlane, DataStore];

  kubeObjectMenuItems: Renderer.LensExtension["kubeObjectMenuItems"] = [
    Renderer.K8sApi.menuItemFor(TenantControlPlane, {
      MenuItem: KamajiMenuItem,
    }),
  ].map((registration) => withMenuItemErrorBoundary(this, registration));

  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    Renderer.K8sApi.detailsFor(TenantControlPlane, {
      priority: 10,
      Details: TenantDetails,
    }),
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
  ].map((registration) => withDetailsErrorBoundary(this, registration));
}
