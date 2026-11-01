import { describe, expect, it } from "vitest";
import { DataStore } from "./datastore-v1alpha1";

import type { DataStoreSpec, DataStoreStatus } from "./datastore-v1alpha1";

// The host hands the extension its own KubeObject, so the model has static helpers that take the object. The stub of
// @freelensapp/extensions (test/freelens-extensions.ts) builds a DataStore from plain resource data.
const buildDataStore = (spec: Partial<DataStoreSpec> = {}, status?: DataStoreStatus) =>
  new DataStore({
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "DataStore",
    metadata: { name: "etcd-test", selfLink: "/apis/kamaji.clastix.io/v1alpha1/datastores/etcd-test" },
    spec: { driver: "etcd", endpoints: ["etcd-0.etcd.kamaji-system.svc.cluster.local:2379"], ...spec },
    status,
  });

const secret = (keyPath: string) => ({
  secretReference: { name: "etcd-test-certs", namespace: "kamaji-system", keyPath },
});

describe("DataStore", () => {
  describe("getUsedBy", () => {
    it("returns the tenants that Kamaji reports", () => {
      const dataStore = buildDataStore({}, { ready: true, usedBy: ["kamaji-tenants/shop", "kamaji-dev/legacy"] });

      expect(DataStore.getUsedBy(dataStore)).toEqual(["kamaji-tenants/shop", "kamaji-dev/legacy"]);
    });

    it("returns none before Kamaji reports", () => {
      expect(DataStore.getUsedBy(buildDataStore())).toEqual([]);
    });
  });

  describe("isReady", () => {
    it("returns what Kamaji reports, or undefined before it reports", () => {
      expect(DataStore.isReady(buildDataStore({}, { ready: true }))).toBe(true);
      expect(DataStore.isReady(buildDataStore({}, { ready: false }))).toBe(false);
      expect(DataStore.isReady(buildDataStore())).toBeUndefined();
    });
  });

  describe("getAuthentication", () => {
    it("names TLS, basic auth, or both", () => {
      const tlsConfig = { certificateAuthority: { certificate: secret("ca.crt") } };
      const basicAuth = { username: { content: "a2FtYWpp" }, password: { content: "c2VjcmV0" } };

      expect(DataStore.getAuthentication(buildDataStore({ tlsConfig }))).toBe("TLS");
      expect(DataStore.getAuthentication(buildDataStore({ driver: "MySQL", basicAuth }))).toBe("Basic auth");
      expect(DataStore.getAuthentication(buildDataStore({ driver: "PostgreSQL", tlsConfig, basicAuth }))).toBe(
        "TLS and basic auth",
      );
      expect(DataStore.getAuthentication(buildDataStore())).toBeUndefined();
    });
  });

  describe("getConditions", () => {
    it("returns the conditions that Kamaji reports", () => {
      const conditions = [
        {
          type: "kamaji.clastix.io/DataStoreValidation",
          status: "True" as const,
          lastTransitionTime: "2026-11-01T16:00:00Z",
          reason: "DataStoreValidated",
          message: "",
        },
      ];

      expect(DataStore.getConditions(buildDataStore({}, { ready: true, conditions }))).toEqual(conditions);
      expect(DataStore.getConditions(buildDataStore())).toEqual([]);
    });
  });
});
