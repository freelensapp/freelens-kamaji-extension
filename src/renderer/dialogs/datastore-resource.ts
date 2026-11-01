import type { DataStore, DataStoreSpec, Driver } from "../k8s/datastore-v1alpha1";

/** A DataStore as the dialog posts it. */
export interface DataStoreResource {
  apiVersion: DataStore["apiVersion"];
  kind: DataStore["kind"];
  metadata: { name: string };
  spec: DataStoreSpec;
}

export const drivers: Driver[] = ["etcd", "MySQL", "PostgreSQL", "NATS"];

/** The fields of the dialog, as the user typed them. */
export interface DataStoreForm {
  name: string;
  driver: Driver;
  /** Comma separated. */
  endpoints: string;
  secretsNamespace: string;
  caSecretName: string;
  clientSecretName: string;
}

const parseCsvList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** What is wrong with the fields of the form before a resource is built from them, if anything. */
export function validateDataStoreForm(form: DataStoreForm): string | undefined {
  if (!form.name.trim()) {
    return "Datastore name is required";
  }

  if (!parseCsvList(form.endpoints).length) {
    return "At least one endpoint is required";
  }

  if (!form.secretsNamespace.trim() || !form.caSecretName.trim() || !form.clientSecretName.trim()) {
    return "Secrets namespace and secret names are required";
  }

  return undefined;
}

/** The DataStore that the fields of the form describe. */
export function buildDataStoreResource(form: DataStoreForm): DataStoreResource {
  const secret = (name: string, keyPath: string) => ({
    secretReference: { name: name.trim(), namespace: form.secretsNamespace.trim(), keyPath },
  });

  return {
    apiVersion: "kamaji.clastix.io/v1alpha1",
    kind: "DataStore",
    metadata: { name: form.name.trim() },
    spec: {
      driver: form.driver,
      endpoints: parseCsvList(form.endpoints),
      tlsConfig: {
        certificateAuthority: {
          certificate: secret(form.caSecretName, "ca.crt"),
          privateKey: secret(form.caSecretName, "ca.key"),
        },
        clientCertificate: {
          certificate: secret(form.clientSecretName, "tls.crt"),
          privateKey: secret(form.clientSecretName, "tls.key"),
        },
      },
    },
  };
}
