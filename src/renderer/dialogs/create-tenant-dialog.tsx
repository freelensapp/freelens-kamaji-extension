/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import React, { useEffect, useState } from "react";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { TenantControlPlane, type TenantControlPlaneApi } from "../k8s/tenant-control-plane-v1alpha1";
import styles from "./create-tenant-dialog.module.css";

const {
  Component: { Dialog, Input, Icon, NamespaceSelect, SubTitle, Wizard, WizardStep },
} = Renderer;

export interface CreateTenantDialogProps {
  store: Renderer.K8sApi.KubeObjectStore<TenantControlPlane, TenantControlPlaneApi>;
  onClose?: () => void;
}

type ProviderProfile = "generic" | "kind" | "aws" | "azure";

const PROFILE_ANNOTATIONS: Record<ProviderProfile, string> = {
  generic: "",
  kind: "",
  aws: [
    "service.beta.kubernetes.io/aws-load-balancer-backend-protocol=tcp",
    "service.beta.kubernetes.io/aws-load-balancer-scheme=internet-facing",
    "service.beta.kubernetes.io/aws-load-balancer-type=nlb",
  ].join("\n"),
  azure: "service.beta.kubernetes.io/azure-load-balancer-internal=true",
};

const parseCsvList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseKeyValueLines = (value: string): Record<string, string> => {
  const parsed: Record<string, string> = {};

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");

    if (equalsIndex === -1) {
      throw new Error(`Invalid key/value entry: \"${line}\". Use key=value format.`);
    }

    const key = line.slice(0, equalsIndex).trim();
    const entryValue = line.slice(equalsIndex + 1).trim();

    if (!key) {
      throw new Error(`Invalid key/value entry: \"${line}\". Key cannot be empty.`);
    }

    parsed[key] = entryValue;
  }

  return parsed;
};

const generateDefaultTenantName = () => `tenant-${Math.floor(Math.random() * 9999) + 1}`;

const textAreaStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 80,
  resize: "vertical",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  color: "#333",
  padding: "8px 10px",
  fontFamily: "var(--font-monospace, monospace)",
  fontSize: 12,
};

const toggleButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: "1px solid var(--color-border, #555)",
  borderRadius: 4,
  background: "transparent",
  color: "var(--textColorPrimary)",
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 10px",
  cursor: "pointer",
  userSelect: "none",
};

