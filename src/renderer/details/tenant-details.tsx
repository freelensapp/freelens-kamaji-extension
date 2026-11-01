/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";

const {
  Component: { Badge, DrawerItem },
} = Renderer;

export type TenantDetailsProps = Renderer.Component.KubeObjectDetailsProps<TenantControlPlane>;

export const TenantDetails = observer(({ object }: TenantDetailsProps) => {
  const { spec, status } = object;
  const endpoint = TenantControlPlane.getEndpoint(object);

  return (
    <>
      <DrawerItem name="API Version">{object.apiVersion}</DrawerItem>
      <DrawerItem name="Kind">{object.kind}</DrawerItem>
      <DrawerItem name="Status">
        <Badge label={TenantControlPlane.getStatus(object)} />
      </DrawerItem>
      <DrawerItem name="Kubernetes Version">{TenantControlPlane.getKubernetesVersion(object) ?? "-"}</DrawerItem>
      <DrawerItem name="Control Plane Endpoint" hidden={!endpoint}>
        <code>{endpoint}</code>
      </DrawerItem>
      <DrawerItem name="Control Plane Replicas">{spec.controlPlane.deployment?.replicas ?? "-"}</DrawerItem>
      <DrawerItem name="Ready Pods">{TenantControlPlane.getReadyReplicas(object)}</DrawerItem>
      <DrawerItem name="Control Plane Service Type">{spec.controlPlane.service.serviceType}</DrawerItem>
      <DrawerItem name="Data Store">{spec.dataStore || "-"}</DrawerItem>
      <DrawerItem name="Storage Driver" hidden={!status?.storage?.driver}>
        {status?.storage?.driver}
      </DrawerItem>
      <DrawerItem name="Data Store Name (Status)" hidden={!status?.storage?.dataStoreName}>
        {status?.storage?.dataStoreName}
      </DrawerItem>
      <DrawerItem name="Konnectivity" hidden={!status?.addons?.konnectivity}>
        {status?.addons?.konnectivity?.enabled ? "Enabled" : "Disabled"}
      </DrawerItem>
    </>
  );
});
