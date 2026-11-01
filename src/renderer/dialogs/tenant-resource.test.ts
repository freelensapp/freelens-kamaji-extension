import { describe, expect, it } from "vitest";
import {
  buildTenantResource,
  cidrFamily,
  parseTenantResourceYaml,
  profileAnnotations,
  providerProfileFields,
  type TenantForm,
  tenantResourceToYaml,
  validateTenantForm,
} from "./tenant-resource";

// The defaults of the dialog.
const defaults: TenantForm = {
  name: "shop",
  namespace: "kamaji-tenants",
  dataStore: "default",
  kubernetesVersion: "v1.36.3",
  replicas: "1",
  serviceType: "LoadBalancer",
  apiPort: "6443",
  konnectivityPort: "8132",
  apiAddress: "",
  advertiseAddress: "",
  certSans: "",
  admissionControllers: "ResourceQuota,LimitRanger",
  serviceAnnotations: "",
  serviceLabels: "",
  nodeSelector: "",
  serviceCidrs: "10.96.0.0/16",
  podCidrs: "10.244.0.0/16",
  dnsServiceIps: "",
  ipFamilyPolicy: "",
  ipFamilies: "",
  allocateLoadBalancerNodePorts: "",
  headless: false,
};

describe("buildTenantResource", () => {
  it("builds a Tenant Control Plane from the defaults of the dialog", () => {
    const resource = buildTenantResource(defaults);

    expect(resource.apiVersion).toBe("kamaji.clastix.io/v1alpha1");
    expect(resource.kind).toBe("TenantControlPlane");
    expect(resource.metadata).toEqual({ name: "shop", namespace: "kamaji-tenants" });
    expect(resource.spec.dataStore).toBe("default");
    expect(resource.spec.kubernetes.version).toBe("v1.36.3");
    expect(resource.spec.kubernetes.admissionControllers).toEqual(["ResourceQuota", "LimitRanger"]);
    expect(resource.spec.controlPlane.deployment?.replicas).toBe(1);
    expect(resource.spec.controlPlane.service).toEqual({ serviceType: "LoadBalancer" });
    expect(resource.spec.networkProfile).toEqual({
      port: 6443,
      serviceCidrs: ["10.96.0.0/16"],
      podCidrs: ["10.244.0.0/16"],
    });
    expect(resource.spec.addons?.konnectivity?.server?.port).toBe(8132);
  });

  it("adds the v of a version without one", () => {
    expect(buildTenantResource({ ...defaults, kubernetesVersion: " 1.37.0 " }).spec.kubernetes.version).toBe("v1.37.0");
  });

  it("writes the CIDRs as the lists of Kamaji, without the deprecated podCidr and serviceCidr", () => {
    const networkProfile = buildTenantResource(defaults).spec.networkProfile;

    expect(networkProfile?.serviceCidrs).toEqual(["10.96.0.0/16"]);
    expect(networkProfile?.podCidrs).toEqual(["10.244.0.0/16"]);
    expect(networkProfile).not.toHaveProperty("serviceCidr");
    expect(networkProfile).not.toHaveProperty("podCidr");
  });

  it("builds a dual-stack tenant, with two CIDRs per list and the IP families of the Service", () => {
    const resource = buildTenantResource({
      ...defaults,
      serviceCidrs: "10.96.0.0/16, fd00:10:96::/112",
      podCidrs: "10.244.0.0/16,fd00:10:244::/56",
      ipFamilyPolicy: "PreferDualStack",
      ipFamilies: "IPv4,IPv6",
    });

    expect(resource.spec.networkProfile?.serviceCidrs).toEqual(["10.96.0.0/16", "fd00:10:96::/112"]);
    expect(resource.spec.networkProfile?.podCidrs).toEqual(["10.244.0.0/16", "fd00:10:244::/56"]);
    expect(resource.spec.controlPlane.service).toEqual({
      serviceType: "LoadBalancer",
      ipFamilyPolicy: "PreferDualStack",
      ipFamilies: ["IPv4", "IPv6"],
    });
  });

  it("lets Kamaji compute the DNS service IPs unless they are given", () => {
    expect(buildTenantResource(defaults).spec.networkProfile).not.toHaveProperty("dnsServiceIPs");
    expect(
      buildTenantResource({ ...defaults, dnsServiceIps: "10.96.0.10" }).spec.networkProfile?.dnsServiceIPs,
    ).toEqual(["10.96.0.10"]);
  });

  it("sets the cgroup driver with a JSON patch of the kubelet configuration, not the deprecated cgroupfs", () => {
    expect(buildTenantResource(defaults).spec.kubernetes.kubelet).toEqual({
      configurationJSONPatches: [{ op: "add", path: "/cgroupDriver", value: "systemd" }],
    });
  });

  it("writes allocateLoadBalancerNodePorts for a LoadBalancer Service only", () => {
    const service = (form: Partial<TenantForm>) =>
      buildTenantResource({ ...defaults, ...form }).spec.controlPlane.service;

    expect(service({ allocateLoadBalancerNodePorts: "false" }).allocateLoadBalancerNodePorts).toBe(false);
    expect(service({ allocateLoadBalancerNodePorts: "true" }).allocateLoadBalancerNodePorts).toBe(true);
    expect(service({ allocateLoadBalancerNodePorts: "" })).not.toHaveProperty("allocateLoadBalancerNodePorts");
    expect(service({ allocateLoadBalancerNodePorts: "false", serviceType: "NodePort" })).not.toHaveProperty(
      "allocateLoadBalancerNodePorts",
    );
  });

  it("writes a headless Service for a ClusterIP Service only", () => {
    const service = (form: Partial<TenantForm>) =>
      buildTenantResource({ ...defaults, ...form }).spec.controlPlane.service;

    expect(service({ serviceType: "ClusterIP", headless: true, apiAddress: "10.0.0.5" }).headless).toBe(true);
    expect(service({ serviceType: "LoadBalancer", headless: true })).not.toHaveProperty("headless");
    expect(service({ serviceType: "ClusterIP", headless: false })).not.toHaveProperty("headless");
  });

  it("builds the tenant of each provider preset", () => {
    const tenantOf = (profile: Parameters<typeof providerProfileFields>[0]) =>
      buildTenantResource({ ...defaults, replicas: "3", serviceType: "NodePort", ...providerProfileFields(profile) })
        .spec.controlPlane;

    expect(tenantOf("generic")).toEqual({ deployment: { replicas: 3 }, service: { serviceType: "NodePort" } });
    expect(tenantOf("kind")).toEqual({ deployment: { replicas: 1 }, service: { serviceType: "NodePort" } });
    expect(tenantOf("aws")).toEqual({
      deployment: { replicas: 3 },
      service: {
        serviceType: "NodePort",
        additionalMetadata: {
          annotations: {
            "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "tcp",
            "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
            "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
          },
        },
      },
    });
    expect(tenantOf("azure")).toEqual({
      deployment: { replicas: 3 },
      service: {
        serviceType: "LoadBalancer",
        additionalMetadata: { annotations: { "service.beta.kubernetes.io/azure-load-balancer-internal": "true" } },
      },
    });
  });

  it("puts the annotations of the AWS and Azure presets on the Service, and none for the others", () => {
    const annotationsOf = (profile: keyof typeof profileAnnotations) =>
      buildTenantResource({ ...defaults, serviceAnnotations: profileAnnotations[profile] }).spec.controlPlane.service
        .additionalMetadata?.annotations;

    expect(annotationsOf("aws")).toEqual({
      "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "tcp",
      "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
      "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
    });
    expect(annotationsOf("azure")).toEqual({ "service.beta.kubernetes.io/azure-load-balancer-internal": "true" });
    expect(annotationsOf("generic")).toBeUndefined();
    expect(annotationsOf("kind")).toBeUndefined();
  });

  it("reads the labels of the Service and the node selector one key=value per line, without comments", () => {
    const resource = buildTenantResource({
      ...defaults,
      serviceLabels: "tenant.clastix.io=shop\n# a comment\n\nteam = payments",
      nodeSelector: "topology.kubernetes.io/zone=eu-west-1a",
    });

    expect(resource.spec.controlPlane.service.additionalMetadata).toEqual({
      labels: { "tenant.clastix.io": "shop", team: "payments" },
    });
    expect(resource.spec.controlPlane.deployment?.nodeSelector).toEqual({
      "topology.kubernetes.io/zone": "eu-west-1a",
    });
  });

  it("refuses a line that is not key=value", () => {
    expect(() => buildTenantResource({ ...defaults, serviceLabels: "tenant.clastix.io" })).toThrow(
      'Invalid key/value entry: "tenant.clastix.io". Use key=value format.',
    );
  });

  it("refuses an admission controller that Kamaji does not know", () => {
    expect(() => buildTenantResource({ ...defaults, admissionControllers: "ResourceQuota,Quota" })).toThrow(
      'Unknown admission controller: "Quota".',
    );
  });
});

