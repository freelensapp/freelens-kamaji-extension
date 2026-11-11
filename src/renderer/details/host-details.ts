/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

/**
 * Whether the drawer of the host shows the printer columns of the object's CRD above the details panel. It does when
 * its store of CRDs has the definition, which a user who may not list CRDs does not get; the host decides the same way,
 * with `getByObject` of the same store. A details panel that reads it is an `observer`, so it follows the store.
 */
export function hostShowsPrinterColumns(object: Renderer.K8sApi.KubeObject): boolean {
  return Boolean(Renderer.K8sApi.crdStore.getByObject(object));
}
