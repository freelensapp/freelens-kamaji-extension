// @vitest-environment jsdom

import { Common, type Renderer } from "@freelensapp/extensions";
import { act, cleanup, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withPageErrorBoundary } from "../../components/error-boundary";
import { TenantControlPlane } from "../../k8s/tenant-control-plane-v1alpha1";
import { TenantsPage } from "./tenants-page";

import type { TenantControlPlaneApi, TenantControlPlaneStatus } from "../../k8s/tenant-control-plane-v1alpha1";

// A minimal stub extension: only `name` is read by the error boundary.
const extension = { name: "kamaji-extension" } as Renderer.LensExtension;

type TenantControlPlaneStore = Renderer.K8sApi.KubeObjectStore<TenantControlPlane, TenantControlPlaneApi>;

const notRegistered = "API for TenantControlPlane is not registered. Extension won't work correctly.";

const buildTenant = (name: string, status?: TenantControlPlaneStatus) =>
  new TenantControlPlane({
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "TenantControlPlane",
    metadata: {
      name,
      namespace: "kamaji-tenants",
      uid: name,
      resourceVersion: "1",
      selfLink: `/apis/kamaji.clastix.io/v1alpha1/namespaces/kamaji-tenants/tenantcontrolplanes/${name}`,
    },
    spec: {
      controlPlane: { service: { serviceType: "LoadBalancer" } },
      kubernetes: { version: "v1.36.3", kubelet: {} },
    },
    status,
  });

// The stub's `getStore()` throws, as the host's does for a kind that the cluster does not serve. A test serves the
// kind by spying on `getStore`; the stub's list layout renders the cells of every item of the store.
const serve = (...tenants: TenantControlPlane[]) =>
  vi.spyOn(TenantControlPlane, "getStore").mockReturnValue({ items: tenants } as unknown as TenantControlPlaneStore);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("TenantsPage", () => {
  it("lists the tenants with their status, pods, endpoint, version and datastore", () => {
    serve(
      buildTenant("shop", {
        controlPlaneEndpoint: "172.19.255.200:6443",
        storage: { dataStoreName: "etcd-test", driver: "etcd" },
        kubernetesResources: {
          version: { version: "v1.36.3", status: "Ready" },
          deployment: {
            name: "shop",
            namespace: "kamaji-tenants",
            selector: "kamaji.clastix.io/name=shop",
            replicas: 2,
            availableReplicas: 2,
          },
        },
      }),
    );

    render(<TenantsPage />);

    for (const text of ["shop", "kamaji-tenants", "Ready", "2/2", "172.19.255.200:6443", "v1.36.3", "etcd-test etcd"]) {
      expect(screen.getByText(text)).toBeDefined();
    }
  });

  it("shows - for what Kamaji has not reported yet", () => {
    serve(buildTenant("billing"));

    render(<TenantsPage />);

    expect(screen.getByText("Unknown")).toBeDefined();
    expect(screen.getByText("0/0")).toBeDefined();
    // The endpoint and the datastore; the version is in the spec.
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("says that Kamaji was not detected while the cluster serves no Tenant Control Plane", () => {
    render(<TenantsPage />);

    expect(screen.getByText("Kamaji was not detected on this cluster")).toBeDefined();
  });

  it("renders the list once the host serves the kind after the first render", () => {
    // The host's `getStore()` reads its observable API registry. The spy reads an observable in its place, so that
    // serving the kind is a change the page sees.
    const served = observable.box(false);
    const tenant = buildTenant("shop");
    vi.spyOn(TenantControlPlane, "getStore").mockImplementation(() => {
      if (!served.get()) {
        throw new Error(notRegistered);
      }
      return { items: [tenant] } as unknown as TenantControlPlaneStore;
    });

    render(<TenantsPage />);

    expect(screen.getByText("Kamaji was not detected on this cluster")).toBeDefined();

    act(() => runInAction(() => served.set(true)));

    expect(screen.getByText("shop")).toBeDefined();
    expect(screen.queryByText("Kamaji was not detected on this cluster")).toBeNull();
  });

  // A `try`/`catch` around the call of the page does not see this error: the host calls `renderTableContents` from the
  // render of its own list layout, a child of the page.
  it("keeps an error that a callback throws from the render of the host's list layout inside the page", () => {
    // React reports an error that a boundary caught on the console as well.
    vi.spyOn(console, "error").mockImplementation(() => {});
    serve(buildTenant("shop"));
    vi.spyOn(TenantControlPlane, "getStatus").mockImplementation(() => {
      throw new Error("no status field");
    });
    const { Page } = withPageErrorBoundary(extension, {
      id: "kamaji-tenants-page",
      components: { Page: () => <TenantsPage /> },
    }).components;

    render(<Page params={{}} />);

    expect(screen.getByText("Error: no status field")).toBeDefined();
    expect(Common.logger.error).toHaveBeenCalledTimes(1);
    expect(Common.logger.error).toHaveBeenCalledWith("[kamaji-extension]: Error: no status field", expect.any(String));
  });

  it("keeps an error of the store other than a kind not served inside the page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(TenantControlPlane, "getStore").mockImplementation(() => {
      throw new Error("API for TenantControlPlane is not for CRD and misses metainfo.");
    });
    const { Page } = withPageErrorBoundary(extension, {
      id: "kamaji-tenants-page",
      components: { Page: () => <TenantsPage /> },
    }).components;

    render(<Page params={{}} />);

    expect(screen.getByText("Error: API for TenantControlPlane is not for CRD and misses metainfo.")).toBeDefined();
    expect(screen.queryByText("Kamaji was not detected on this cluster")).toBeNull();
  });
});
