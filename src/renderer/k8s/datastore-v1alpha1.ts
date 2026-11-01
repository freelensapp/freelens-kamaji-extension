import { Renderer } from "@freelensapp/extensions";

import type { KamajiKubeObjectCRD } from "./types";

// The types follow api/v1alpha1/datastore_types.go of Kamaji 26.10.5-edge, one interface per Go struct, with its
// fields under their json names.

export type Driver = "etcd" | "MySQL" | "PostgreSQL" | "NATS";

/** A `SecretReference` of core/v1, with the key of the Secret that holds the value. */
export interface SecretReference {
  name?: string;
  namespace?: string;
  keyPath: string;
}

/** A value given inline, base64 encoded, or read from a key of a Secret; the inline content takes precedence. */
export interface ContentRef {
  content?: string;
  secretReference?: SecretReference;
}

export interface CertKeyPair {
  certificate: ContentRef;
  privateKey?: ContentRef;
}

export interface ClientCertificate {
  certificate: ContentRef;
  privateKey: ContentRef;
}

export interface TLSConfig {
  certificateAuthority: CertKeyPair;
  clientCertificate?: ClientCertificate;
}

export interface BasicAuth {
  username: ContentRef;
  password: ContentRef;
}

export interface DataStoreSpec {
  driver: Driver;
  endpoints: string[];
  basicAuth?: BasicAuth;
  tlsConfig?: TLSConfig;
}

/** A `Condition` of meta/v1. */
export interface DataStoreCondition {
  type: string;
  status: "True" | "False" | "Unknown";
  observedGeneration?: number;
  lastTransitionTime: string;
  reason: string;
  message: string;
}

export interface DataStoreStatus {
  observedGeneration?: number;
  usedBy?: string[];
  conditions?: DataStoreCondition[];
  ready: boolean;
}

export class DataStore extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  DataStoreStatus,
  DataStoreSpec
> {
  declare kind: "DataStore";
  declare apiVersion: "kamaji.clastix.io/v1alpha1";

  static readonly kind = "DataStore";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/kamaji.clastix.io/v1alpha1/datastores";

  static readonly crd: KamajiKubeObjectCRD = {
    apiVersions: ["kamaji.clastix.io/v1alpha1"],
    plural: "datastores",
    singular: "datastore",
    shortNames: ["ds"],
    title: "Kamaji Datastores",
  };

  /** The tenants that keep their state in the DataStore, as `<namespace>/<name>`, as Kamaji reports them. */
  static getUsedBy(object: DataStore): string[] {
    return object.status?.usedBy ?? [];
  }

  /** Whether Kamaji validated the DataStore, or `undefined` before it reports. */
  static isReady(object: DataStore): boolean | undefined {
    return object.status?.ready;
  }

  /** How Kamaji authenticates to the DataStore: with TLS, with a username and a password, or both. */
  static getAuthentication(object: DataStore): string | undefined {
    const { tlsConfig, basicAuth } = object.spec ?? {};

    if (tlsConfig && basicAuth) {
      return "TLS and basic auth";
    }

    return tlsConfig ? "TLS" : basicAuth ? "Basic auth" : undefined;
  }

  /** The conditions that Kamaji reports for the DataStore. */
  static getConditions(object: DataStore): DataStoreCondition[] {
    return object.status?.conditions ?? [];
  }
}

export class DataStoreApi extends Renderer.K8sApi.KubeApi<DataStore> {}
export class DataStoreStore extends Renderer.K8sApi.KubeObjectStore<DataStore, DataStoreApi> {}
