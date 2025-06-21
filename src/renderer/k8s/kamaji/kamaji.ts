import { Renderer } from "@freelensapp/extensions";
import { NamespacedObjectReference } from "./types";

type KubeObjectMetadata = Renderer.K8sApi.KubeObjectMetadata;

export interface KamajiSpec {
  title?: string;
  description?: string;
  examples?: NamespacedObjectReference[];
}

export interface KamajiStatus {}

export class Kamaji extends Renderer.K8sApi.KubeObject<KubeObjectMetadata, KamajiStatus, KamajiSpec> {
  static readonly kind = "Kamaji";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/kamaji.freelens.app/v1alpha1/examples";
}

export class KamajiApi extends Renderer.K8sApi.KubeApi<Kamaji> {}
export class KamajiStore extends Renderer.K8sApi.KubeObjectStore<Kamaji, KamajiApi> {}

export const exampleObject = {
  kind: "Kamaji",
  apiVersions: ["kamaji.freelens.app/v1alpha1"],
};
