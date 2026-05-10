import { Renderer } from "@freelensapp/extensions";

interface TenantKubernetesResourcesVersionStatus {
  status?: string;
  version?: string;
}

interface TenantKubernetesResourcesDeploymentStatus {
  replicas?: number;
  readyReplicas?: number;
  availableReplicas?: number;
}

interface TenantKubernetesResourcesStatus {
  version?: TenantKubernetesResourcesVersionStatus;
  deployment?: TenantKubernetesResourcesDeploymentStatus;
}

interface TenantStorageStatus {
  dataStoreName?: string;
  driver?: string;
}

export interface TenantControlPlaneSpec {
  kubernetes?: {
    version?: string;
  };
}

export interface TenantControlPlaneStatus {
  controlPlaneEndpoint?: string;
  kubernetesResources?: TenantKubernetesResourcesStatus;
  storage?: TenantStorageStatus;
}

export interface TenantControlPlaneKubeObjectCRD {
  apiVersions: string[];
  plural: string;
  singular: string;
  shortNames: string[];
  title: string;
}

export class TenantControlPlane extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  TenantControlPlaneStatus,
  TenantControlPlaneSpec
> {
  static readonly kind = "TenantControlPlane";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/kamaji.clastix.io/v1alpha1/tenantcontrolplanes";

  static readonly crd: TenantControlPlaneKubeObjectCRD = {
    apiVersions: ["kamaji.clastix.io/v1alpha1"],
    plural: "tenantcontrolplanes",
    singular: "tenantcontrolplane",
    shortNames: ["tcp"],
    title: "Kamaji Tenant Control Planes",
  };

  getName(): string {
    return ((this as any).metadata?.name as string) ?? "";
  }

  getNs(): string {
    return ((this as any).metadata?.namespace as string) ?? "";
  }

  getCreationTimestamp(): string {
    return ((this as any).metadata?.creationTimestamp as string) ?? "";
  }

  getStatusText(): string {
    const status = (this as any).status as TenantControlPlaneStatus | undefined;

    return status?.kubernetesResources?.version?.status ?? "Unknown";
  }

  getPodReplicasText(): string {
    const status = (this as any).status as TenantControlPlaneStatus | undefined;
    const deployment = status?.kubernetesResources?.deployment;
    const total = deployment?.replicas ?? 0;
    const ready = deployment?.availableReplicas ?? deployment?.readyReplicas ?? 0;

    return `${ready}/${total}`;
  }

  getEndpoint(): string {
    const status = (this as any).status as TenantControlPlaneStatus | undefined;

    return status?.controlPlaneEndpoint ?? "-";
  }

  getKubernetesVersion(): string {
    const spec = (this as any).spec as TenantControlPlaneSpec | undefined;
    const status = (this as any).status as TenantControlPlaneStatus | undefined;

    return spec?.kubernetes?.version ?? status?.kubernetesResources?.version?.version ?? "-";
  }

  getDatastoreText(): string {
    const status = (this as any).status as TenantControlPlaneStatus | undefined;
    const dataStoreName = status?.storage?.dataStoreName;
    const driver = status?.storage?.driver;

    if (!dataStoreName && !driver) {
      return "-";
    }

    return [dataStoreName, driver].filter(Boolean).join(" ");
  }
}

export class TenantControlPlaneApi extends Renderer.K8sApi.KubeApi<TenantControlPlane> {}
export class TenantControlPlaneStore extends Renderer.K8sApi.KubeObjectStore<
  TenantControlPlane,
  TenantControlPlaneApi
> {}
