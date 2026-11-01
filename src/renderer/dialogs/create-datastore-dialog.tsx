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
  defaultEndpoints,
  drivers,
  secretKeys,
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
  const [endpoints, setEndpoints] = useState(defaultEndpoints.etcd);
  const [secretsNamespace, setSecretsNamespace] = useState("kamaji-system");
  const [useTls, setUseTls] = useState(false);
  const [useBasicAuth, setUseBasicAuth] = useState(true);
  const [caSecretName, setCaSecretName] = useState("etcd-certs");
  const [clientSecretName, setClientSecretName] = useState("root-client-certs");
  const [authSecretName, setAuthSecretName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form: DataStoreForm = {
    name,
    driver,
    endpoints,
    secretsNamespace,
    useTls,
    useBasicAuth,
    caSecretName,
    clientSecretName,
    authSecretName,
  };
  const withTls = driver === "etcd" || useTls;

  // The endpoints follow the driver while they are the proposal of the previous one.
  const changeDriver = (next: Driver) => {
    if (endpoints === defaultEndpoints[driver]) {
      setEndpoints(defaultEndpoints[next]);
    }

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
              value={endpoints}
              onChange={(value) => setEndpoints(value)}
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
                certificate.
              </span>
            ) : (
              <div className={styles.field}>
                <Checkbox
                  label="Basic auth"
                  value={useBasicAuth}
                  onChange={(value) => setUseBasicAuth(value)}
                  disabled={loading}
                />
                <Checkbox label="TLS" value={useTls} onChange={(value) => setUseTls(value)} disabled={loading} />
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

              {driver !== "etcd" && useBasicAuth && (
                <div className={styles.field}>
                  <SubTitle
                    title={`Username and Password Secret (keys ${secretKeys.username}, ${secretKeys.password})`}
                  />
                  <Input
                    value={authSecretName}
                    onChange={(value) => setAuthSecretName(value)}
                    placeholder={`e.g., ${driver.toLowerCase()}-auth`}
                    disabled={loading}
                  />
                </div>
              )}

              {withTls && (
                <div className={styles.field}>
                  <SubTitle
                    title={
                      driver === "etcd"
                        ? `CA Secret (keys ${secretKeys.caCertificate}, ${secretKeys.caPrivateKey})`
                        : `CA Secret (key ${secretKeys.caCertificate})`
                    }
                  />
                  <Input
                    value={caSecretName}
                    onChange={(value) => setCaSecretName(value)}
                    placeholder="e.g., etcd-certs"
                    disabled={loading}
                  />
                </div>
              )}

              {withTls && (
                <div className={styles.field}>
                  <SubTitle
                    title={`Client Secret (keys ${secretKeys.clientCertificate}, ${secretKeys.clientPrivateKey}${driver === "etcd" ? "" : "; optional"})`}
                  />
                  <Input
                    value={clientSecretName}
                    onChange={(value) => setClientSecretName(value)}
                    placeholder="e.g., root-client-certs"
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>
        </WizardStep>
      </Wizard>
    </Dialog>
  );
};