describe("validateTenantForm", () => {
  it("accepts the defaults, and a dual-stack tenant", () => {
    expect(validateTenantForm(defaults)).toBeUndefined();
    expect(
      validateTenantForm({
        ...defaults,
        serviceCidrs: "fd00:10:96::/112,10.96.0.0/16",
        ipFamilyPolicy: "RequireDualStack",
        ipFamilies: "IPv6,IPv4",
      }),
    ).toBeUndefined();
  });

  it("says what is wrong with a field", () => {
    expect(validateTenantForm({ ...defaults, name: " " })).toBe("Tenant name is required");
    expect(validateTenantForm({ ...defaults, replicas: "0" })).toBe("Replicas must be a positive integer");
    expect(validateTenantForm({ ...defaults, apiPort: "70000" })).toBe(
      "API port must be an integer between 1 and 65535",
    );
    expect(validateTenantForm({ ...defaults, konnectivityPort: "x" })).toBe(
      "Konnectivity port must be an integer between 1 and 65535",
    );
  });

  it("refuses a Kubernetes version newer than v1.37, which Kamaji refuses, or one that is not a version", () => {
    expect(validateTenantForm({ ...defaults, kubernetesVersion: "v1.37.5" })).toBeUndefined();
    expect(validateTenantForm({ ...defaults, kubernetesVersion: "v1.38.0" })).toBe(
      "Kamaji runs tenants up to Kubernetes v1.37",
    );
    expect(validateTenantForm({ ...defaults, kubernetesVersion: "2.0.0" })).toBe(
      "Kamaji runs tenants up to Kubernetes v1.37",
    );
    expect(validateTenantForm({ ...defaults, kubernetesVersion: "v1.36" })).toBe(
      "Kubernetes version must be a version such as v1.36.3",
    );
  });

  it("refuses CIDRs that Kamaji refuses", () => {
    expect(validateTenantForm({ ...defaults, podCidrs: "" })).toBe(
      "Pod CIDRs must have one CIDR, or two for a dual-stack tenant",
    );
    expect(validateTenantForm({ ...defaults, podCidrs: "10.244.0.0/16,10.245.0.0/16,fd00::/56" })).toBe(
      "Pod CIDRs must have one CIDR, or two for a dual-stack tenant",
    );
    expect(validateTenantForm({ ...defaults, serviceCidrs: "10.96.0.0/16,10.97.0.0/16" })).toBe(
      "Service CIDRs must not have two CIDRs of the same IP family",
    );
    expect(validateTenantForm({ ...defaults, serviceCidrs: "10.96.0.0" })).toBe(
      'Service CIDRs: "10.96.0.0" is not a valid CIDR',
    );
  });

  it("refuses IP families that Kamaji refuses", () => {
    expect(validateTenantForm({ ...defaults, ipFamilies: "IPv5" })).toBe("IP families must be IPv4, IPv6, or both");
    expect(validateTenantForm({ ...defaults, ipFamilies: "IPv4,IPv4" })).toBe("IP families must not repeat a family");
    expect(validateTenantForm({ ...defaults, ipFamilyPolicy: "SingleStack", ipFamilies: "IPv4,IPv6" })).toBe(
      "A SingleStack IP family policy takes one IP family",
    );
  });

  it("refuses a headless Service without the API address, which Kamaji refuses", () => {
    expect(validateTenantForm({ ...defaults, serviceType: "ClusterIP", headless: true })).toBe(
      "A headless Service needs the API address, which it announces in place of a Service IP",
    );
    expect(
      validateTenantForm({ ...defaults, serviceType: "ClusterIP", headless: true, apiAddress: "10.0.0.5" }),
    ).toBeUndefined();
  });
});

