import { parse as yamlParse, stringify as yamlStringify } from "yaml";

import type {
  AdmissionController,
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
  serviceCidr: string;
  podCidr: string;
  dnsServiceIp: string;
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

  return undefined;
}

/**
 * The Tenant Control Plane that the fields of the form describe. Throws an error with a message for the user when a
 * field cannot be read.
 */
export function buildTenantResource(form: TenantForm): TenantControlPlaneResource {
  const version = form.kubernetesVersion.trim();
  const parsedReplicas = Number(form.replicas.trim());
  const dnsServiceIPs = parseCsvList(form.dnsServiceIp);
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
        serviceCidr: form.serviceCidr.trim(),
        podCidr: form.podCidr.trim(),
        dnsServiceIPs: dnsServiceIPs.length ? dnsServiceIPs : ["10.96.0.10"],
        ...(form.apiAddress.trim() ? { address: form.apiAddress.trim() } : {}),
        ...(form.advertiseAddress.trim() ? { advertiseAddress: form.advertiseAddress.trim() } : {}),
        ...(certSANs.length ? { certSANs } : {}),
      },
      kubernetes: {
        version: version.startsWith("v") ? version : `v${version}`,
        kubelet: {
          cgroupfs: "systemd",
        },
        ...(enabledAdmissionControllers.length ? { admissionControllers: enabledAdmissionControllers } : {}),
      },
      controlPlane: {
        deployment: {
          replicas: Number.isInteger(parsedReplicas) && parsedReplicas > 0 ? parsedReplicas : 1,
          ...(Object.keys(nodeSelector).length ? { nodeSelector } : {}),
        },
        service: {
          serviceType: form.serviceType,
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
