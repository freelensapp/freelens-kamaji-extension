import { Renderer } from "@freelensapp/extensions";

export interface DataStoreSpec {
  driver?: string;
  endpoints?: string[];
  tlsConfig?: {
    certificateAuthority?: {
      certificate?: {
        secretReference?: {
          keyPath?: string;
          name?: string;
          namespace?: string;
        };
      };
      privateKey?: {
        secretReference?: {
          keyPath?: string;
          name?: string;
          namespace?: string;
        };
      };
    };
    clientCertificate?: {
      certificate?: {
        secretReference?: {
          keyPath?: string;
          name?: string;
          namespace?: string;
        };
      };
      privateKey?: {
        secretReference?: {
          keyPath?: string;
          name?: string;
          namespace?: string;
        };
      };
    };
  };
}

export interface DataStoreStatus {
  usedBy?: string[];
}

export interface DataStoreKubeObjectCRD {
  apiVersions: string[];
  plural: string;
  singular: string;
  shortNames: string[];
  title: string;
}

export class DataStore extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  DataStoreStatus,
  DataStoreSpec
> {
  static readonly kind = "DataStore";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/kamaji.clastix.io/v1alpha1/datastores";

  static readonly crd: DataStoreKubeObjectCRD = {
    apiVersions: ["kamaji.clastix.io/v1alpha1"],
    plural: "datastores",
    singular: "datastore",
    shortNames: ["ds"],
    title: "Kamaji Datastores",
  };

  getName(): string {
    return ((this as any).metadata?.name as string) ?? "";
  }

  getCreationTimestamp(): string {
    return ((this as any).metadata?.creationTimestamp as string) ?? "";
  }

  getDriver(): string {
    const spec = (this as any).spec as DataStoreSpec | undefined;

    return spec?.driver ?? "-";
  }

  getUsedByCount(): number {
    const status = (this as any).status as DataStoreStatus | undefined;

    return status?.usedBy?.length ?? 0;
  }
}

export class DataStoreApi extends Renderer.K8sApi.KubeApi<DataStore> {}
export class DataStoreStore extends Renderer.K8sApi.KubeObjectStore<DataStore, DataStoreApi> {}
