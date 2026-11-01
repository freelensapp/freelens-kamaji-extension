// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DataStore } from "../k8s/datastore-v1alpha1";
import { DataStoreDetails, describeContent } from "./datastore-details";

import type { DataStoreSpec, DataStoreStatus } from "../k8s/datastore-v1alpha1";

const buildDataStore = (spec: DataStoreSpec, status?: DataStoreStatus) =>
  new DataStore({
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "DataStore",
    metadata: { name: "ds", selfLink: "/apis/kamaji.clastix.io/v1alpha1/datastores/ds" },
    spec,
    status,
  });

const secret = (name: string, keyPath: string) => ({ secretReference: { name, namespace: "kamaji-system", keyPath } });

// The value of the row that the stub's DrawerItem renders with this name.
const rowValue = (name: string) => screen.getByText(name).parentElement?.textContent?.slice(name.length);

afterEach(() => {
  cleanup();
});

describe("describeContent", () => {
  it("says where a value comes from", () => {
    expect(describeContent(secret("etcd-certs", "ca.crt"))).toBe("kamaji-system/etcd-certs, key ca.crt");
    expect(describeContent({ content: "cm9vdA==" })).toBe("inline");
    expect(describeContent({ content: "cm9vdA==", ...secret("auth", "username") })).toBe("inline");
    expect(describeContent(undefined)).toBeUndefined();
  });
});

describe("DataStoreDetails", () => {
  it("shows an etcd DataStore with its certificates and its tenants", () => {
    const dataStore = buildDataStore(
      {
        driver: "etcd",
        endpoints: ["etcd-0:2379", "etcd-1:2379"],
        tlsConfig: {
          certificateAuthority: {
            certificate: secret("etcd-certs", "ca.crt"),
            privateKey: secret("etcd-certs", "ca.key"),
          },
          clientCertificate: { certificate: secret("client", "tls.crt"), privateKey: secret("client", "tls.key") },
        },
      },
      { ready: true, usedBy: ["kamaji-tenants/shop", "kamaji-dev/legacy"] },
    );

    render(<DataStoreDetails object={dataStore} />);

    expect(rowValue("Driver")).toBe("etcd");
    expect(rowValue("Endpoints")).toBe("etcd-0:2379, etcd-1:2379");
    expect(rowValue("Ready")).toBe("Yes");
    expect(rowValue("Authentication")).toBe("TLS");
    expect(rowValue("CA Certificate")).toBe("kamaji-system/etcd-certs, key ca.crt");
    expect(rowValue("CA Private Key")).toBe("kamaji-system/etcd-certs, key ca.key");
    expect(rowValue("Client Certificate")).toBe("kamaji-system/client, key tls.crt");
    expect(rowValue("Client Private Key")).toBe("kamaji-system/client, key tls.key");
    expect(rowValue("Used By")).toBe("kamaji-tenants/shop, kamaji-dev/legacy");
    expect(screen.queryByText("Username")).toBeNull();
  });

  it("shows a MySQL DataStore with basic auth that Kamaji has not validated yet", () => {
    const dataStore = buildDataStore({
      driver: "MySQL",
      endpoints: ["mysql:3306"],
      basicAuth: { username: { content: "cm9vdA==" }, password: secret("mysql-auth", "password") },
    });

    render(<DataStoreDetails object={dataStore} />);

    expect(rowValue("Authentication")).toBe("Basic auth");
    expect(rowValue("Username")).toBe("inline");
    expect(rowValue("Password")).toBe("kamaji-system/mysql-auth, key password");
    expect(rowValue("Used By")).toBe("-");
    expect(screen.queryByText("Ready")).toBeNull();
    expect(screen.queryByText("CA Certificate")).toBeNull();
  });
});
