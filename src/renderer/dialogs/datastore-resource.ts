import type { DataStore, DataStoreSpec, Driver } from "../k8s/datastore-v1alpha1";

/** A DataStore as the dialog posts it. */
export interface DataStoreResource {
  apiVersion: DataStore["apiVersion"];
  kind: DataStore["kind"];
  metadata: { name: string };
  spec: DataStoreSpec;
}

export const drivers: Driver[] = ["etcd", "MySQL", "PostgreSQL", "NATS"];

/** The endpoints that the dialog proposes for each driver: for etcd, those of the etcd that the chart of Kamaji
 * deploys; for the others, the Service of a datastore in `kamaji-system`. */
export const defaultEndpoints: Record<Driver, string> = {
  etcd: [0, 1, 2].map((index) => `kamaji-etcd-${index}.kamaji-etcd.kamaji-system.svc.cluster.local:2379`).join(","),
  MySQL: "mysql.kamaji-system.svc.cluster.local:3306",
  PostgreSQL: "postgres.kamaji-system.svc.cluster.local:5432",
  NATS: "nats.kamaji-system.svc.cluster.local:4222",
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
  caCertificateKey: string;
  caPrivateKeyKey: string;
  /** The Secret of the client certificate and its private key: required for etcd, optional for the others. */
  clientSecretName: string;
  clientCertificateKey: string;
  clientPrivateKeyKey: string;
  /** The Secret of the username and the password. */
  authSecretName: string;
  usernameKey: string;
  passwordKey: string;
}

/** The fields of the form that depend on the driver. */
export type DriverFields = Omit<DataStoreForm, "name" | "driver" | "secretsNamespace">;

/**
 * The fields that the dialog proposes for each driver. For etcd they are the ones of the etcd that the chart of Kamaji
 * deploys, whose certificates cert-manager writes as TLS Secrets, with the certificate in `tls.crt` and the private key
 * in `tls.key`, the certificate authority's too; Kamaji's own DataStore `default` reads them so.
 */
export function driverFields(driver: Driver): DriverFields {
  const etcd = driver === "etcd";

  return {
    endpoints: defaultEndpoints[driver],
    useTls: false,
    useBasicAuth: true,
    caSecretName: etcd ? "kamaji-etcd-ca" : "",
    caCertificateKey: etcd ? "tls.crt" : "ca.crt",
    caPrivateKeyKey: "tls.key",
    clientSecretName: etcd ? "kamaji-etcd-client-certs" : "",
    clientCertificateKey: "tls.crt",
    clientPrivateKeyKey: "tls.key",
    authSecretName: "",
    usernameKey: "username",
    passwordKey: "password",
  };
}

/**
 * The fields of the next driver: its proposal for each field that still has the proposal of the previous driver, and
 * what the user typed for the others.
 */
export function switchDriverFields(fields: DriverFields, previous: Driver, next: Driver): DriverFields {
  const before = driverFields(previous);
  const after = driverFields(next);
  const result: DriverFields = { ...fields };

  for (const key of Object.keys(after) as (keyof DriverFields)[]) {
    if (fields[key] === before[key]) {
      Object.assign(result, { [key]: after[key] });
    }
  }

  return result;
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

  const keys = [
    [usesTls(form), form.caCertificateKey],
    [form.driver === "etcd", form.caPrivateKeyKey],
    [usesTls(form) && form.clientSecretName.trim(), form.clientCertificateKey],
    [usesTls(form) && form.clientSecretName.trim(), form.clientPrivateKeyKey],
    [usesBasicAuth(form), form.usernameKey],
    [usesBasicAuth(form), form.passwordKey],
  ] as const;

  if (keys.some(([used, key]) => used && !key.trim())) {
    return "Every Secret needs the key of each of its values";
  }

  return undefined;
}

/** The DataStore that the fields of the form describe. */
export function buildDataStoreResource(form: DataStoreForm): DataStoreResource {
  const secret = (name: string, keyPath: string) => ({
    secretReference: { name: name.trim(), namespace: form.secretsNamespace.trim(), keyPath: keyPath.trim() },
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
                certificate: secret(form.caSecretName, form.caCertificateKey),
                // Kamaji signs the client certificates of the tenants with the certificate authority of etcd.
                ...(form.driver === "etcd" ? { privateKey: secret(form.caSecretName, form.caPrivateKeyKey) } : {}),
              },
              ...(clientSecretName
                ? {
                    clientCertificate: {
                      certificate: secret(clientSecretName, form.clientCertificateKey),
                      privateKey: secret(clientSecretName, form.clientPrivateKeyKey),
                    },
                  }
                : {}),
            },
          }
        : {}),
      ...(usesBasicAuth(form)
        ? {
            basicAuth: {
              username: secret(form.authSecretName, form.usernameKey),
              password: secret(form.authSecretName, form.passwordKey),
            },
          }
        : {}),
    },
  };
}
