// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";
import { TenantDetails } from "./tenant-details";

import type { TenantControlPlaneSpec, TenantControlPlaneStatus } from "../k8s/tenant-control-plane-v1alpha1";

const buildTenant = (spec: Partial<TenantControlPlaneSpec>, status?: TenantControlPlaneStatus) =>
  new TenantControlPlane({
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "TenantControlPlane",
    metadata: {
      name: "shop",
      namespace: "kamaji-tenants",
      selfLink: "/apis/kamaji.clastix.io/v1alpha1/namespaces/kamaji-tenants/tenantcontrolplanes/shop",
    },
    spec: {
      controlPlane: { service: { serviceType: "LoadBalancer" } },
      kubernetes: { version: "v1.36.3", kubelet: {} },
      ...spec,
    },
    status,
  });

// The value of the row that the stub's DrawerItem renders with this name.
const rowValue = (name: string) => screen.getByText(name).parentElement?.textContent?.slice(name.length);

afterEach(() => {
  cleanup();
});

describe("TenantDetails", () => {
  it("shows the spec and what Kamaji reports of a tenant", () => {
    const tenant = buildTenant(
      { dataStore: "etcd-test", controlPlane: { deployment: { replicas: 2 }, service: { serviceType: "NodePort" } } },
      {
        controlPlaneEndpoint: "172.19.255.200:6443",
        storage: { driver: "etcd", dataStoreName: "etcd-test" },
        kubernetesResources: {
          version: { version: "v1.36.3", status: "Ready" },
          deployment: {
            name: "shop",
            namespace: "kamaji-tenants",
            selector: "app=shop",
            replicas: 2,
            readyReplicas: 1,
          },
        },
        addons: { konnectivity: { enabled: true } },
      },
    );

    render(<TenantDetails object={tenant} />);

    expect(rowValue("API Version")).toBe("kamaji.clastix.io/v1alpha1");
    expect(rowValue("Status")).toBe("Ready");
    expect(rowValue("Kubernetes Version")).toBe("v1.36.3");
    expect(rowValue("Control Plane Endpoint")).toBe("172.19.255.200:6443");
    expect(rowValue("Control Plane Replicas")).toBe("2");
    expect(rowValue("Ready Pods")).toBe("1/2");
    expect(rowValue("Control Plane Service Type")).toBe("NodePort");
    expect(rowValue("Data Store")).toBe("etcd-test");
    expect(rowValue("Storage Driver")).toBe("etcd");
    expect(rowValue("Data Store Name (Status)")).toBe("etcd-test");
    expect(rowValue("Konnectivity")).toBe("Enabled");
  });

  it("says that Konnectivity is disabled when Kamaji reports so", () => {
    render(<TenantDetails object={buildTenant({}, { addons: { konnectivity: { enabled: false } } })} />);

    expect(rowValue("Konnectivity")).toBe("Disabled");
  });

  it("shows a new tenant, which Kamaji has not reconciled yet", () => {
    render(<TenantDetails object={buildTenant({})} />);

    expect(rowValue("Status")).toBe("Unknown");
    expect(rowValue("Control Plane Replicas")).toBe("-");
    expect(rowValue("Ready Pods")).toBe("0/0");
    expect(rowValue("Data Store")).toBe("-");
    for (const hidden of ["Control Plane Endpoint", "Storage Driver", "Data Store Name (Status)", "Konnectivity"]) {
      expect(screen.queryByText(hidden)).toBeNull();
    }
  });
});
