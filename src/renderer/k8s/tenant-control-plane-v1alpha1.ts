import { Renderer } from "@freelensapp/extensions";

import type { KamajiKubeObjectCRD } from "./types";

// The types follow api/v1alpha1/tenantcontrolplane_types.go, tenantcontrolplane_status.go and types.go of Kamaji
// 26.10.5-edge, one interface per Go struct, with its fields under their json names.

export type KubeletPreferredAddressType = "Hostname" | "InternalIP" | "ExternalIP" | "InternalDNS" | "ExternalDNS";

export type CGroupDriver = "systemd" | "cgroupfs";

export type ServiceType = "ClusterIP" | "NodePort" | "LoadBalancer";

export type IPFamilyPolicy = "SingleStack" | "PreferDualStack" | "RequireDualStack";

export type IPFamily = "IPv4" | "IPv6";

export type KonnectivityAgentMode = "DaemonSet" | "Deployment";

export type KubernetesVersionStatus =
  | "Unknown"
  | "Provisioning"
  | "Sleeping"
  | "WriteLimited"
  | "CertificateAuthorityRotating"
  | "Upgrading"
  | "Migrating"
  | "Ready"
  | "NotReady";

export type AdmissionController =
  | "AlwaysAdmit"
  | "AlwaysDeny"
  | "AlwaysPullImages"
  | "CertificateApproval"
  | "CertificateSigning"
  | "CertificateSubjectRestriction"
  | "DefaultIngressClass"
  | "DefaultStorageClass"
  | "DefaultTolerationSeconds"
  | "DenyEscalatingExec"
  | "DenyExecOnPrivileged"
  | "DenyServiceExternalIPs"
  | "EventRateLimit"
  | "ExtendedResourceToleration"
  | "ImagePolicyWebhook"
  | "LimitPodHardAntiAffinityTopology"
  | "LimitRanger"
  | "MutatingAdmissionWebhook"
  | "NamespaceAutoProvision"
  | "NamespaceExists"
  | "NamespaceLifecycle"
  | "NodeRestriction"
  | "OwnerReferencesPermissionEnforcement"
  | "PersistentVolumeClaimResize"
  | "PersistentVolumeLabel"
  | "PodNodeSelector"
  | "PodSecurity"
  | "PodSecurityPolicy"
  | "PodTolerationRestriction"
  | "Priority"
  | "ResourceQuota"
  | "RuntimeClass"
  | "SecurityContextDeny"
  | "ServiceAccount"
  | "StorageObjectInUseProtection"
  | "TaintNodesByCondition"
  | "ValidatingAdmissionWebhook";

export interface NetworkProfileSpec {
  loadBalancerSourceRanges?: string[];
  loadBalancerClass?: string;
  address?: string;
  advertiseAddress?: string;
  clusterDomain?: string;
  allowAddressAsExternalIP?: boolean;
  port?: number;
  certSANs?: string[];
  /** @deprecated Kamaji takes `serviceCidrs` in its place. */
  serviceCidr?: string;
  serviceCidrs?: string[];
  /** @deprecated Kamaji takes `podCidrs` in its place. */
  podCidr?: string;
  podCidrs?: string[];
  dnsServiceIPs?: string[];
}

export interface JSONPatch {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  from?: string;
  value?: unknown;
}

export interface KubeletSpec {
  configurationJSONPatches?: JSONPatch[];
  preferredAddressTypes?: KubeletPreferredAddressType[];
  /** @deprecated Kamaji takes `configurationJSONPatches` in its place. */
  cgroupfs?: CGroupDriver;
}

export interface KubernetesSpec {
  version: string;
  kubelet: KubeletSpec;
  admissionControllers?: AdmissionController[];
}

export interface AdditionalPort {
  name: string;
  protocol?: "TCP" | "UDP" | "SCTP";
  appProtocol?: string;
  port: number;
  targetPort: number | string;
}

