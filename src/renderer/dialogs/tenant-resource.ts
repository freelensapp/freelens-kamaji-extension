import { parse as yamlParse, stringify as yamlStringify } from "yaml";

import type {
  AdmissionController,
  IPFamily,
  IPFamilyPolicy,
  ServiceSpec,
  ServiceType,
  TenantControlPlane,
  TenantControlPlaneSpec,
} from "../k8s/tenant-control-plane-v1alpha1";

/** A Tenant Control Plane as the dialog posts it. */
export interface TenantControlPlaneResource {
  apiVersion: TenantControlPlane["apiVersion"];
  kind: TenantControlPlane["kind"];
  metadata: {
    name: string;
    namespace: string;
    [key: string]: unknown;
  };
  spec: TenantControlPlaneSpec;
}

export type ProviderProfile = "generic" | "kind" | "aws" | "azure";

export const providerProfiles: ProviderProfile[] = ["generic", "kind", "aws", "azure"];

/** The annotations of the control plane's Service that each provider preset fills in, one `key=value` per line. */
export const profileAnnotations: Record<ProviderProfile, string> = {
  generic: "",
  kind: "",
  aws: [
    "service.beta.kubernetes.io/aws-load-balancer-backend-protocol=tcp",
    "service.beta.kubernetes.io/aws-load-balancer-scheme=internet-facing",
    "service.beta.kubernetes.io/aws-load-balancer-type=nlb",
  ].join("\n"),
  azure: "service.beta.kubernetes.io/azure-load-balancer-internal=true",
};

export const serviceTypes: ServiceType[] = ["LoadBalancer", "ClusterIP", "NodePort"];

export const ipFamilyPolicies: IPFamilyPolicy[] = ["SingleStack", "PreferDualStack", "RequireDualStack"];

/** The newest Kubernetes version that Kamaji 26.10.5-edge runs a tenant at; its webhook refuses a newer minor. */
export const newestKubernetesVersion = { major: 1, minor: 37 };

/** The values of the `AdmissionController` enum of Kamaji, which the CRD accepts. */
export const admissionControllers: AdmissionController[] = [
  "AlwaysAdmit",
  "AlwaysDeny",
  "AlwaysPullImages",
  "CertificateApproval",
  "CertificateSigning",
  "CertificateSubjectRestriction",
  "DefaultIngressClass",
  "DefaultStorageClass",
  "DefaultTolerationSeconds",
  "DenyEscalatingExec",
  "DenyExecOnPrivileged",
  "DenyServiceExternalIPs",
  "EventRateLimit",
  "ExtendedResourceToleration",
  "ImagePolicyWebhook",
  "LimitPodHardAntiAffinityTopology",
  "LimitRanger",
  "MutatingAdmissionWebhook",
  "NamespaceAutoProvision",
  "NamespaceExists",
  "NamespaceLifecycle",
  "NodeRestriction",
  "OwnerReferencesPermissionEnforcement",
  "PersistentVolumeClaimResize",
  "PersistentVolumeLabel",
  "PodNodeSelector",
  "PodSecurity",
  "PodSecurityPolicy",
  "PodTolerationRestriction",
  "Priority",
  "ResourceQuota",
  "RuntimeClass",
  "SecurityContextDeny",
  "ServiceAccount",
  "StorageObjectInUseProtection",
  "TaintNodesByCondition",
  "ValidatingAdmissionWebhook",
];

/** The fields of the dialog, as the user typed them. */
export interface TenantForm {
  name: string;
  namespace: string;
  dataStore: string;
  kubernetesVersion: string;
  replicas: string;
  serviceType: ServiceType;
  apiPort: string;
  konnectivityPort: string;
  apiAddress: string;
  advertiseAddress: string;
  certSans: string;
  admissionControllers: string;
  serviceAnnotations: string;
  serviceLabels: string;
  nodeSelector: string;
  /** One CIDR, or two of different IP families for a dual-stack tenant, comma separated. */
  serviceCidrs: string;
  podCidrs: string;
  /** Empty to let Kamaji compute them from the Service CIDRs. */
  dnsServiceIps: string;
  /** Empty for the default of the management cluster. */
  ipFamilyPolicy: IPFamilyPolicy | "";
  /** Comma separated, the primary family first; empty for the default of the management cluster. */
  ipFamilies: string;
  /** For a LoadBalancer Service: empty for the default of Kubernetes, which allocates them. */
  allocateLoadBalancerNodePorts: "" | "true" | "false";
  /** For a ClusterIP Service, with the API address set. */
  headless: boolean;
}

/**
 * The fields that a provider preset sets: the annotations of the control plane's Service for each, one replica on kind,
 * where the tenant runs on a single node, and a LoadBalancer Service for the internal load balancer of Azure.
 */
