/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { useMemo, useState } from "react";
import { TenantControlPlane, type TenantControlPlaneApi } from "../k8s/tenant-control-plane-v1alpha1";
import styles from "./create-tenant-dialog.module.css";

const {
  Component: {
    Dialog,
    Input,
    Icon,
    NamespaceSelect,
    SubTitle,
    Wizard,
    WizardStep,
  },
} = Renderer;

export interface CreateTenantDialogProps {
  store: Renderer.K8sApi.KubeObjectStore<TenantControlPlane, TenantControlPlaneApi>;
  onClose?: () => void;
}

const generateDefaultTenantName = () => `tenant-${Math.floor(Math.random() * 9999) + 1}`;

export const CreateTenantDialog = ({ store, onClose }: CreateTenantDialogProps) => {
  const [name, setName] = useState(generateDefaultTenantName);
  const [namespace, setNamespace] = useState("default");
  const [dataStore, setDataStore] = useState("default");
  const [kubernetesVersion, setKubernetesVersion] = useState("1.33.0");
  const [replicas, setReplicas] = useState("1");
  const [serviceCidr, setServiceCidr] = useState("10.96.0.0/16");
  const [podCidr, setPodCidr] = useState("10.244.0.0/16");
  const [dnsServiceIp, setDnsServiceIp] = useState("10.96.0.10");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenantResourceFromForm = useMemo(() => {
    const normalizedVersion = kubernetesVersion.trim().startsWith("v")
      ? kubernetesVersion.trim()
      : `v${kubernetesVersion.trim()}`;
    const parsedReplicas = Number.parseInt(replicas.trim(), 10);
    const safeReplicas = Number.isInteger(parsedReplicas) && parsedReplicas > 0
      ? parsedReplicas
      : 1;

    return {
      apiVersion: "kamaji.clastix.io/v1alpha1",
      kind: "TenantControlPlane",
      metadata: {
        name: name.trim(),
        namespace: namespace.trim(),
      },
      spec: {
        dataStore: dataStore.trim() || "default",
        networkProfile: {
          port: 6443,
          serviceCidr: serviceCidr.trim(),
          podCidr: podCidr.trim(),
          dnsServiceIPs: [dnsServiceIp.trim()],
        },
        kubernetes: {
          version: normalizedVersion,
          kubelet: {
            cgroupfs: "systemd",
          },
        },
        controlPlane: {
          deployment: {
            replicas: safeReplicas,
          },
          service: {
            serviceType: "LoadBalancer",
          },
        },
        addons: {
          coreDNS: {},
          kubeProxy: {},
          konnectivity: {
            server: {
              port: 8132,
              resources: {},
            },
            agent: {},
          },
        },
      },
    };
  }, [dataStore, dnsServiceIp, kubernetesVersion, name, namespace, podCidr, replicas, serviceCidr]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Tenant name is required");
      return;
    }

    const parsedReplicas = Number.parseInt(replicas.trim(), 10);

    if (!Number.isInteger(parsedReplicas) || parsedReplicas < 1) {
      setError("Replicas must be a positive integer");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use KubeObjectStore's create method to POST the resource
      await store.create({ namespace: namespace.trim() }, tenantResourceFromForm as any);

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

  const reset = () => {
    setError(null);
    setLoading(false);
  };

  return (
    <Dialog
      isOpen={true}
      className={styles.createTenantDialog}
      onOpen={reset}
      close={onClose}
    >
      <Wizard header={<h5>Create Tenant Control Plane</h5>} done={onClose}>
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
              placeholder="e.g., tenant-1"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <SubTitle title="Namespace" />
            <NamespaceSelect
              id="tenant-namespace-input"
              themeName="light"
              value={namespace}
              onChange={(option) => setNamespace(option?.value ?? "default")}
            />
          </div>

          <div className={styles.field}>
            <SubTitle title="Datastore" />
            <Input
              value={dataStore}
              onChange={(value) => setDataStore(value)}
              placeholder="e.g., default"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <SubTitle title="Kubernetes Version" />
            <Input
              value={kubernetesVersion}
              onChange={(value) => setKubernetesVersion(value)}
              placeholder="e.g., v1.33.0"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <SubTitle title="Replicas" />
            <Input
              value={replicas}
              onChange={(value) => setReplicas(value)}
              placeholder="e.g., 1"
              disabled={loading}
            />
          </div>

          <details
            className={styles.advanced}
            open={isAdvancedOpen}
            onToggle={(event) => setIsAdvancedOpen((event.target as HTMLDetailsElement).open)}
          >
            <summary>Advanced</summary>

            <div className={styles.advancedGrid}>
              <div className={styles.field}>
                <SubTitle title="Service CIDR" />
                <Input
                  value={serviceCidr}
                  onChange={(value) => setServiceCidr(value)}
                  placeholder="e.g., 10.96.0.0/16"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Pod CIDR" />
                <Input
                  value={podCidr}
                  onChange={(value) => setPodCidr(value)}
                  placeholder="e.g., 10.244.0.0/16"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="DNS Service IP" />
                <Input
                  value={dnsServiceIp}
                  onChange={(value) => setDnsServiceIp(value)}
                  placeholder="e.g., 10.96.0.10"
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
