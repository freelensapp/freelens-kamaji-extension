// @vitest-environment jsdom

import { Common, type Renderer } from "@freelensapp/extensions";
import { act, cleanup, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withPageErrorBoundary } from "../../components/error-boundary";
import { DataStore } from "../../k8s/datastore-v1alpha1";
import { DatastoresPage } from "./datastores-page";

import type { DataStoreApi, DataStoreSpec, DataStoreStatus } from "../../k8s/datastore-v1alpha1";

// A minimal stub extension: only `name` is read by the error boundary.
const extension = { name: "kamaji-extension" } as Renderer.LensExtension;

type DataStoreStore = Renderer.K8sApi.KubeObjectStore<DataStore, DataStoreApi>;

const buildDataStore = (name: string, spec: Pick<DataStoreSpec, "driver">, status?: DataStoreStatus) =>
  new DataStore({
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "DataStore",
    metadata: {
      name,
      uid: name,
      resourceVersion: "1",
      selfLink: `/apis/kamaji.clastix.io/v1alpha1/datastores/${name}`,
    },
    spec: { endpoints: [`${name}.kamaji-system.svc.cluster.local:2379`], ...spec },
    status,
  });

// The stub's `getStore()` throws, as the host's does for a kind that the cluster does not serve. A test serves the
// kind by spying on `getStore`; the stub's list layout renders the cells of every item of the store.
const serve = (...dataStores: DataStore[]) =>
  vi.spyOn(DataStore, "getStore").mockReturnValue({ items: dataStores } as unknown as DataStoreStore);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("DatastoresPage", () => {
  it("lists the DataStores with their driver, whether they are ready and their tenants", () => {
    serve(
      buildDataStore("etcd-test", { driver: "etcd" }, { ready: true, usedBy: ["kamaji-tenants/shop", "kamaji-dev/a"] }),
      buildDataStore("nats-test", { driver: "NATS" }, { ready: false, usedBy: [] }),
    );

    render(<DatastoresPage />);

    for (const text of [
      "etcd-test",
      "etcd",
      "etcd-test.kamaji-system.svc.cluster.local:2379",
      "Yes",
      "2",
      "nats-test",
      "NATS",
      "No",
      "0",
    ]) {
      expect(screen.getByText(text)).toBeDefined();
    }
  });

  it("shows - for a DataStore that Kamaji has not validated yet", () => {
    serve(buildDataStore("mysql-test", { driver: "MySQL" }));

    render(<DatastoresPage />);

    expect(screen.getByText("-")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined();
  });

  it("says that Kamaji was not detected while the cluster serves no DataStore", () => {
    render(<DatastoresPage />);

    expect(screen.getByText("Kamaji was not detected on this cluster")).toBeDefined();
  });

  it("renders the list once the host serves the kind after the first render", () => {
    // The host's `getStore()` reads its observable API registry. The spy reads an observable in its place, so that
    // serving the kind is a change the page sees.
    const served = observable.box(false);
    const dataStore = buildDataStore("etcd-test", { driver: "etcd" });
    vi.spyOn(DataStore, "getStore").mockImplementation(() => {
      if (!served.get()) {
        throw new Error("API for DataStore is not registered. Extension won't work correctly.");
      }
      return { items: [dataStore] } as unknown as DataStoreStore;
    });

    render(<DatastoresPage />);

    expect(screen.getByText("Kamaji was not detected on this cluster")).toBeDefined();

    act(() => runInAction(() => served.set(true)));

    expect(screen.getByText("etcd-test")).toBeDefined();
  });

  // A `try`/`catch` around the call of the page does not see this error: the host calls `renderTableContents` from the
  // render of its own list layout, a child of the page.
  it("keeps an error that a callback throws from the render of the host's list layout inside the page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    serve(buildDataStore("etcd-test", { driver: "etcd" }));
    vi.spyOn(DataStore, "getUsedBy").mockImplementation(() => {
      throw new Error("no status field");
    });
    const { Page } = withPageErrorBoundary(extension, {
      id: "kamaji-datastores-page",
      components: { Page: () => <DatastoresPage /> },
    }).components;

    render(<Page params={{}} />);

    expect(screen.getByText("Error: no status field")).toBeDefined();
    expect(Common.logger.error).toHaveBeenCalledWith("[kamaji-extension]: Error: no status field", expect.any(String));
  });
});
