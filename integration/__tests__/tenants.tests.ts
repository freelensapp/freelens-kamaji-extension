/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The session of the Tenant Control Planes. It disconnects the kind cluster,
// installs the CRDs of Kamaji and the test objects, writes their status, as no
// Kamaji controller runs, connects the cluster again, so that the app reads the
// CRDs anew, and leaves the cluster disconnected; it does not depend on another
// test file having run.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appReady,
  connectApp,
  detailsItemCount,
  detailsValue,
  disconnectKindCluster,
  findMenuItem,
  findRow,
  hostDetailsValue,
  installExtension,
  keepSavedFiles,
  openDetails,
  openKindCluster,
  openPage,
  openRowMenu,
  rowCells,
  savedFiles,
  selectTenantNamespaces,
  setUpCluster,
  tearDownCluster,
} from "./extension-helpers";

import type { Frame } from "playwright";

import type { AppSession } from "./extension-helpers";

const viewTimeout = { timeout: 60 * 1000 };

describe.skipIf(!(await appReady({ cluster: true })))("Tenant Control Planes", () => {
  let session: AppSession | undefined;
  let frame: Frame;

  beforeAll(
    async () => {
      session = await connectApp();
      await disconnectKindCluster(session);
      setUpCluster();
      await installExtension(session);
      frame = await openKindCluster(session);
      await selectTenantNamespaces(frame);
    },
    10 * 60 * 1000,
  );

  afterAll(
    async () => {
      let errors: string[] = [];

      try {
        // The errors first: the app refreshes the cluster while it disconnects,
        // and logs errors of its own when the refresh loses the race.
        errors = (await session?.stopCollecting()) ?? [];

        // The cluster then: the app watches the CRDs, and would log errors for
        // CRDs deleted under it.
        if (session) {
          await disconnectKindCluster(session);
        }

        await session?.close();
      } finally {
        tearDownCluster();
      }

      expect(errors).toEqual([]);
    },
    10 * 60 * 1000,
  );

  it("lists the test tenants of the selected namespaces with their status", async () => {
    await openPage(frame, "tenants");

    const shop = await rowCells(await findRow(frame, "shop"));
    const billing = await rowCells(await findRow(frame, "billing"));
    const legacy = await rowCells(await findRow(frame, "legacy"));

    expect(shop).toEqual(
      expect.arrayContaining(["kamaji-tenants", "Ready", "2/2", "172.18.255.200:6443", "v1.36.3", "etcd-test etcd"]),
    );
    expect(billing).toEqual(
      expect.arrayContaining(["Provisioning", "0/1", "-", "v1.37.0", "postgres-test PostgreSQL"]),
    );
    expect(legacy).toEqual(expect.arrayContaining(["kamaji-dev", "NotReady", "v1.34.6", "mysql-test MySQL"]));
  });

  it("shows the details of a dual-stack tenant and of one with the deprecated CIDRs", async () => {
    await openPage(frame, "tenants");

    const billing = await openDetails(frame, await findRow(frame, "billing"), "billing");

    // The session's user lists the CRDs, so the host shows the printer columns above the panel, which leaves them out.
    expect(await hostDetailsValue(frame, billing, "Status")).toBe("Provisioning");
    for (const name of ["Status", "Kubernetes Version", "Data Store Name (Status)"]) {
      expect(await detailsItemCount(frame, billing, name)).toBe(0);
    }
    expect(await detailsValue(frame, billing, "Pod CIDRs")).toBe("10.245.0.0/16, fd00:10:245::/56");
    expect(await detailsValue(frame, billing, "IP Families")).toBe("IPv4, IPv6");

    await openPage(frame, "tenants");

    const legacy = await openDetails(frame, await findRow(frame, "legacy"), "legacy");

    expect(await detailsValue(frame, legacy, "Pod CIDRs")).toBe("10.246.0.0/16");
  });

  it("creates a tenant with the dialog", async () => {
    await openPage(frame, "tenants");
    await frame.locator(".AddRemoveButtons .add-button").click();

    const dialog = frame.locator(".Dialog");

    await dialog.getByText("Create Tenant Control Plane", { exact: true }).waitFor(viewTimeout);
    await dialog.locator("input").first().fill("payments");

    // The namespace, from the options of the select: Enter in a field of the
    // wizard would submit it.
    await dialog.locator("#tenant-namespace-input").fill("kamaji-dev");
    await frame.locator(".Select__option").getByText("kamaji-dev", { exact: true }).click();
    await dialog.getByRole("button", { name: "Create" }).click();
    await dialog.waitFor({ state: "detached", ...viewTimeout });

    // No Kamaji controller runs: the tenant is listed with no status.
    expect(await rowCells(await findRow(frame, "payments"))).toEqual(expect.arrayContaining(["kamaji-dev", "Unknown"]));
  });

  it("downloads the admin kubeconfig of a tenant from its menu", async () => {
    await openPage(frame, "tenants");
    await keepSavedFiles(frame);

    const menu = await openRowMenu(frame, await findRow(frame, "shop"));

    await (await findMenuItem(frame, menu, "Download kubeconfig")).click();

    await expect.poll(() => savedFiles(frame), viewTimeout).toHaveLength(1);

    const [file] = await savedFiles(frame);

    expect(file?.name).toBe("kamaji-shop-kubeconfig.yaml");
    expect(file?.text).toContain("server: https://172.18.255.200:6443");
  });
});
