import type { DataStore, DataStoreSpec, Driver } from "../k8s/datastore-v1alpha1";

/** A DataStore as the dialog posts it. */
export interface DataStoreResource {
  apiVersion: DataStore["apiVersion"];
  kind: DataStore["kind"];
  metadata: { name: string };
  spec: DataStoreSpec;
}

export const drivers: Driver[] = ["etcd", "MySQL", "PostgreSQL", "NATS"];

/** The endpoints that the dialog proposes for each driver: the Services of a datastore in `kamaji-system`. */
export const defaultEndpoints: Record<Driver, string> = {
  etcd: [0, 1, 2].map((index) => `etcd-${index}.etcd.kamaji-system.svc.cluster.local:2379`).join(","),
  MySQL: "mysql.kamaji-system.svc.cluster.local:3306",
  PostgreSQL: "postgres.kamaji-system.svc.cluster.local:5432",
  NATS: "nats.kamaji-system.svc.cluster.local:4222",
};

/** The keys of the Secrets that the dialog reads each value from. */
export const secretKeys = {
  caCertificate: "ca.crt",
  caPrivateKey: "ca.key",
  clientCertificate: "tls.crt",
  clientPrivateKey: "tls.key",
  username: "username",
  password: "password",
};

/** The fields of the dialog, as the user typed them. */
export interface DataStoreForm {
  name: string;
  driver: Driver;
  /** Comma separated. */
  endpoints: string;
  /** The namespace of every Secret of the DataStore. */
  secretsNamespace: string;
  /** For a driver other than etcd, which always uses TLS. */
  useTls: boolean;
  /** For a driver other than etcd. */
  useBasicAuth: boolean;
  /** The Secret of the certificate authority: its certificate, and for etcd its private key too. */
  caSecretName: string;
  /** The Secret of the client certificate and its private key: required for etcd, optional for the others. */
  clientSecretName: string;
  /** The Secret of the username and the password. */
  authSecretName: string;
}

const parseCsvList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Whether the DataStore authenticates with TLS: etcd always does. */
const usesTls = (form: DataStoreForm) => form.driver === "etcd" || form.useTls;

/** Whether the DataStore authenticates with a username and a password: etcd never does. */
const usesBasicAuth = (form: DataStoreForm) => form.driver !== "etcd" && form.useBasicAuth;

/**
 * What is wrong with the fields of the form before a resource is built from them, if anything. The checks are the
 * validation rules of the CRD of Kamaji.
 */
export function validateDataStoreForm(form: DataStoreForm): string | undefined {
  if (!form.name.trim()) {
    return "Datastore name is required";
  }

  const endpoints = parseCsvList(form.endpoints);

  if (!endpoints.length) {
    return "At least one endpoint is required";
  }

  if (endpoints.length > 64) {
    return "A DataStore takes at most 64 endpoints";
  }

  const long = endpoints.find((endpoint) => endpoint.length > 256);

  if (long) {
    return `The endpoint "${long.slice(0, 32)}..." is longer than 256 characters`;
  }

  // An IPv6 address has more than one colon, so it needs its brackets to tell it from the port.
  const unbracketed = endpoints.find((endpoint) => !endpoint.startsWith("[") && endpoint.split(":").length > 2);

  if (unbracketed) {
    return `The IPv6 endpoint "${unbracketed}" must be bracketed, e.g. [2001:db8::1]:2379`;
  }

  if (form.driver !== "etcd" && !form.useTls && !form.useBasicAuth) {
    return `A ${form.driver} DataStore needs TLS, basic auth or both`;
  }

  if ((usesTls(form) || usesBasicAuth(form)) && !form.secretsNamespace.trim()) {
    return "The namespace of the Secrets is required";
  }

  if (usesTls(form) && !form.caSecretName.trim()) {
    return "The Secret of the certificate authority is required";
  }

  if (form.driver === "etcd" && !form.clientSecretName.trim()) {
    return "An etcd DataStore needs the Secret of its client certificate";
  }

  if (usesBasicAuth(form) && !form.authSecretName.trim()) {
    return "The Secret of the username and the password is required";
  }

  return undefined;
}

/** The DataStore that the fields of the form describe. */
export function buildDataStoreResource(form: DataStoreForm): DataStoreResource {
  const secret = (name: string, keyPath: string) => ({
    secretReference: { name: name.trim(), namespace: form.secretsNamespace.trim(), keyPath },
  });
  const clientSecretName = form.clientSecretName.trim();

  return {
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "DataStore",
    metadata: { name: form.name.trim() },
    spec: {
      driver: form.driver,
      endpoints: parseCsvList(form.endpoints),
      ...(usesTls(form)
        ? {
            tlsConfig: {
              certificateAuthority: {
                certificate: secret(form.caSecretName, secretKeys.caCertificate),
                // Kamaji signs the client certificates of the tenants with the certificate authority of etcd.
                ...(form.driver === "etcd" ? { privateKey: secret(form.caSecretName, secretKeys.caPrivateKey) } : {}),
              },
              ...(clientSecretName
                ? {
                    clientCertificate: {
                      certificate: secret(clientSecretName, secretKeys.clientCertificate),
                      privateKey: secret(clientSecretName, secretKeys.clientPrivateKey),
                    },
                  }
                : {}),
            },
          }
        : {}),
      ...(usesBasicAuth(form)
        ? {
            basicAuth: {
              username: secret(form.authSecretName, secretKeys.username),
              password: secret(form.authSecretName, secretKeys.password),
            },
          }
        : {}),
    },
  };
}