export function providerProfileFields(profile: ProviderProfile): Partial<TenantForm> {
  return {
    serviceAnnotations: profileAnnotations[profile],
    ...(profile === "kind" ? { replicas: "1" } : {}),
    ...(profile === "azure" ? { serviceType: "LoadBalancer" as const } : {}),
  };
}

const parseCsvList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const parseKeyValueLines = (value: string): Record<string, string> => {
  const parsed: Record<string, string> = {};

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");

    if (equalsIndex === -1) {
      throw new Error(`Invalid key/value entry: "${line}". Use key=value format.`);
    }

    const key = line.slice(0, equalsIndex).trim();
    const entryValue = line.slice(equalsIndex + 1).trim();

    if (!key) {
      throw new Error(`Invalid key/value entry: "${line}". Key cannot be empty.`);
    }

    parsed[key] = entryValue;
  }

  return parsed;
};

/** The IP family of a CIDR, or `undefined` when the value is not one. */
export function cidrFamily(value: string): IPFamily | undefined {
  const slash = value.lastIndexOf("/");
  const address = value.slice(0, slash);
  const prefix = value.slice(slash + 1);

  if (slash === -1 || !/^\d{1,3}$/.test(prefix)) {
    return undefined;
  }

  const octets = address.split(".");

  if (octets.length === 4) {
    const valid = octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);

    return valid && Number(prefix) <= 32 ? "IPv4" : undefined;
  }

  if (!address.includes(":") || Number(prefix) > 128) {
    return undefined;
  }

  try {
    new URL(`http://[${address}]`);
    return "IPv6";
  } catch {
    return undefined;
  }
}

/**
 * The CIDRs of a field, which Kamaji takes as one, or two of different IP families. Returns an error message for the
 * user in place of the list when the field is not such a list.
 */
function parseCidrList(value: string, field: string): string[] | string {
  const cidrs = parseCsvList(value);
  const families = cidrs.map(cidrFamily);

  if (cidrs.length < 1 || cidrs.length > 2) {
    return `${field} must have one CIDR, or two for a dual-stack tenant`;
  }

  const invalid = cidrs.find((_, index) => !families[index]);

  if (invalid) {
    return `${field}: "${invalid}" is not a valid CIDR`;
  }

  if (families.length === 2 && families[0] === families[1]) {
    return `${field} must not have two CIDRs of the same IP family`;
  }

  return cidrs;
}

/** The IP families of the form, or an error message for the user. */
function parseIpFamilies(form: TenantForm): IPFamily[] | string {
  const families = parseCsvList(form.ipFamilies);
  const known = families.filter((family): family is IPFamily => family === "IPv4" || family === "IPv6");

  if (known.length !== families.length) {
    return "IP families must be IPv4, IPv6, or both";
  }

  if (families.length > 2 || (families.length === 2 && families[0] === families[1])) {
    return "IP families must not repeat a family";
  }

  if (form.ipFamilyPolicy === "SingleStack" && families.length > 1) {
    return "A SingleStack IP family policy takes one IP family";
  }

  return known;
}

const kubernetesVersionPattern = /^v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/;

const parsePort = (value: string): number | undefined => {
  const port = Number(value.trim());

  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined;
};

/** What is wrong with the fields of the form before a resource is built from them, if anything. */
export function validateTenantForm(form: TenantForm): string | undefined {
  if (!form.name.trim()) {
    return "Tenant name is required";
  }

  const replicas = Number(form.replicas.trim());

  if (!Number.isInteger(replicas) || replicas < 1) {
    return "Replicas must be a positive integer";
  }

  if (parsePort(form.apiPort) === undefined) {
    return "API port must be an integer between 1 and 65535";
  }

  if (parsePort(form.konnectivityPort) === undefined) {
    return "Konnectivity port must be an integer between 1 and 65535";
  }

  const version = kubernetesVersionPattern.exec(form.kubernetesVersion.trim());

  if (!version) {
    return "Kubernetes version must be a version such as v1.36.3";
  }

  const [major, minor] = [Number(version[1]), Number(version[2])];
  const newest = newestKubernetesVersion;

  if (major > newest.major || (major === newest.major && minor > newest.minor)) {
    return `Kamaji runs tenants up to Kubernetes v${newest.major}.${newest.minor}`;
  }

  for (const [value, field] of [
    [form.serviceCidrs, "Service CIDRs"],
    [form.podCidrs, "Pod CIDRs"],
  ]) {
    const cidrs = parseCidrList(value, field);

    if (typeof cidrs === "string") {
      return cidrs;
    }
  }

  const families = parseIpFamilies(form);

  if (typeof families === "string") {
    return families;
  }

  if (form.headless && form.serviceType === "ClusterIP" && !form.apiAddress.trim()) {
    return "A headless Service needs the API address, which it announces in place of a Service IP";
  }

  return undefined;
}

/**
 * The Tenant Control Plane that the fields of the form describe. Throws an error with a message for the user when a
 * field cannot be read.
 */
