/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";

const {
  Component: { DrawerItem, Badge },
} = Renderer;

export interface TenantDetailsProps extends Renderer.Component.KubeObjectDetailsProps<TenantControlPlane> {
  extension: Renderer.LensExtension;
}

export const TenantDetails = observer((props: TenantDetailsProps) => {
  const { object } = props as any;

  return (
    <>
      {/* Metadata */}
      <DrawerItem name="API Version">kamaji.clastix.io/v1alpha1</DrawerItem>
      <DrawerItem name="Kind">TenantControlPlane</DrawerItem>

      {/* Spec: Kubernetes Version */}
      <DrawerItem name="Kubernetes Version">{object.spec?.kubernetes?.version ?? "-"}</DrawerItem>

      {/* Spec: Control Plane */}
      {object.spec?.controlPlane && (
        <>
          <DrawerItem name="Control Plane Replicas">{object.spec.controlPlane.deployment?.replicas ?? "-"}</DrawerItem>
          {object.spec.controlPlane.service?.serviceType && (
            <DrawerItem name="Control Plane Service Type">{object.spec.controlPlane.service.serviceType}</DrawerItem>
          )}
        </>
      )}

      {/* Spec: Data Store */}
      {object.spec?.dataStore && (
        <>
          <DrawerItem name="Data Store Name">{object.spec.dataStore.name ?? "-"}</DrawerItem>
          {object.spec.dataStore.externalName && (
            <DrawerItem name="Data Store External Name">{object.spec.dataStore.externalName}</DrawerItem>
          )}
        </>
      )}

      {/* Status: Control Plane Endpoint */}
      {object.status?.controlPlaneEndpoint && (
        <DrawerItem name="Control Plane Endpoint">
          <code>{object.status.controlPlaneEndpoint}</code>
        </DrawerItem>
      )}

      {/* Status: Kubernetes Resources */}
      {object.status?.kubernetesResources && (
        <>
          <DrawerItem name="Kubernetes Version (Status)">
            <Badge label="Version" tooltip={object.status.kubernetesResources.version?.status}>
              {object.status.kubernetesResources.version?.status ?? "Unknown"}
            </Badge>
          </DrawerItem>
          <DrawerItem name="Deployment Replicas">
            {object.status.kubernetesResources.deployment?.replicas ?? "-"} /{" "}
            {object.status.kubernetesResources.deployment?.desiredReplicas ?? "-"}
          </DrawerItem>
        </>
      )}

      {/* Status: Storage */}
      {object.status?.storage && (
        <>
          <DrawerItem name="Storage Driver">{object.status.storage.driver ?? "-"}</DrawerItem>
          <DrawerItem name="Data Store Name (Status)">{object.status.storage.dataStoreName ?? "-"}</DrawerItem>
        </>
      )}

      {/* Status: Addon */}
      {object.status?.addons?.konnectivity && (
        <DrawerItem name="Konnectivity Status">
          <Badge label="Status" tooltip={object.status.addons.konnectivity.status}>
            {object.status.addons.konnectivity.status ?? "Unknown"}
          </Badge>
        </DrawerItem>
      )}
    </>
  );
});
