import { describe, expect, it } from "vitest";
import {
  buildDataStoreResource,
  type DataStoreForm,
  driverFields,
  switchDriverFields,
  validateDataStoreForm,
} from "./datastore-resource";

import type { Driver } from "../k8s/datastore-v1alpha1";

// The proposal of the dialog for a driver, with a name.
const formOf = (driver: Driver, name = `${driver.toLowerCase()}-main`): DataStoreForm => ({
  name,
  driver,
  secretsNamespace: "kamaji-system",
  ...driverFields(driver),
});

const etcd = formOf("etcd");

const secret = (name: string, keyPath: string) => ({ secretReference: { name, namespace: "kamaji-system", keyPath } });

describe("buildDataStoreResource", () => {
  it("proposes the etcd that the chart of Kamaji deploys, with the TLS Secrets of cert-manager", () => {
    expect(buildDataStoreResource(etcd)).toEqual({
      apiVersion: "kamaji.clastix.io/v1alpha1",
      kind: "DataStore",
      metadata: { name: "etcd-main" },
      spec: {
        driver: "etcd",
        endpoints: [0, 1, 2].map((index) => `kamaji-etcd-${index}.kamaji-etcd.kamaji-system.svc.cluster.local:2379`),
        tlsConfig: {
          certificateAuthority: {
            certificate: secret("kamaji-etcd-ca", "tls.crt"),
            privateKey: secret("kamaji-etcd-ca", "tls.key"),
          },
          clientCertificate: {
            certificate: secret("kamaji-etcd-client-certs", "tls.crt"),
            privateKey: secret("kamaji-etcd-client-certs", "tls.key"),
          },
        },
      },
    });
  });

  it("builds an etcd DataStore with the keys the user gives, as the sample of Kamaji has them", () => {
    const resource = buildDataStoreResource({
      ...etcd,
      caSecretName: "etcd-certs",
      caCertificateKey: "ca.crt",
      caPrivateKeyKey: "ca.key",
      clientSecretName: "root-client-certs",
    });

    expect(resource.spec.tlsConfig?.certificateAuthority).toEqual({
      certificate: secret("etcd-certs", "ca.crt"),
      privateKey: secret("etcd-certs", "ca.key"),
    });
  });

  it("builds a MySQL DataStore with basic auth", () => {
    const resource = buildDataStoreResource({
      ...formOf("MySQL"),
      authSecretName: "mysql-config",
      usernameKey: "MYSQL_USER",
      passwordKey: "MYSQL_ROOT_PASSWORD",
    });

    expect(resource.spec).toEqual({
      driver: "MySQL",
      endpoints: ["mysql.kamaji-system.svc.cluster.local:3306"],
      basicAuth: {
        username: secret("mysql-config", "MYSQL_USER"),
        password: secret("mysql-config", "MYSQL_ROOT_PASSWORD"),
      },
    });
  });

  it("builds a PostgreSQL DataStore with TLS, its certificate authority without the private key and a client certificate", () => {
    const resource = buildDataStoreResource({
      ...formOf("PostgreSQL"),
      useTls: true,
      useBasicAuth: false,
      caSecretName: "postgres-certs",
      clientSecretName: "postgres-certs",
      clientCertificateKey: "server.crt",
      clientPrivateKeyKey: "server.key",
    });

    expect(resource.spec).toEqual({
      driver: "PostgreSQL",
      endpoints: ["postgres.kamaji-system.svc.cluster.local:5432"],
      tlsConfig: {
        certificateAuthority: { certificate: secret("postgres-certs", "ca.crt") },
        clientCertificate: {
          certificate: secret("postgres-certs", "server.crt"),
          privateKey: secret("postgres-certs", "server.key"),
        },
      },
    });
  });

  it("builds a NATS DataStore with basic auth and TLS without a client certificate", () => {
    const resource = buildDataStoreResource({
      ...formOf("NATS"),
      useTls: true,
      caSecretName: "nats-ca",
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
    const resource = buildDataStoreResource({ ...etcd, useTls: false, useBasicAuth: true, authSecretName: "x" });

    expect(resource.spec).toHaveProperty("tlsConfig");
    expect(resource.spec).not.toHaveProperty("basicAuth");
  });
});

describe("switchDriverFields", () => {
  it("moves to the proposal of the next driver the fields that keep the proposal of the previous one", () => {
    expect(switchDriverFields(driverFields("etcd"), "etcd", "MySQL")).toEqual(driverFields("MySQL"));
  });

  it("keeps what the user typed", () => {
    const fields = { ...driverFields("etcd"), endpoints: "etcd.example.com:2379", caSecretName: "my-ca" };
    const switched = switchDriverFields(fields, "etcd", "PostgreSQL");

    expect(switched.endpoints).toBe("etcd.example.com:2379");
    expect(switched.caSecretName).toBe("my-ca");
    expect(switched.caCertificateKey).toBe("ca.crt");
    expect(switched.clientSecretName).toBe("");
  });
});

describe("validateDataStoreForm", () => {
  it("accepts the proposal for etcd", () => {
    expect(validateDataStoreForm(etcd)).toBeUndefined();
  });

  it("says what is wrong with the name and the endpoints", () => {
    expect(validateDataStoreForm({ ...etcd, name: "" })).toBe("Datastore name is required");
    expect(validateDataStoreForm({ ...etcd, endpoints: " , " })).toBe("At least one endpoint is required");
    expect(validateDataStoreForm({ ...etcd, endpoints: "2001:db8::1:2379" })).toBe(
      'The IPv6 endpoint "2001:db8::1:2379" must be bracketed, e.g. [2001:db8::1]:2379',
    );
    expect(validateDataStoreForm({ ...etcd, endpoints: "[2001:db8::1]:2379" })).toBeUndefined();
    expect(validateDataStoreForm({ ...etcd, endpoints: Array(65).fill("etcd:2379").join(",") })).toBe(
      "A DataStore takes at most 64 endpoints",
    );
  });

  it("refuses what the CRD refuses for the authentication of each driver", () => {
    expect(validateDataStoreForm({ ...etcd, clientSecretName: "" })).toBe(
      "An etcd DataStore needs the Secret of its client certificate",
    );
    expect(validateDataStoreForm({ ...etcd, caSecretName: "" })).toBe(
      "The Secret of the certificate authority is required",
    );
    expect(validateDataStoreForm({ ...formOf("MySQL"), useBasicAuth: false })).toBe(
      "A MySQL DataStore needs TLS, basic auth or both",
    );
    expect(validateDataStoreForm(formOf("NATS"))).toBe("The Secret of the username and the password is required");
    expect(
      validateDataStoreForm({ ...formOf("PostgreSQL"), useTls: true, useBasicAuth: false, caSecretName: "pg-ca" }),
    ).toBeUndefined();
  });

  it("refuses a Secret without the key of one of its values", () => {
    expect(validateDataStoreForm({ ...etcd, caPrivateKeyKey: " " })).toBe(
      "Every Secret needs the key of each of its values",
    );
    expect(validateDataStoreForm({ ...formOf("MySQL"), authSecretName: "mysql-config", passwordKey: "" })).toBe(
      "Every Secret needs the key of each of its values",
    );
  });
});
