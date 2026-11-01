/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { useState } from "react";
import styles from "./create-datastore-dialog.module.css";
import {
  buildDataStoreResource,
  type DataStoreForm,
  type DriverFields,
  driverFields,
  drivers,
  switchDriverFields,
  validateDataStoreForm,
} from "./datastore-resource";

import type { DataStore, DataStoreApi, Driver } from "../k8s/datastore-v1alpha1";

const {
  Component: { Checkbox, Dialog, Input, Icon, Select, SubTitle, Wizard, WizardStep },
} = Renderer;

const generateDefaultDatastoreName = () => `datastore-${Math.floor(Math.random() * 9999) + 1}`;

export interface CreateDatastoreDialogProps {
  store: Renderer.K8sApi.KubeObjectStore<DataStore, DataStoreApi>;
  onClose?: () => void;
}

export const CreateDatastoreDialog = ({ store, onClose }: CreateDatastoreDialogProps) => {
  const [name, setName] = useState(generateDefaultDatastoreName);
  const [driver, setDriver] = useState<Driver>("etcd");
  const [secretsNamespace, setSecretsNamespace] = useState("kamaji-system");
  const [fields, setFields] = useState<DriverFields>(() => driverFields("etcd"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form: DataStoreForm = { name, driver, secretsNamespace, ...fields };
  const withTls = driver === "etcd" || fields.useTls;
  const withBasicAuth = driver !== "etcd" && fields.useBasicAuth;
  const setField = <K extends keyof DriverFields>(key: K, value: DriverFields[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  const changeDriver = (next: Driver) => {
    setFields((current) => switchDriverFields(current, driver, next));
    setDriver(next);
  };

  const handleCreate = async () => {
    const invalid = validateDataStoreForm(form);

    if (invalid) {
      setError(invalid);
      return;
    }

    const resource = buildDataStoreResource(form);

    setLoading(true);
    setError(null);

    try {
      await store.create({ name: resource.metadata.name }, resource);
      onClose?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to create datastore: ${errorMsg}`);
      console.error("Create datastore error:", err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setLoading(false);
  };

  const textField = (
    title: string,
    key: Exclude<keyof DriverFields, "useTls" | "useBasicAuth">,
    placeholder: string,
  ) => (
    <div className={styles.field}>
      <SubTitle title={title} />
      <Input
        value={fields[key]}
        onChange={(value) => setField(key, value)}
        placeholder={placeholder}
        disabled={loading}
      />
    </div>
  );

  return (
    <Dialog isOpen={true} className={styles.createDatastoreDialog} onOpen={reset} close={onClose}>
      <Wizard header={<h5>Create Datastore</h5>} done={onClose}>
        <WizardStep
          contentClass={styles.formContent}
          nextLabel="Create"
          next={handleCreate}
          loading={loading}
          disabledNext={loading || !name.trim()}
        >
          {error && (
            <div className={styles.error}>
              <Icon material="error" />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <SubTitle title="Name" />
            <Input
              autoFocus
              value={name}
              onChange={(value) => setName(value)}
              placeholder="e.g., datastore-1"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <SubTitle title="Driver" />
            <Select
              id="datastore-driver-input"
              themeName="light"
              value={driver}
              options={drivers.map((value) => ({ value, label: value }))}
              onChange={(option) => option && changeDriver(option.value)}
              isDisabled={loading}
            />
          </div>

          <div className={styles.field}>
            <SubTitle title="Endpoints (comma separated)" />
            <Input
              value={fields.endpoints}
              onChange={(value) => setField("endpoints", value)}
              placeholder="host1:2379,host2:2379"
              disabled={loading}
            />
            <span className={styles.help}>An IPv6 address in brackets, e.g. [2001:db8::1]:2379</span>
          </div>

          <div className={styles.authentication}>
            <SubTitle title="Authentication" />

            {driver === "etcd" ? (
              <span className={styles.help}>
                An etcd DataStore uses TLS, with the certificate authority and its private key, and a client
                certificate. The proposal is the etcd that the chart of Kamaji deploys.
              </span>
            ) : (
              <div className={styles.field}>
                <Checkbox
                  label="Basic auth"
                  value={fields.useBasicAuth}
                  onChange={(value) => setField("useBasicAuth", value)}
                  disabled={loading}
                />
                <Checkbox
                  label="TLS"
                  value={fields.useTls}
                  onChange={(value) => setField("useTls", value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className={styles.advancedGrid}>
              <div className={styles.field}>
                <SubTitle title="Secrets Namespace" />
                <Input
                  value={secretsNamespace}
                  onChange={(value) => setSecretsNamespace(value)}
                  placeholder="e.g., kamaji-system"
                  disabled={loading}
                />
              </div>

              {withBasicAuth && (
                <>
                  {textField("Username and Password Secret", "authSecretName", `e.g., ${driver.toLowerCase()}-auth`)}
                  {textField("Key of the Username", "usernameKey", "e.g., username")}
                  {textField("Key of the Password", "passwordKey", "e.g., password")}
                </>
              )}

              {withTls && (
                <>
                  {textField("CA Secret", "caSecretName", "e.g., kamaji-etcd-ca")}
                  {textField("Key of the CA Certificate", "caCertificateKey", "e.g., ca.crt")}
                  {driver === "etcd" && textField("Key of the CA Private Key", "caPrivateKeyKey", "e.g., tls.key")}
                  {textField(
                    driver === "etcd" ? "Client Secret" : "Client Secret (optional)",
                    "clientSecretName",
                    "e.g., kamaji-etcd-client-certs",
                  )}
                  {textField("Key of the Client Certificate", "clientCertificateKey", "e.g., tls.crt")}
                  {textField("Key of the Client Private Key", "clientPrivateKeyKey", "e.g., tls.key")}
                </>
              )}
            </div>
          </div>
        </WizardStep>
      </Wizard>
    </Dialog>
  );
};
