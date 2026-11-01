import { describe, expect, it } from "vitest";
import { TenantControlPlane } from "./tenant-control-plane-v1alpha1";

import type { TenantControlPlaneSpec, TenantControlPlaneStatus } from "./tenant-control-plane-v1alpha1";

// The host hands the extension its own KubeObject, so the model has static helpers that take the object. The stub of
// @freelensapp/extensions (test/freelens-extensions.ts) builds a TenantControlPlane from plain resource data.
const spec: TenantControlPlaneSpec = {
  controlPlane: { service: { serviceType: "LoadBalancer" } },
  kubernetes: { version: "v1.36.3", kubelet: {} },
};

const buildTenant = (status?: TenantControlPlaneStatus, overrides: Partial<TenantControlPlaneSpec> = {}) =>
  new TenantControlPlane({
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "TenantControlPlane",
    metadata: {
      name: "shop",
      namespace: "kamaji-tenants",
      selfLink: "/apis/kamaji.clastix.io/v1alpha1/namespaces/kamaji-tenants/tenantcontrolplanes/shop",
    },
    spec: { ...spec, ...overrides },
    status,
  });

const deployment = { name: "shop", namespace: "kamaji-tenants", selector: "kamaji.clastix.io/name=shop" };

describe("TenantControlPlane", () => {
  describe("getStatus", () => {
    it("returns the status of the version that Kamaji reports", () => {
      const tenant = buildTenant({ kubernetesResources: { version: { version: "v1.36.3", status: "Ready" } } });

      expect(TenantControlPlane.getStatus(tenant)).toBe("Ready");
    });

    it("returns Unknown before Kamaji reports one", () => {
      expect(TenantControlPlane.getStatus(buildTenant())).toBe("Unknown");
      expect(TenantControlPlane.getStatus(buildTenant({ kubernetesResources: { version: {} } }))).toBe("Unknown");
    });
  });

  describe("getReadyReplicas", () => {
    it("counts the available pods over the replicas", () => {
      const tenant = buildTenant({
        kubernetesResources: { deployment: { ...deployment, replicas: 2, readyReplicas: 2, availableReplicas: 1 } },
      });

      expect(TenantControlPlane.getReadyReplicas(tenant)).toBe("1/2");
    });

    it("counts the ready pods when Kamaji reports no available ones", () => {
      const tenant = buildTenant({
        kubernetesResources: { deployment: { ...deployment, replicas: 3, readyReplicas: 2 } },
      });

      expect(TenantControlPlane.getReadyReplicas(tenant)).toBe("2/3");
    });

    it("counts nothing before the Deployment exists", () => {
      expect(TenantControlPlane.getReadyReplicas(buildTenant())).toBe("0/0");
    });
  });

  describe("getEndpoint", () => {
    it("returns the endpoint of the control plane", () => {
      const tenant = buildTenant({ controlPlaneEndpoint: "172.19.255.200:6443" });

      expect(TenantControlPlane.getEndpoint(tenant)).toBe("172.19.255.200:6443");
    });

    it("returns undefined before Kamaji reports one", () => {
      expect(TenantControlPlane.getEndpoint(buildTenant())).toBeUndefined();
      expect(TenantControlPlane.getEndpoint(buildTenant({ controlPlaneEndpoint: "" }))).toBeUndefined();
    });
  });

  describe("getKubernetesVersion", () => {
    it("returns the version of the spec", () => {
      const tenant = buildTenant({ kubernetesResources: { version: { version: "v1.35.0" } } });

      expect(TenantControlPlane.getKubernetesVersion(tenant)).toBe("v1.36.3");
    });

    it("falls back to the version that Kamaji reports", () => {
      const tenant = buildTenant(
        { kubernetesResources: { version: { version: "v1.35.0" } } },
        { kubernetes: { version: "", kubelet: {} } },
      );

      expect(TenantControlPlane.getKubernetesVersion(tenant)).toBe("v1.35.0");
    });
  });

  describe("getPodCIDRs and getServiceCIDRs", () => {
    it("return the lists, which take precedence over the single CIDRs that the CRD defaults", () => {
      const tenant = buildTenant(undefined, {
        networkProfile: {
          podCidr: "10.244.0.0/16",
          podCidrs: ["10.250.0.0/16", "fd00:10:250::/56"],
          serviceCidr: "10.96.0.0/16",
          serviceCidrs: ["10.100.0.0/16"],
        },
      });

      expect(TenantControlPlane.getPodCIDRs(tenant)).toEqual(["10.250.0.0/16", "fd00:10:250::/56"]);
      expect(TenantControlPlane.getServiceCIDRs(tenant)).toEqual(["10.100.0.0/16"]);
    });

    it("return the deprecated single CIDRs of a tenant without the lists", () => {
      const tenant = buildTenant(undefined, {
        networkProfile: { podCidr: "10.244.0.0/16", serviceCidr: "10.96.0.0/16" },
      });

      expect(TenantControlPlane.getPodCIDRs(tenant)).toEqual(["10.244.0.0/16"]);
      expect(TenantControlPlane.getServiceCIDRs(tenant)).toEqual(["10.96.0.0/16"]);
    });

    it("return nothing without a network profile", () => {
      expect(TenantControlPlane.getPodCIDRs(buildTenant())).toEqual([]);
      expect(TenantControlPlane.getServiceCIDRs(buildTenant())).toEqual([]);
    });
  });

  describe("getBlockedWrites", () => {
    it("names the writes that the write permissions block", () => {
      const tenant = buildTenant(undefined, { writePermissions: { blockCreation: true, blockDeletion: true } });

      expect(TenantControlPlane.getBlockedWrites(tenant)).toEqual(["create", "delete"]);
      expect(TenantControlPlane.getBlockedWrites(buildTenant())).toEqual([]);
    });
  });

  describe("getDataStoreSchema and getDataStoreUsername", () => {
    it("return the values of the spec, else the ones that Kamaji set up", () => {
      const setUp = { storage: { setup: { schema: "kamaji_tenants_shop", user: "kamaji_tenants_shop" } } };

      expect(TenantControlPlane.getDataStoreSchema(buildTenant(setUp))).toBe("kamaji_tenants_shop");
      expect(TenantControlPlane.getDataStoreUsername(buildTenant(setUp))).toBe("kamaji_tenants_shop");
      expect(
        TenantControlPlane.getDataStoreSchema(
          buildTenant(setUp, { dataStoreSchema: "shop", dataStoreUsername: "app" }),
        ),
      ).toBe("shop");
      expect(TenantControlPlane.getDataStoreUsername(buildTenant(setUp, { dataStoreUsername: "app" }))).toBe("app");
      expect(TenantControlPlane.getDataStoreSchema(buildTenant())).toBeUndefined();
    });
  });

  describe("getConditions", () => {
    it("returns the conditions of the Deployment of the control plane", () => {
      const conditions = [{ type: "Available", status: "True" as const, reason: "MinimumReplicasAvailable" }];
      const tenant = buildTenant({ kubernetesResources: { deployment: { ...deployment, conditions } } });

      expect(TenantControlPlane.getConditions(tenant)).toEqual(conditions);
      expect(TenantControlPlane.getConditions(buildTenant())).toEqual([]);
    });
  });

  describe("getDataStore", () => {
    it("returns the DataStore and its driver", () => {
      const tenant = buildTenant({ storage: { dataStoreName: "etcd-test", driver: "etcd" } });

      expect(TenantControlPlane.getDataStore(tenant)).toBe("etcd-test etcd");
    });

    it("returns what Kamaji reports of the two", () => {
      expect(TenantControlPlane.getDataStore(buildTenant({ storage: { driver: "MySQL" } }))).toBe("MySQL");
    });

    it("returns undefined before Kamaji reports a DataStore", () => {
      expect(TenantControlPlane.getDataStore(buildTenant())).toBeUndefined();
    });
  });
});
