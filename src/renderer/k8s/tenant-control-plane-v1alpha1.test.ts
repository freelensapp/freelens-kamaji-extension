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
