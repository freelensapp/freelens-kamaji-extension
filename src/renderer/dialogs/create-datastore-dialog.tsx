/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { useState } from "react";
import styles from "./create-datastore-dialog.module.css";
import { buildDataStoreResource, type DataStoreForm, drivers, validateDataStoreForm } from "./datastore-resource";

import type { DataStore, DataStoreApi, Driver } from "../k8s/datastore-v1alpha1";

const {
  Component: { Dialog, Input, Icon, Select, SubTitle, Wizard, WizardStep },
} = Renderer;

const generateDefaultDatastoreName = () => `datastore-${Math.floor(Math.random() * 9999) + 1}`;

export interface CreateDatastoreDialogProps {
  store: Renderer.K8sApi.KubeObjectStore<DataStore, DataStoreApi>;
  onClose?: () => void;
}

export const CreateDatastoreDialog = ({ store, onClose }: CreateDatastoreDialogProps) => {
  const [name, setName] = useState(generateDefaultDatastoreName);
  const [driver, setDriver] = useState<Driver>("etcd");
  const [endpoints, setEndpoints] = useState(
    "etcd-0.etcd.kamaji-system.svc.cluster.local:2379,etcd-1.etcd.kamaji-system.svc.cluster.local:2379,etcd-2.etcd.kamaji-system.svc.cluster.local:2379",
  );
  const [secretsNamespace, setSecretsNamespace] = useState("kamaji-system");
  const [caSecretName, setCaSecretName] = useState("etcd-certs");
  const [clientSecretName, setClientSecretName] = useState("root-client-certs");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form: DataStoreForm = { name, driver, endpoints, secretsNamespace, caSecretName, clientSecretName };

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
              onChange={(option) => option && setDriver(option.value)}
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
            <span className={styles.help}>Example: etcd-0.etcd.kamaji-system.svc.cluster.local:2379</span>
          </div>

          <details
            className={styles.advanced}
            open={isAdvancedOpen}
            onToggle={(event) => setIsAdvancedOpen((event.target as HTMLDetailsElement).open)}
          >
            <summary>TLS secrets</summary>

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

              <div className={styles.field}>
                <SubTitle title="CA Secret Name" />
                <Input
                  value={caSecretName}
                  onChange={(value) => setCaSecretName(value)}
                  placeholder="e.g., etcd-certs"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Client Secret Name" />
                <Input
                  value={clientSecretName}
                  onChange={(value) => setClientSecretName(value)}
                  placeholder="e.g., root-client-certs"
                  disabled={loading}
                />
              </div>
            </div>
          </details>
        </WizardStep>
      </Wizard>
    </Dialog>
  );
};
