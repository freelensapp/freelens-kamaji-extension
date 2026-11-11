/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The session of the DataStores, on the setup of the session of the Tenant
// Control Planes: the CRDs of Kamaji, the test objects and their status, with
// no Kamaji controller. It does not depend on another test file having run.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appReady,
  connectApp,
  detailsItemCount,
  detailsValue,
  disconnectKindCluster,
  findRow,
  hostDetailsValue,
  installExtension,
  openDetails,
  openKindCluster,
  openPage,
  rowCells,
  setUpCluster,
  tearDownCluster,
} from "./extension-helpers";

import type { Frame, Locator } from "playwright";

import type { AppSession } from "./extension-helpers";

const viewTimeout = { timeout: 60 * 1000 };

describe.skipIf(!(await appReady({ cluster: true })))("DataStores", () => {
  let session: AppSession | undefined;
  let frame: Frame;

  beforeAll(
    async () => {
      session = await connectApp();
      await disconnectKindCluster(session);
      setUpCluster();
      await installExtension(session);
      frame = await openKindCluster(session);
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

  it("lists the test DataStores with their driver, whether they are ready and their tenants", async () => {
    await openPage(frame, "datastores");

    expect(await rowCells(await findRow(frame, "etcd-test"))).toEqual(expect.arrayContaining(["etcd", "Yes", "1"]));
    expect(await rowCells(await findRow(frame, "postgres-test"))).toEqual(
      expect.arrayContaining(["PostgreSQL", "Yes", "1"]),
    );
    expect(await rowCells(await findRow(frame, "mysql-test"))).toEqual(expect.arrayContaining(["MySQL", "Yes", "1"]));
    expect(await rowCells(await findRow(frame, "nats-test"))).toEqual(expect.arrayContaining(["NATS", "No", "0"]));
  });

  it("shows the details of a DataStore with its tenants and where its values come from", async () => {
    await openPage(frame, "datastores");

    const etcd = await openDetails(frame, await findRow(frame, "etcd-test"), "etcd-test");

    expect(await detailsValue(frame, etcd, "Authentication")).toBe("TLS");
    expect(await detailsValue(frame, etcd, "CA Private Key")).toBe("kamaji-system/etcd-test-certs, key ca.key");
    expect(await detailsValue(frame, etcd, "Used By")).toBe("kamaji-tenants/shop");
    // The session's user lists the CRDs, so the host shows Driver and Ready above the panel, which leaves them out.
    expect(await hostDetailsValue(frame, etcd, "Driver")).toBe("etcd");
    for (const name of ["Driver", "Ready", "Conditions"]) {
      expect(await detailsItemCount(frame, etcd, name)).toBe(0);
    }

    await openPage(frame, "datastores");

    const mysql = await openDetails(frame, await findRow(frame, "mysql-test"), "mysql-test");

    expect(await detailsValue(frame, mysql, "Authentication")).toBe("Basic auth");
    expect(await detailsValue(frame, mysql, "Username")).toBe("inline");
  });

  it("creates a DataStore of each driver with the dialog", async () => {
    const create = async (name: string, driver: string, fill: (dialog: Locator) => Promise<void>) => {
      await openPage(frame, "datastores");
      await frame.locator(".AddRemoveButtons .add-button").click();

      const dialog = frame.locator(".Dialog");

      await dialog.getByText("Create Datastore", { exact: true }).waitFor(viewTimeout);
      await dialog.getByPlaceholder("e.g., datastore-1").fill(name);

      // The driver, from the options of the select: Enter in a field of the
      // wizard would submit it.
      if (driver !== "etcd") {
        await dialog.locator("#datastore-driver-input").fill(driver);
        await frame.locator(".Select__option").getByText(driver, { exact: true }).click();
      }

      await fill(dialog);
      await dialog.getByRole("button", { name: "Create" }).click();
      await dialog.waitFor({ state: "detached", ...viewTimeout });

      // No Kamaji controller runs: the DataStore is listed as not validated yet.
      expect(await rowCells(await findRow(frame, name))).toEqual(expect.arrayContaining([driver, "-", "0"]));
    };

    await create("etcd-new", "etcd", async () => {});
    await create("mysql-new", "MySQL", async (dialog) => {
      await dialog.getByPlaceholder("e.g., mysql-auth").fill("mysql-auth");
    });
    await create("postgres-new", "PostgreSQL", async (dialog) => {
      await dialog.locator(".Checkbox").filter({ hasText: "Basic auth" }).click();
      await dialog.locator(".Checkbox").filter({ hasText: "TLS" }).click();
      await dialog.getByPlaceholder("e.g., kamaji-etcd-ca").fill("postgres-ca");
    });
    await create("nats-new", "NATS", async (dialog) => {
      await dialog.getByPlaceholder("e.g., nats-auth").fill("nats-auth");
    });
  });
});
