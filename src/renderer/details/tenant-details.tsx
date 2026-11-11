/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";
import { hostShowsPrinterColumns } from "./host-details";

const {
  Component: { Badge, DrawerItem },
} = Renderer;

export type TenantDetailsProps = Renderer.Component.KubeObjectDetailsProps<TenantControlPlane>;

/** A list of a row, or `-` when it is empty. */
const listOrDash = (values: string[] | undefined) => (values?.length ? values.join(", ") : "-");

export const TenantDetails = observer(({ object }: TenantDetailsProps) => {
  const { spec, status } = object;
  const service = spec.controlPlane.service;
  const networkProfile = spec.networkProfile;
  const endpoint = TenantControlPlane.getEndpoint(object);
  const blockedWrites = TenantControlPlane.getBlockedWrites(object);
  const conditions = TenantControlPlane.getConditions(object);
  // The drawer of the host shows the printer columns of the CRD above this panel when it has the CRD: Version and
  // Installed Version, Status, Control-Plane endpoint, Kubeconfig and Datastore. The conditions of the Deployment of the
  // control plane are not under `status.conditions`, so the host does not show them.
  const printerColumnsShown = hostShowsPrinterColumns(object);

  return (
    <>
      <DrawerItem name="API Version">{object.apiVersion}</DrawerItem>
      <DrawerItem name="Kind">{object.kind}</DrawerItem>
      <DrawerItem name="Status" hidden={printerColumnsShown}>
        <Badge label={TenantControlPlane.getStatus(object)} />
      </DrawerItem>
      <DrawerItem name="Conditions" hidden={!conditions.length}>
        {conditions.map((condition) => (
          <Badge
            key={condition.type}
            label={condition.status === "True" ? condition.type : `${condition.type}: ${condition.status}`}
            title={condition.message || condition.reason}
          />
        ))}
      </DrawerItem>
      <DrawerItem name="Kubernetes Version" hidden={printerColumnsShown}>
        {TenantControlPlane.getKubernetesVersion(object) ?? "-"}
      </DrawerItem>
      <DrawerItem name="Control Plane Endpoint" hidden={printerColumnsShown || !endpoint}>
        <code>{endpoint}</code>
      </DrawerItem>
      <DrawerItem name="Control Plane Replicas">{spec.controlPlane.deployment?.replicas ?? "-"}</DrawerItem>
      <DrawerItem name="Ready Pods">{TenantControlPlane.getReadyReplicas(object)}</DrawerItem>
      <DrawerItem name="Control Plane Service Type">{service.serviceType}</DrawerItem>
      <DrawerItem name="IP Family Policy" hidden={!service.ipFamilyPolicy}>
        {service.ipFamilyPolicy}
      </DrawerItem>
      <DrawerItem name="IP Families" hidden={!service.ipFamilies?.length}>
        {listOrDash(service.ipFamilies)}
      </DrawerItem>
      <DrawerItem name="Allocate Node Ports" hidden={service.allocateLoadBalancerNodePorts === undefined}>
        {service.allocateLoadBalancerNodePorts ? "Yes" : "No"}
      </DrawerItem>
      <DrawerItem name="Headless Service" hidden={!service.headless}>
        Yes
      </DrawerItem>
      <DrawerItem name="Pod CIDRs">{listOrDash(TenantControlPlane.getPodCIDRs(object))}</DrawerItem>
      <DrawerItem name="Service CIDRs">{listOrDash(TenantControlPlane.getServiceCIDRs(object))}</DrawerItem>
      <DrawerItem name="DNS Service IPs" hidden={!networkProfile?.dnsServiceIPs?.length}>
        {listOrDash(networkProfile?.dnsServiceIPs)}
      </DrawerItem>
      <DrawerItem name="Data Store">{spec.dataStore || "-"}</DrawerItem>
      <DrawerItem name="Storage Driver" hidden={!status?.storage?.driver}>
        {status?.storage?.driver}
      </DrawerItem>
      <DrawerItem name="Data Store Name (Status)" hidden={printerColumnsShown || !status?.storage?.dataStoreName}>
        {status?.storage?.dataStoreName}
      </DrawerItem>
      <DrawerItem name="Data Store Schema" hidden={!TenantControlPlane.getDataStoreSchema(object)}>
        {TenantControlPlane.getDataStoreSchema(object)}
      </DrawerItem>
      <DrawerItem name="Data Store Username" hidden={!TenantControlPlane.getDataStoreUsername(object)}>
        {TenantControlPlane.getDataStoreUsername(object)}
      </DrawerItem>
      <DrawerItem name="Write Permissions">
        {blockedWrites.length ? `Blocked: ${blockedWrites.join(", ")}` : "All allowed"}
      </DrawerItem>
      <DrawerItem name="Konnectivity" hidden={!status?.addons?.konnectivity}>
        {status?.addons?.konnectivity?.enabled ? "Enabled" : "Disabled"}
      </DrawerItem>
    </>
  );
});
