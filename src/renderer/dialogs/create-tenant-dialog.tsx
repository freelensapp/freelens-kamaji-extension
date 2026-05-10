/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { useState } from "react";
import { TenantControlPlane, type TenantControlPlaneApi } from "../k8s/tenant-control-plane-v1alpha1";
import styles from "./create-tenant-dialog.module.css";

const {
  Component: {
    ConfirmDialog,
    DrawerItem,
    Input,
    Icon,
  },
} = Renderer;

export interface CreateTenantDialogProps {
  store: Renderer.K8sApi.KubeObjectStore<TenantControlPlane, TenantControlPlaneApi>;
  onClose?: () => void;
}

export const CreateTenantDialog = ({ store, onClose }: CreateTenantDialogProps) => {
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [kubernetesVersion, setKubernetesVersion] = useState("1.27.0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Tenant name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build minimal tenant resource
      const tenantResource = {
        apiVersion: "kamaji.clastix.io/v1alpha1",
        kind: "TenantControlPlane",
        metadata: {
          name: name.trim(),
          namespace: namespace.trim(),
        },
        spec: {
          kubernetes: {
            version: kubernetesVersion.trim(),
          },
          // Minimal control plane config - API server requires at least this
          controlPlane: {
            deployment: {
              replicas: 1,
            },
          },
          // Minimal data store config
          dataStore: {
            name: "default", // This must exist in the cluster
          },
        },
      };

      // Use KubeObjectStore's create method to POST the resource
      await store.create({ namespace: namespace.trim() }, tenantResource as any);

      // Close dialog on success
      onClose?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to create tenant: ${errorMsg}`);
      console.error("Create tenant error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      isOpen={true}
      title="Create Tenant Control Plane"
      okButtonText="Create"
      cancelButtonText="Cancel"
      onOk={handleCreate}
      onCancel={onClose}
      disableOkButton={loading || !name.trim()}
    >
      <div className={styles.container}>
        {error && (
          <div className={styles.error}>
            <Icon material="error" />
            <span>{error}</span>
          </div>
        )}

        <DrawerItem name="Name" className={styles.field}>
          <Input
            autoFocus
            value={name}
            onChange={(value) => setName(value)}
            placeholder="e.g., tenant-1"
            disabled={loading}
          />
        </DrawerItem>

        <DrawerItem name="Namespace" className={styles.field}>
          <Input
            value={namespace}
            onChange={(value) => setNamespace(value)}
            placeholder="e.g., default"
            disabled={loading}
          />
        </DrawerItem>

        <DrawerItem name="Kubernetes Version" className={styles.field}>
          <Input
            value={kubernetesVersion}
            onChange={(value) => setKubernetesVersion(value)}
            placeholder="e.g., 1.27.0"
            disabled={loading}
          />
        </DrawerItem>

        {loading && (
          <div className={styles.loading}>
            <Icon material="hourglass_empty" className={styles.spinner} />
            <span>Creating tenant...</span>
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
};
