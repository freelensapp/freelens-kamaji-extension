import { describe, expect, it } from "vitest";
import { buildDataStoreResource, type DataStoreForm, validateDataStoreForm } from "./datastore-resource";

// The defaults of the dialog, with a name.
const defaults: DataStoreForm = {
  name: "etcd-main",
  driver: "etcd",
  endpoints: "etcd-0.etcd.kamaji-system.svc.cluster.local:2379, etcd-1.etcd.kamaji-system.svc.cluster.local:2379",
  secretsNamespace: "kamaji-system",
  caSecretName: "etcd-certs",
  clientSecretName: "root-client-certs",
};

const secret = (name: string, keyPath: string) => ({ secretReference: { name, namespace: "kamaji-system", keyPath } });

describe("buildDataStoreResource", () => {
  it("builds an etcd DataStore with its certificate authority and client certificate", () => {
    expect(buildDataStoreResource(defaults)).toEqual({
      apiVersion: "kamaji.clastix.io/v1alpha1",
      kind: "DataStore",
      metadata: { name: "etcd-main" },
      spec: {
        driver: "etcd",
        endpoints: [
          "etcd-0.etcd.kamaji-system.svc.cluster.local:2379",
          "etcd-1.etcd.kamaji-system.svc.cluster.local:2379",
        ],
        tlsConfig: {
          certificateAuthority: {
            certificate: secret("etcd-certs", "ca.crt"),
            privateKey: secret("etcd-certs", "ca.key"),
          },
          clientCertificate: {
            certificate: secret("root-client-certs", "tls.crt"),
            privateKey: secret("root-client-certs", "tls.key"),
          },
        },
      },
    });
  });
});

describe("validateDataStoreForm", () => {
  it("accepts the defaults", () => {
    expect(validateDataStoreForm(defaults)).toBeUndefined();
  });

  it("says what is wrong with a field", () => {
    expect(validateDataStoreForm({ ...defaults, name: "" })).toBe("Datastore name is required");
    expect(validateDataStoreForm({ ...defaults, endpoints: " , " })).toBe("At least one endpoint is required");
    expect(validateDataStoreForm({ ...defaults, caSecretName: "" })).toBe(
      "Secrets namespace and secret names are required",
    );
  });
});
