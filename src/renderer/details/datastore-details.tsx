/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { DataStore } from "../k8s/datastore-v1alpha1";

import type { ContentRef } from "../k8s/datastore-v1alpha1";

const {
  Component: { Badge, DrawerItem },
} = Renderer;

export type DataStoreDetailsProps = Renderer.Component.KubeObjectDetailsProps<DataStore>;

/** Where a value of the DataStore comes from: inline content, which takes precedence, or a key of a Secret. */
export function describeContent(ref: ContentRef | undefined): string | undefined {
  if (ref?.content) {
    return "inline";
  }

  const secret = ref?.secretReference;

  if (!secret) {
    return undefined;
  }

  return `${[secret.namespace, secret.name].filter(Boolean).join("/")}, key ${secret.keyPath}`;
}

export const DataStoreDetails = observer(({ object }: DataStoreDetailsProps) => {
  const { tlsConfig, basicAuth } = object.spec;
  const ready = DataStore.isReady(object);
  const usedBy = DataStore.getUsedBy(object);
  const conditions = DataStore.getConditions(object);
  const contentRow = (name: string, ref: ContentRef | undefined) => (
    <DrawerItem name={name} hidden={!describeContent(ref)}>
      {describeContent(ref)}
    </DrawerItem>
  );

  return (
    <>
      <DrawerItem name="API Version">{object.apiVersion}</DrawerItem>
      <DrawerItem name="Kind">{object.kind}</DrawerItem>
      <DrawerItem name="Driver">{object.spec.driver}</DrawerItem>
      <DrawerItem name="Endpoints">{object.spec.endpoints.join(", ") || "-"}</DrawerItem>
      <DrawerItem name="Ready" hidden={ready === undefined}>
        {ready ? "Yes" : "No"}
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
      <DrawerItem name="Authentication">{DataStore.getAuthentication(object) ?? "-"}</DrawerItem>
      {contentRow("CA Certificate", tlsConfig?.certificateAuthority.certificate)}
      {contentRow("CA Private Key", tlsConfig?.certificateAuthority.privateKey)}
      {contentRow("Client Certificate", tlsConfig?.clientCertificate?.certificate)}
      {contentRow("Client Private Key", tlsConfig?.clientCertificate?.privateKey)}
      {contentRow("Username", basicAuth?.username)}
      {contentRow("Password", basicAuth?.password)}
      <DrawerItem name="Used By">{usedBy.length ? usedBy.join(", ") : "-"}</DrawerItem>
    </>
  );
});
