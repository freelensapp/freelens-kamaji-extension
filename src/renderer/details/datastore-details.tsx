/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { DataStore } from "../k8s/datastore-v1alpha1";

const {
  Component: { DrawerItem },
} = Renderer;

export interface DataStoreDetailsProps extends Renderer.Component.KubeObjectDetailsProps<DataStore> {
  extension: Renderer.LensExtension;
}

export const DataStoreDetails = observer((props: DataStoreDetailsProps) => {
  const { object } = props as any;

  return (
    <>
      <DrawerItem name="API Version">kamaji.clastix.io/v1alpha1</DrawerItem>
      <DrawerItem name="Kind">DataStore</DrawerItem>
      <DrawerItem name="Driver">{object.spec?.driver ?? "-"}</DrawerItem>
      <DrawerItem name="Endpoints">{object.spec?.endpoints?.join(", ") ?? "-"}</DrawerItem>
      <DrawerItem name="Used By">{object.status?.usedBy?.length ?? 0}</DrawerItem>
    </>
  );
});
