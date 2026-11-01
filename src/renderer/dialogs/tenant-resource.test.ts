import { describe, expect, it } from "vitest";
import {
  buildTenantResource,
  parseTenantResourceYaml,
  profileAnnotations,
  type TenantForm,
  tenantResourceToYaml,
  validateTenantForm,
} from "./tenant-resource";

// The defaults of the dialog.
const defaults: TenantForm = {
  name: "shop",
  namespace: "kamaji-tenants",
  dataStore: "default",
  kubernetesVersion: "1.33.0",
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
  serviceCidr: "10.96.0.0/16",
  podCidr: "10.244.0.0/16",
  dnsServiceIp: "10.96.0.10",
};

describe("buildTenantResource", () => {
  it("builds a Tenant Control Plane from the defaults of the dialog", () => {
    const resource = buildTenantResource(defaults);

    expect(resource.apiVersion).toBe("kamaji.clastix.io/v1alpha1");
    expect(resource.kind).toBe("TenantControlPlane");
    expect(resource.metadata).toEqual({ name: "shop", namespace: "kamaji-tenants" });
    expect(resource.spec.dataStore).toBe("default");
    expect(resource.spec.kubernetes.version).toBe("v1.33.0");
    expect(resource.spec.kubernetes.admissionControllers).toEqual(["ResourceQuota", "LimitRanger"]);
    expect(resource.spec.controlPlane.deployment?.replicas).toBe(1);
    expect(resource.spec.controlPlane.service).toEqual({ serviceType: "LoadBalancer" });
    expect(resource.spec.networkProfile?.port).toBe(6443);
    expect(resource.spec.addons?.konnectivity?.server?.port).toBe(8132);
  });

  it("keeps a version that has its v", () => {
    expect(buildTenantResource({ ...defaults, kubernetesVersion: " v1.36.3 " }).spec.kubernetes.version).toBe(
      "v1.36.3",
    );
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
  it("accepts the defaults", () => {
    expect(validateTenantForm(defaults)).toBeUndefined();
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
