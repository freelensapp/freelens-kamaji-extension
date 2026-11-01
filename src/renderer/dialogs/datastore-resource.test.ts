import { describe, expect, it } from "vitest";
import {
  buildDataStoreResource,
  type DataStoreForm,
  defaultEndpoints,
  validateDataStoreForm,
} from "./datastore-resource";

// The defaults of the dialog, with a name.
const defaults: DataStoreForm = {
  name: "etcd-main",
  driver: "etcd",
  endpoints: defaultEndpoints.etcd,
  secretsNamespace: "kamaji-system",
  useTls: false,
  useBasicAuth: true,
  caSecretName: "etcd-certs",
  clientSecretName: "root-client-certs",
  authSecretName: "",
};

const secret = (name: string, keyPath: string) => ({ secretReference: { name, namespace: "kamaji-system", keyPath } });

describe("buildDataStoreResource", () => {
  it("builds an etcd DataStore with TLS: its certificate authority with the private key, and a client certificate", () => {
    expect(buildDataStoreResource(defaults)).toEqual({
      apiVersion: "kamaji.clastix.io/v1alpha1",
      kind: "DataStore",
      metadata: { name: "etcd-main" },
      spec: {
        driver: "etcd",
        endpoints: [0, 1, 2].map((index) => `etcd-${index}.etcd.kamaji-system.svc.cluster.local:2379`),
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

  it("builds a MySQL DataStore with basic auth", () => {
    const resource = buildDataStoreResource({
      ...defaults,
      name: "mysql-main",
      driver: "MySQL",
      endpoints: defaultEndpoints.MySQL,
      authSecretName: "mysql-auth",
    });

    expect(resource.spec).toEqual({
      driver: "MySQL",
      endpoints: ["mysql.kamaji-system.svc.cluster.local:3306"],
      basicAuth: { username: secret("mysql-auth", "username"), password: secret("mysql-auth", "password") },
    });
  });

  it("builds a PostgreSQL DataStore with TLS, its certificate authority without the private key and a client certificate", () => {
    const resource = buildDataStoreResource({
      ...defaults,
      driver: "PostgreSQL",
      endpoints: defaultEndpoints.PostgreSQL,
      useTls: true,
      useBasicAuth: false,
      caSecretName: "postgres-ca",
      clientSecretName: "postgres-client",
    });

    expect(resource.spec).toEqual({
      driver: "PostgreSQL",
      endpoints: ["postgres.kamaji-system.svc.cluster.local:5432"],
      tlsConfig: {
        certificateAuthority: { certificate: secret("postgres-ca", "ca.crt") },
        clientCertificate: {
          certificate: secret("postgres-client", "tls.crt"),
          privateKey: secret("postgres-client", "tls.key"),
        },
      },
    });
  });

  it("builds a NATS DataStore with basic auth and TLS without a client certificate", () => {
    const resource = buildDataStoreResource({
      ...defaults,
      driver: "NATS",
      endpoints: defaultEndpoints.NATS,
      useTls: true,
      caSecretName: "nats-ca",
      clientSecretName: " ",
      authSecretName: "nats-auth",
    });

    expect(resource.spec).toEqual({
      driver: "NATS",
      endpoints: ["nats.kamaji-system.svc.cluster.local:4222"],
      tlsConfig: { certificateAuthority: { certificate: secret("nats-ca", "ca.crt") } },
      basicAuth: { username: secret("nats-auth", "username"), password: secret("nats-auth", "password") },
    });
  });

  it("gives etcd TLS alone, whatever the checkboxes of the other drivers say", () => {
    const resource = buildDataStoreResource({ ...defaults, useTls: false, useBasicAuth: true, authSecretName: "x" });

    expect(resource.spec).toHaveProperty("tlsConfig");
    expect(resource.spec).not.toHaveProperty("basicAuth");
  });
});

describe("validateDataStoreForm", () => {
  it("accepts the defaults", () => {
    expect(validateDataStoreForm(defaults)).toBeUndefined();
  });

  it("says what is wrong with the name and the endpoints", () => {
    expect(validateDataStoreForm({ ...defaults, name: "" })).toBe("Datastore name is required");
    expect(validateDataStoreForm({ ...defaults, endpoints: " , " })).toBe("At least one endpoint is required");
    expect(validateDataStoreForm({ ...defaults, endpoints: "2001:db8::1:2379" })).toBe(
      'The IPv6 endpoint "2001:db8::1:2379" must be bracketed, e.g. [2001:db8::1]:2379',
    );
    expect(validateDataStoreForm({ ...defaults, endpoints: "[2001:db8::1]:2379" })).toBeUndefined();
    expect(validateDataStoreForm({ ...defaults, endpoints: Array(65).fill("etcd:2379").join(",") })).toBe(
      "A DataStore takes at most 64 endpoints",
    );
  });

  it("refuses what the CRD refuses for the authentication of each driver", () => {
    expect(validateDataStoreForm({ ...defaults, clientSecretName: "" })).toBe(
      "An etcd DataStore needs the Secret of its client certificate",
    );
    expect(validateDataStoreForm({ ...defaults, caSecretName: "" })).toBe(
      "The Secret of the certificate authority is required",
    );
    expect(validateDataStoreForm({ ...defaults, driver: "MySQL", useTls: false, useBasicAuth: false })).toBe(
      "A MySQL DataStore needs TLS, basic auth or both",
    );
    expect(validateDataStoreForm({ ...defaults, driver: "NATS", useBasicAuth: true, authSecretName: "" })).toBe(
      "The Secret of the username and the password is required",
    );
    expect(
      validateDataStoreForm({
        ...defaults,
        driver: "PostgreSQL",
        useTls: true,
        useBasicAuth: false,
        clientSecretName: "",
      }),
    ).toBeUndefined();
  });
});