describe("cidrFamily", () => {
  it("tells the family of an IPv4 or IPv6 CIDR", () => {
    expect(cidrFamily("10.96.0.0/16")).toBe("IPv4");
    expect(cidrFamily("fd00:10:96::/112")).toBe("IPv6");
    expect(cidrFamily("::/0")).toBe("IPv6");
  });

  it("returns undefined for a value that is not a CIDR", () => {
    for (const value of ["10.96.0.0", "10.96.0.0/33", "256.0.0.0/8", "fd00::/129", "fd00:::1/64", "example/24"]) {
      expect(cidrFamily(value)).toBeUndefined();
    }
  });
});

describe("the YAML editor", () => {
  it("reads back the resource that the form wrote", () => {
    const resource = buildTenantResource({ ...defaults, serviceAnnotations: profileAnnotations.aws });

    expect(parseTenantResourceYaml(tenantResourceToYaml(resource), "default")).toEqual(resource);
  });

  it("takes the namespace of the form when the YAML names none", () => {
    const yaml =
      "apiVersion: kamaji.clastix.io/v1alpha1\nkind: TenantControlPlane\nmetadata:\n  name: shop\nspec: {}\n";

    expect(parseTenantResourceYaml(yaml, "kamaji-dev").metadata).toEqual({ name: "shop", namespace: "kamaji-dev" });
  });

  it("refuses YAML that is not an object or has no name", () => {
    expect(() => parseTenantResourceYaml("- one\n- two\n", "default")).toThrow(
      "Invalid YAML: the content is not an object.",
    );
    expect(() => parseTenantResourceYaml("kind: TenantControlPlane\nmetadata: {}\n", "default")).toThrow(
      "Invalid YAML: metadata.name is required.",
    );
  });

  it("passes on the error of the YAML parser", () => {
    expect(() => parseTenantResourceYaml("metadata: [unclosed", "default")).toThrow();
  });
});