export function buildTenantResource(form: TenantForm): TenantControlPlaneResource {
  const version = form.kubernetesVersion.trim();
  const parsedReplicas = Number(form.replicas.trim());
  const dnsServiceIPs = parseCsvList(form.dnsServiceIps);
  const serviceCidrs = parseCidrList(form.serviceCidrs, "Service CIDRs");
  const podCidrs = parseCidrList(form.podCidrs, "Pod CIDRs");
  const ipFamilies = parseIpFamilies(form);
  const certSANs = parseCsvList(form.certSans);
  const annotations = parseKeyValueLines(form.serviceAnnotations);
  const labels = parseKeyValueLines(form.serviceLabels);
  const nodeSelector = parseKeyValueLines(form.nodeSelector);
  const enabledAdmissionControllers = parseCsvList(form.admissionControllers).map((controller) => {
    const known = admissionControllers.find((candidate) => candidate === controller);

    if (!known) {
      throw new Error(`Unknown admission controller: "${controller}".`);
    }

    return known;
  });

  if (!serviceTypes.includes(form.serviceType)) {
    throw new Error(`Unknown service type: "${form.serviceType}".`);
  }

  if (typeof serviceCidrs === "string") {
    throw new Error(serviceCidrs);
  }

  if (typeof podCidrs === "string") {
    throw new Error(podCidrs);
  }

  if (typeof ipFamilies === "string") {
    throw new Error(ipFamilies);
  }

  const service: ServiceSpec = {
    serviceType: form.serviceType,
    ...(form.ipFamilyPolicy ? { ipFamilyPolicy: form.ipFamilyPolicy } : {}),
    ...(ipFamilies.length ? { ipFamilies } : {}),
    ...(form.serviceType === "LoadBalancer" && form.allocateLoadBalancerNodePorts
      ? { allocateLoadBalancerNodePorts: form.allocateLoadBalancerNodePorts === "true" }
      : {}),
    ...(form.serviceType === "ClusterIP" && form.headless ? { headless: true } : {}),
  };

  return {
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "TenantControlPlane",
    metadata: {
      name: form.name.trim(),
      namespace: form.namespace.trim(),
    },
    spec: {
      dataStore: form.dataStore.trim() || "default",
      networkProfile: {
        port: parsePort(form.apiPort) ?? 6443,
        serviceCidrs,
        podCidrs,
        ...(dnsServiceIPs.length ? { dnsServiceIPs } : {}),
        ...(form.apiAddress.trim() ? { address: form.apiAddress.trim() } : {}),
        ...(form.advertiseAddress.trim() ? { advertiseAddress: form.advertiseAddress.trim() } : {}),
        ...(certSANs.length ? { certSANs } : {}),
      },
      kubernetes: {
        version: version.startsWith("v") ? version : `v${version}`,
        kubelet: {
          configurationJSONPatches: [{ op: "add", path: "/cgroupDriver", value: "systemd" }],
        },
        ...(enabledAdmissionControllers.length ? { admissionControllers: enabledAdmissionControllers } : {}),
      },
      controlPlane: {
        deployment: {
          replicas: Number.isInteger(parsedReplicas) && parsedReplicas > 0 ? parsedReplicas : 1,
          ...(Object.keys(nodeSelector).length ? { nodeSelector } : {}),
        },
        service: {
          ...service,
          ...(Object.keys(annotations).length || Object.keys(labels).length
            ? {
                additionalMetadata: {
                  ...(Object.keys(annotations).length ? { annotations } : {}),
                  ...(Object.keys(labels).length ? { labels } : {}),
                },
              }
            : {}),
        },
      },
      addons: {
        coreDNS: {},
        kubeProxy: {},
        konnectivity: {
          server: {
            port: parsePort(form.konnectivityPort) ?? 8132,
            resources: {},
          },
          agent: {},
        },
      },
    },
  };
}

export const tenantResourceToYaml = (resource: TenantControlPlaneResource): string =>
  yamlStringify(resource, { indent: 2 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The Tenant Control Plane of the YAML editor, with the namespace of the form when the YAML names none. The API server
 * validates the rest of the object against the CRD. Throws an error with a message for the user.
 */
export function parseTenantResourceYaml(content: string, namespace: string): TenantControlPlaneResource {
  const parsed: unknown = yamlParse(content);

  if (!isRecord(parsed)) {
    throw new Error("Invalid YAML: the content is not an object.");
  }

  const metadata = isRecord(parsed.metadata) ? parsed.metadata : {};
  const name = typeof metadata.name === "string" ? metadata.name.trim() : "";

  if (!name) {
    throw new Error("Invalid YAML: metadata.name is required.");
  }

  const yamlNamespace = typeof metadata.namespace === "string" ? metadata.namespace.trim() : "";

  return {
    ...parsed,
    metadata: { ...metadata, name, namespace: yamlNamespace || namespace.trim() },
  } as TenantControlPlaneResource;
}