export interface AdditionalMetadata {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface IngressSpec {
  additionalMetadata?: AdditionalMetadata;
  ingressClassName?: string;
  hostname?: string;
}

/** A `ParentReference` of the Gateway API. */
export interface GatewayParentReference {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  sectionName?: string;
  port?: number;
}

export interface GatewaySpec {
  additionalMetadata?: AdditionalMetadata;
  parentRefs?: GatewayParentReference[];
  hostname?: string;
}

export interface ControlPlaneComponentsResources {
  apiServer?: Renderer.K8sApi.ResourceRequirements;
  controllerManager?: Renderer.K8sApi.ResourceRequirements;
  scheduler?: Renderer.K8sApi.ResourceRequirements;
  kine?: Renderer.K8sApi.ResourceRequirements;
}

export interface ProbeSpec {
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
}

export interface ProbeSet {
  liveness?: ProbeSpec;
  readiness?: ProbeSpec;
  startup?: ProbeSpec;
}

export interface ControlPlaneProbes {
  liveness?: ProbeSpec;
  readiness?: ProbeSpec;
  startup?: ProbeSpec;
  apiServer?: ProbeSet;
  controllerManager?: ProbeSet;
  scheduler?: ProbeSet;
}

export interface ControlPlaneContainerSecurityContexts {
  apiServer?: Renderer.K8sApi.SecurityContext;
  controllerManager?: Renderer.K8sApi.SecurityContext;
  scheduler?: Renderer.K8sApi.SecurityContext;
}

export interface RegistrySettings {
  registry?: string;
  tagSuffix?: string;
  apiServerImage?: string;
  controllerManagerImage?: string;
  schedulerImage?: string;
}

/** A `DeploymentStrategy` of apps/v1. */
export interface DeploymentStrategy {
  type?: "Recreate" | "RollingUpdate";
  rollingUpdate?: {
    maxUnavailable?: number | string;
    maxSurge?: number | string;
  };
}

export interface AdditionalVolumeMounts {
  apiServer?: Renderer.K8sApi.VolumeMount[];
  controllerManager?: Renderer.K8sApi.VolumeMount[];
  scheduler?: Renderer.K8sApi.VolumeMount[];
}

export interface ControlPlaneExtraArgs {
  apiServer?: string[];
  controllerManager?: string[];
  scheduler?: string[];
  kine?: string[];
}

export interface DeploymentSpec {
  registrySettings?: RegistrySettings;
  replicas?: number;
  nodeSelector?: Record<string, string>;
  runtimeClassName?: string;
  strategy?: DeploymentStrategy;
  tolerations?: Renderer.K8sApi.Toleration[];
  affinity?: Renderer.K8sApi.Affinity;
  topologySpreadConstraints?: Renderer.K8sApi.TopologySpreadConstraint[];
  resources?: ControlPlaneComponentsResources;
  extraArgs?: ControlPlaneExtraArgs;
  additionalMetadata?: AdditionalMetadata;
  podAdditionalMetadata?: AdditionalMetadata;
  additionalInitContainers?: Renderer.K8sApi.Container[];
  additionalContainers?: Renderer.K8sApi.Container[];
  additionalVolumes?: Renderer.K8sApi.PodSpecVolume[];
  additionalVolumeMounts?: AdditionalVolumeMounts;
  probes?: ControlPlaneProbes;
  serviceAccountName?: string;
  automountServiceAccountToken?: boolean;
  containerSecurityContexts?: ControlPlaneContainerSecurityContexts;
  podSecurityContext?: Renderer.K8sApi.PodSecurityContext;
}

export interface ServiceSpec {
  additionalMetadata?: AdditionalMetadata;
  additionalPorts?: AdditionalPort[];
  serviceType: ServiceType;
  allocateLoadBalancerNodePorts?: boolean;
  headless?: boolean;
  ipFamilyPolicy?: IPFamilyPolicy;
  ipFamilies?: IPFamily[];
}

export interface ControlPlane {
  deployment?: DeploymentSpec;
  service: ServiceSpec;
  ingress?: IngressSpec;
  gateway?: GatewaySpec;
}

export interface ImageOverrideTrait {
  imageRepository?: string;
  imageTag?: string;
}

export type AddonSpec = ImageOverrideTrait;

export interface KonnectivityServerSpec {
  port: number;
  version?: string;
  image?: string;
  resources?: Renderer.K8sApi.ResourceRequirements;
  extraArgs?: string[];
  securityContext?: Renderer.K8sApi.SecurityContext;
}

export interface KonnectivityAgentSpec {
  image?: string;
  version?: string;
  tolerations?: Renderer.K8sApi.Toleration[];
  extraArgs?: string[];
  hostNetwork?: boolean;
  mode?: KonnectivityAgentMode;
  replicas?: number;
  resources?: Renderer.K8sApi.ResourceRequirements;
}

export interface KonnectivitySpec {
  server?: KonnectivityServerSpec;
  agent?: KonnectivityAgentSpec;
}

export interface AddonsSpec {
  coreDNS?: AddonSpec;
  konnectivity?: KonnectivitySpec;
  kubeProxy?: AddonSpec;
}

export interface Permissions {
  blockCreation?: boolean;
  blockUpdate?: boolean;
  blockDeletion?: boolean;
}

export interface DataStoreOverride {
  resource?: string;
  dataStore?: string;
}

export interface TenantControlPlaneSpec {
  writePermissions?: Permissions;
  dataStore?: string;
  dataStoreSchema?: string;
  dataStoreUsername?: string;
  dataStoreOverrides?: DataStoreOverride[];
  controlPlane: ControlPlane;
  kubernetes: KubernetesSpec;
  networkProfile?: NetworkProfileSpec;
  addons?: AddonsSpec;
}

export interface SecretStatus {
  secretName?: string;
  lastUpdate?: string;
  checksum?: string;
}

export interface DataStoreSetupStatus {
  schema?: string;
  user?: string;
  lastUpdate?: string;
  checksum?: string;
}

export interface StorageStatus {
  driver?: string;
  dataStoreName?: string;
  config?: { secretName?: string; checksum?: string };
  setup?: DataStoreSetupStatus;
  certificate?: SecretStatus;
}

export interface CertificatesStatus {
  ca?: SecretStatus;
  apiServer?: SecretStatus;
  apiServerKubeletClient?: SecretStatus;
  frontProxyCA?: SecretStatus;
  frontProxyClient?: SecretStatus;
  sa?: SecretStatus;
  etcd?: {
    apiServer?: SecretStatus;
    ca?: SecretStatus;
  };
}

export interface KubeconfigsStatus {
  admin?: SecretStatus;
  controllerManager?: SecretStatus;
  scheduler?: SecretStatus;
}

export interface KubernetesVersion {
  version?: string;
  status?: KubernetesVersionStatus;
}

/** A `DeploymentCondition` of apps/v1. */
export interface DeploymentCondition {
  type: string;
  status: "True" | "False" | "Unknown";
  lastUpdateTime?: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
}

/** The status of the Deployment of the control plane: a `DeploymentStatus` of apps/v1, and where the Deployment is. */
export interface KubernetesDeploymentStatus {
  observedGeneration?: number;
  replicas?: number;
  updatedReplicas?: number;
  readyReplicas?: number;
  availableReplicas?: number;
  unavailableReplicas?: number;
  terminatingReplicas?: number;
  conditions?: DeploymentCondition[];
  collisionCount?: number;
  selector: string;
  name: string;
  namespace: string;
  lastUpdate?: string;
}

/** A `LoadBalancerIngress` of core/v1. */
export interface LoadBalancerIngress {
  ip?: string;
  hostname?: string;
  ipMode?: string;
}

/** The status of the Service of the control plane: a `ServiceStatus` of core/v1, and where the Service is. */
export interface KubernetesServiceStatus {
  loadBalancer?: { ingress?: LoadBalancerIngress[] };
  name: string;
  namespace: string;
  port: number;
}

/** The status of the Ingress of the control plane: an `IngressStatus` of networking/v1, and where the Ingress is. */
export interface KubernetesIngressStatus {
  loadBalancer?: { ingress?: LoadBalancerIngress[] };
  name: string;
  namespace: string;
}

export interface GatewayAccessPoint {
  type: string | null;
  value: string;
  port: number;
  urls?: string[];
}

/** The status of the route of the control plane: a `RouteStatus` of the Gateway API, the route, and its addresses. */
export interface KubernetesGatewayStatus {
  parents?: unknown[];
  routeRef?: { name?: string };
  accessPoints?: GatewayAccessPoint[];
}

export interface KubernetesStatus {
  version?: KubernetesVersion;
  deployment?: KubernetesDeploymentStatus;
  service?: KubernetesServiceStatus;
  ingress?: KubernetesIngressStatus;
  gateway?: KubernetesGatewayStatus;
}

export interface AddonStatus {
  enabled: boolean;
  lastUpdate?: string;
}

export interface KonnectivityStatus extends AddonStatus {
  agent?: { name?: string; namespace?: string; mode?: KonnectivityAgentMode };
  service?: KubernetesServiceStatus;
}

export interface AddonsStatus {
  coreDNS?: AddonStatus;
  kubeProxy?: AddonStatus;
  konnectivity?: KonnectivityStatus;
}

export interface TenantControlPlaneStatus {
  observedGeneration?: number;
  storage?: StorageStatus;
  certificates?: CertificatesStatus;
  kubeconfig?: KubeconfigsStatus;
  kubernetesResources?: KubernetesStatus;
  kubeadmconfig?: { configmapName?: string; lastUpdate?: string; checksum?: string };
  controlPlaneEndpoint?: string;
  addons?: AddonsStatus;
}

export class TenantControlPlane extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  TenantControlPlaneStatus,
  TenantControlPlaneSpec
> {
  declare kind: "TenantControlPlane";
  declare apiVersion: "kamaji.clastix.io/v1alpha1";

  static readonly kind = "TenantControlPlane";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/kamaji.clastix.io/v1alpha1/tenantcontrolplanes";

  static readonly crd: KamajiKubeObjectCRD = {
    apiVersions: ["kamaji.clastix.io/v1alpha1"],
    plural: "tenantcontrolplanes",
    singular: "tenantcontrolplane",
    shortNames: ["tcp"],
    title: "Kamaji Tenant Control Planes",
  };

  /** The phase that Kamaji reports for the control plane, `Unknown` before it reports one. */
  static getStatus(object: TenantControlPlane): KubernetesVersionStatus {
    return object.status?.kubernetesResources?.version?.status ?? "Unknown";
  }

  /** The available pods of the control plane over its replicas, as `ready/total`. */
  static getReadyReplicas(object: TenantControlPlane): string {
    const deployment = object.status?.kubernetesResources?.deployment;
    const ready = deployment?.availableReplicas ?? deployment?.readyReplicas ?? 0;

    return `${ready}/${deployment?.replicas ?? 0}`;
  }

  static getEndpoint(object: TenantControlPlane): string | undefined {
    return object.status?.controlPlaneEndpoint || undefined;
  }

  /** The Kubernetes version of the spec, which the CRD requires, else the one that Kamaji reports. */
  static getKubernetesVersion(object: TenantControlPlane): string | undefined {
    return object.spec?.kubernetes?.version || object.status?.kubernetesResources?.version?.version || undefined;
  }

  /** The DataStore that holds the state of the control plane, and its driver, as Kamaji reports them. */
  static getDataStore(object: TenantControlPlane): string | undefined {
    const storage = object.status?.storage;

    return [storage?.dataStoreName, storage?.driver].filter(Boolean).join(" ") || undefined;
  }
}

export class TenantControlPlaneApi extends Renderer.K8sApi.KubeApi<TenantControlPlane> {}
export class TenantControlPlaneStore extends Renderer.K8sApi.KubeObjectStore<
  TenantControlPlane,
  TenantControlPlaneApi
> {}
