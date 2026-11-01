// @vitest-environment jsdom

import { Renderer } from "@freelensapp/extensions";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TenantControlPlane } from "../k8s/tenant-control-plane-v1alpha1";
import { decodeSecretValue, downloadAdminKubeconfig, KamajiMenuItem } from "./kamaji-menu-item";

import type { TenantControlPlaneStatus } from "../k8s/tenant-control-plane-v1alpha1";

const kubeconfig = "apiVersion: v1\nkind: Config\nusers:\n- name: kubernetes-admin-café\n";
const encoded = Buffer.from(kubeconfig, "utf8").toString("base64");

const buildTenant = (status?: TenantControlPlaneStatus) =>
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
    },
    status,
  });

const serveSecret = (data: Record<string, string>) =>
  vi.spyOn(Renderer.K8sApi.secretsApi, "get").mockResolvedValue({ data } as unknown as Renderer.K8sApi.Secret);

// jsdom has no object URLs: the test keeps the Blob that the menu item saves, and the name of the file.
let saved: { blob?: Blob; fileName?: string };

beforeEach(() => {
  saved = {};
  URL.createObjectURL = vi.fn((blob: Blob) => {
    saved.blob = blob;
    return "blob:kubeconfig";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    saved.fileName = this.download;
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("decodeSecretValue", () => {
  it("reads a base64 value as UTF-8 text", () => {
    expect(decodeSecretValue(encoded)).toBe(kubeconfig);
  });
});

describe("downloadAdminKubeconfig", () => {
  it("saves the admin.conf of the Secret that Kamaji records for the tenant", async () => {
    const get = serveSecret({ "admin.conf": encoded, "super-admin.conf": "c3VwZXI=" });

    await downloadAdminKubeconfig(buildTenant({ kubeconfig: { admin: { secretName: "shop-admin-kubeconfig-v2" } } }));

    expect(get).toHaveBeenCalledWith({ name: "shop-admin-kubeconfig-v2", namespace: "kamaji-tenants" });
    expect(saved.fileName).toBe("kamaji-shop-kubeconfig.yaml");
    expect(await saved.blob?.text()).toBe(kubeconfig);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:kubeconfig");
  });

  it("reads the Secret that Kamaji creates when the status names none", async () => {
    const get = serveSecret({ "admin.conf": encoded });

    await downloadAdminKubeconfig(buildTenant());

    expect(get).toHaveBeenCalledWith({ name: "shop-admin-kubeconfig", namespace: "kamaji-tenants" });
  });

  it("fails when the Secret has no admin.conf", async () => {
    serveSecret({});

    await expect(downloadAdminKubeconfig(buildTenant())).rejects.toThrow(
      "The Secret kamaji-tenants/shop-admin-kubeconfig has no admin.conf",
    );
    expect(saved.fileName).toBeUndefined();
  });
});

describe("KamajiMenuItem", () => {
  it("tells the user why the download failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Renderer.K8sApi.secretsApi, "get").mockRejectedValue(new Error("secrets is forbidden"));

    render(<KamajiMenuItem object={buildTenant()} />);
    fireEvent.click(screen.getByRole("menuitem"));

    await waitFor(() =>
      expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith(
        "Failed to download the kubeconfig of shop: Error: secrets is forbidden",
      ),
    );
  });
});