export const CreateTenantDialog = ({ store, onClose }: CreateTenantDialogProps) => {
  const [name, setName] = useState(generateDefaultTenantName);
  const [namespace, setNamespace] = useState("default");
  const [providerProfile, setProviderProfile] = useState<ProviderProfile>("generic");
  const [dataStore, setDataStore] = useState("default");
  const [kubernetesVersion, setKubernetesVersion] = useState("1.33.0");
  const [replicas, setReplicas] = useState("1");
  const [serviceType, setServiceType] = useState("LoadBalancer");
  const [apiPort, setApiPort] = useState("6443");
  const [konnectivityPort, setKonnectivityPort] = useState("8132");
  const [apiAddress, setApiAddress] = useState("");
  const [advertiseAddress, setAdvertiseAddress] = useState("");
  const [certSans, setCertSans] = useState("");
  const [admissionControllers, setAdmissionControllers] = useState("ResourceQuota,LimitRanger");
  const [serviceAnnotations, setServiceAnnotations] = useState("");
  const [serviceLabels, setServiceLabels] = useState("");
  const [nodeSelector, setNodeSelector] = useState("");
  const [serviceCidr, setServiceCidr] = useState("10.96.0.0/16");
  const [podCidr, setPodCidr] = useState("10.244.0.0/16");
  const [dnsServiceIp, setDnsServiceIp] = useState("10.96.0.10");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showYaml, setShowYaml] = useState(false);
  const [yamlContent, setYamlContent] = useState("");
  const [yamlParseError, setYamlParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setServiceAnnotations(PROFILE_ANNOTATIONS[providerProfile]);

    if (providerProfile === "kind") {
      setReplicas("1");
    }

    if (providerProfile === "azure") {
      setServiceType("LoadBalancer");
    }
  }, [providerProfile]);

  const buildTenantResourceFromForm = () => {
    const normalizedVersion = kubernetesVersion.trim().startsWith("v")
      ? kubernetesVersion.trim()
      : `v${kubernetesVersion.trim()}`;
    const parsedReplicas = Number.parseInt(replicas.trim(), 10);
    const safeReplicas = Number.isInteger(parsedReplicas) && parsedReplicas > 0 ? parsedReplicas : 1;
    const parsedApiPort = Number.parseInt(apiPort.trim(), 10);
    const parsedKonnectivityPort = Number.parseInt(konnectivityPort.trim(), 10);
    const normalizedApiPort = Number.isInteger(parsedApiPort) && parsedApiPort > 0 ? parsedApiPort : 6443;
    const normalizedKonnectivityPort =
      Number.isInteger(parsedKonnectivityPort) && parsedKonnectivityPort > 0 ? parsedKonnectivityPort : 8132;

    const normalizedServiceType = serviceType.trim() || "LoadBalancer";
    const normalizedDnsIps = parseCsvList(dnsServiceIp);
    const normalizedAdmissionControllers = parseCsvList(admissionControllers);
    const normalizedCertSans = parseCsvList(certSans);
    const parsedServiceAnnotations = parseKeyValueLines(serviceAnnotations);
    const parsedServiceLabels = parseKeyValueLines(serviceLabels);
    const parsedNodeSelector = parseKeyValueLines(nodeSelector);

    const networkProfile: Record<string, unknown> = {
      port: normalizedApiPort,
      serviceCidr: serviceCidr.trim(),
      podCidr: podCidr.trim(),
      dnsServiceIPs: normalizedDnsIps.length ? normalizedDnsIps : ["10.96.0.10"],
    };

    if (apiAddress.trim()) {
      networkProfile.address = apiAddress.trim();
    }

    if (advertiseAddress.trim()) {
      networkProfile.advertiseAddress = advertiseAddress.trim();
    }

    if (normalizedCertSans.length) {
      networkProfile.certSANs = normalizedCertSans;
    }

    const service: Record<string, unknown> = {
      serviceType: normalizedServiceType,
    };

    if (Object.keys(parsedServiceAnnotations).length || Object.keys(parsedServiceLabels).length) {
      service.additionalMetadata = {
        ...(Object.keys(parsedServiceAnnotations).length ? { annotations: parsedServiceAnnotations } : {}),
        ...(Object.keys(parsedServiceLabels).length ? { labels: parsedServiceLabels } : {}),
      };
    }

    const deployment: Record<string, unknown> = {
      replicas: safeReplicas,
    };

    if (Object.keys(parsedNodeSelector).length) {
      deployment.nodeSelector = parsedNodeSelector;
    }

    return {
      apiVersion: "kamaji.clastix.io/v1alpha1",
      kind: "TenantControlPlane",
      metadata: {
        name: name.trim(),
        namespace: namespace.trim(),
      },
      spec: {
        dataStore: dataStore.trim() || "default",
        networkProfile,
        kubernetes: {
          version: normalizedVersion,
          kubelet: {
            cgroupfs: "systemd",
          },
          ...(normalizedAdmissionControllers.length ? { admissionControllers: normalizedAdmissionControllers } : {}),
        },
        controlPlane: {
          deployment,
          service,
        },
        addons: {
          coreDNS: {},
          kubeProxy: {},
          konnectivity: {
            server: {
              port: normalizedKonnectivityPort,
              resources: {},
            },
            agent: {},
          },
        },
      },
    };
  };

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

    const parsedPort = Number.parseInt(apiPort.trim(), 10);

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setError("API port must be an integer between 1 and 65535");
      return;
    }

    const parsedKonnectivity = Number.parseInt(konnectivityPort.trim(), 10);

    if (!Number.isInteger(parsedKonnectivity) || parsedKonnectivity < 1 || parsedKonnectivity > 65535) {
      setError("Konnectivity port must be an integer between 1 and 65535");
      return;
    }

    let tenantResourceFromForm: Record<string, unknown>;

    if (showYaml) {
      try {
        tenantResourceFromForm = yamlParse(yamlContent) as Record<string, unknown>;
        if (!tenantResourceFromForm || typeof tenantResourceFromForm !== "object") {
          setError("YAML non valido: il contenuto non è un oggetto.");
          return;
        }
      } catch (parseError) {
        setYamlParseError(parseError instanceof Error ? parseError.message : String(parseError));
        setError("YAML non valido — correggi gli errori prima di procedere.");
        return;
      }
    } else {
      try {
        tenantResourceFromForm = buildTenantResourceFromForm();
      } catch (parseError) {
        const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        setError(parseErrorMsg);
        return;
      }
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
    setShowYaml(false);
    setYamlContent("");
    setYamlParseError(null);
  };

  const handleToggleYaml = () => {
    if (!showYaml) {
      try {
        const resource = buildTenantResourceFromForm();
        setYamlContent(yamlStringify(resource, { indent: 2 }));
        setYamlParseError(null);
      } catch (err) {
        setYamlContent("");
        setYamlParseError(err instanceof Error ? err.message : String(err));
      }
    }
    setShowYaml((prev) => !prev);
  };

  return (
    <Dialog isOpen={true} className={styles.createTenantDialog} onOpen={reset} close={onClose}>
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
            <SubTitle title="Profile" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(["generic", "kind", "aws", "azure"] as ProviderProfile[]).map((profile) => (
                <div
                  key={profile}
                  role="button"
                  tabIndex={loading ? -1 : 0}
                  onClick={() => !loading && setProviderProfile(profile)}
                  onKeyDown={(e) => {
                    if (!loading && (e.key === "Enter" || e.key === " ")) {
                      setProviderProfile(profile);
                    }
                  }}
                  style={{
                    display: "inline-block",
                    border: providerProfile === profile
                      ? "1px solid var(--colorInfo, #2196f3)"
                      : "1px solid var(--color-border, #555)",
                    borderRadius: 4,
                    background: providerProfile === profile
                      ? "rgba(33, 150, 243, 0.15)"
                      : "transparent",
                    color: "var(--textColorPrimary)",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 10px",
                    cursor: loading ? "default" : "pointer",
                    userSelect: "none",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {profile.toUpperCase()}
                </div>
              ))}
            </div>
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
            <Input value={replicas} onChange={(value) => setReplicas(value)} placeholder="e.g., 1" disabled={loading} />
          </div>

          <div className={styles.field}>
            <SubTitle title="Service Type" />
            <Input
              value={serviceType}
              onChange={(value) => setServiceType(value)}
              placeholder="LoadBalancer | ClusterIP | NodePort"
              disabled={loading}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsAdvancedOpen((prev) => !prev)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setIsAdvancedOpen((prev) => !prev); }}
              style={toggleButtonStyle}
            >
              <Icon material={isAdvancedOpen ? "expand_less" : "expand_more"} />
              Advanced
            </div>
          </div>

          {isAdvancedOpen && (
            <div className={styles.advancedGrid}>
              <div className={styles.field}>
                <SubTitle title="API Port" />
                <Input
                  value={apiPort}
                  onChange={(value) => setApiPort(value)}
                  placeholder="e.g., 6443"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Konnectivity Port" />
                <Input
                  value={konnectivityPort}
                  onChange={(value) => setKonnectivityPort(value)}
                  placeholder="e.g., 8132"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="API Address (optional)" />
                <Input
                  value={apiAddress}
                  onChange={(value) => setApiAddress(value)}
                  placeholder="e.g., 34.120.10.10"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Advertise Address (optional)" />
                <Input
                  value={advertiseAddress}
                  onChange={(value) => setAdvertiseAddress(value)}
                  placeholder="e.g., tcp.example.com"
                  disabled={loading}
                />
              </div>

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
                <SubTitle title="DNS Service IPs (comma separated)" />
                <Input
                  value={dnsServiceIp}
                  onChange={(value) => setDnsServiceIp(value)}
                  placeholder="e.g., 10.96.0.10,10.96.0.11"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Certificate SANs (comma separated)" />
                <Input
                  value={certSans}
                  onChange={(value) => setCertSans(value)}
                  placeholder="e.g., tenant.example.com,api.tenant.example.com"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Admission Controllers (comma separated)" />
                <Input
                  value={admissionControllers}
                  onChange={(value) => setAdmissionControllers(value)}
                  placeholder="e.g., ResourceQuota,LimitRanger"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Service Annotations (key=value, one per line)" />
                <textarea
                  style={textAreaStyle}
                  value={serviceAnnotations}
                  onChange={(event) => setServiceAnnotations(event.target.value)}
                  placeholder="service.beta.kubernetes.io/aws-load-balancer-type=nlb"
                  rows={4}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Service Labels (key=value, one per line)" />
                <textarea
                  style={textAreaStyle}
                  value={serviceLabels}
                  onChange={(event) => setServiceLabels(event.target.value)}
                  placeholder="tenant.clastix.io=tenant-1"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Deployment Node Selector (key=value, one per line)" />
                <textarea
                  style={textAreaStyle}
                  value={nodeSelector}
                  onChange={(event) => setNodeSelector(event.target.value)}
                  placeholder="topology.kubernetes.io/zone=eu-west-1a"
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={handleToggleYaml}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleToggleYaml(); }}
              style={toggleButtonStyle}
            >
              <Icon material={showYaml ? "expand_less" : "expand_more"} />
              {showYaml ? "Hide YAML" : "Edit YAML"}
            </div>
            {showYaml && (
              <div
                style={{
                  marginTop: 6,
                  display: "block",
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "var(--textColorSecondary, #64748b)",
                }}
              >
                The YAML below will be applied instead of the form fields.
              </div>
            )}
          </div>

          {showYaml && (
            <div className={styles.field}>
              {yamlParseError && (
                <div className={styles.error}>
                  <Icon material="error" />
                  <span>{yamlParseError}</span>
                </div>
              )}
              <textarea
                style={{ ...textAreaStyle, minHeight: 320, fontFamily: "var(--font-monospace, monospace)", fontSize: 12 }}
                value={yamlContent}
                onChange={(e) => {
                  setYamlContent(e.target.value);
                  setYamlParseError(null);
                }}
                spellCheck={false}
                disabled={loading}
              />
            </div>
          )}
        </WizardStep>
      </Wizard>
    </Dialog>
  );
};
