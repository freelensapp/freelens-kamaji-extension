/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import React, { useEffect, useState } from "react";
import styles from "./create-tenant-dialog.module.css";
import {
  buildTenantResource,
  ipFamilyPolicies,
  type ProviderProfile,
  parseTenantResourceYaml,
  providerProfileFields,
  providerProfiles,
  serviceTypes,
  type TenantControlPlaneResource,
  type TenantForm,
  tenantResourceToYaml,
  validateTenantForm,
} from "./tenant-resource";

import type {
  IPFamilyPolicy,
  ServiceType,
  TenantControlPlane,
  TenantControlPlaneApi,
} from "../k8s/tenant-control-plane-v1alpha1";

const {
  Component: { Checkbox, Dialog, Input, Icon, NamespaceSelect, Select, SubTitle, Wizard, WizardStep },
} = Renderer;

export interface CreateTenantDialogProps {
  store: Renderer.K8sApi.KubeObjectStore<TenantControlPlane, TenantControlPlaneApi>;
  onClose?: () => void;
}

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
  const [kubernetesVersion, setKubernetesVersion] = useState("v1.36.3");
  const [replicas, setReplicas] = useState("1");
  const [serviceType, setServiceType] = useState<ServiceType>("LoadBalancer");
  const [apiPort, setApiPort] = useState("6443");
  const [konnectivityPort, setKonnectivityPort] = useState("8132");
  const [apiAddress, setApiAddress] = useState("");
  const [advertiseAddress, setAdvertiseAddress] = useState("");
  const [certSans, setCertSans] = useState("");
  const [admissionControllers, setAdmissionControllers] = useState("ResourceQuota,LimitRanger");
  const [serviceAnnotations, setServiceAnnotations] = useState("");
  const [serviceLabels, setServiceLabels] = useState("");
  const [nodeSelector, setNodeSelector] = useState("");
  const [serviceCidrs, setServiceCidrs] = useState("10.96.0.0/16");
  const [podCidrs, setPodCidrs] = useState("10.244.0.0/16");
  const [dnsServiceIps, setDnsServiceIps] = useState("");
  const [ipFamilyPolicy, setIpFamilyPolicy] = useState<IPFamilyPolicy | "">("");
  const [ipFamilies, setIpFamilies] = useState("");
  const [allocateLoadBalancerNodePorts, setAllocateLoadBalancerNodePorts] = useState<"" | "true" | "false">("");
  const [headless, setHeadless] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showYaml, setShowYaml] = useState(false);
  const [yamlContent, setYamlContent] = useState("");
  const [yamlParseError, setYamlParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fields = providerProfileFields(providerProfile);

    setServiceAnnotations(fields.serviceAnnotations ?? "");

    if (fields.replicas) {
      setReplicas(fields.replicas);
    }

    if (fields.serviceType) {
      setServiceType(fields.serviceType);
    }
  }, [providerProfile]);

  const form: TenantForm = {
    name,
    namespace,
    dataStore,
    kubernetesVersion,
    replicas,
    serviceType,
    apiPort,
    konnectivityPort,
    apiAddress,
    advertiseAddress,
    certSans,
    admissionControllers,
    serviceAnnotations,
    serviceLabels,
    nodeSelector,
    serviceCidrs,
    podCidrs,
    dnsServiceIps,
    ipFamilyPolicy,
    ipFamilies,
    allocateLoadBalancerNodePorts,
    headless,
  };

  const handleCreate = async () => {
    let resource: TenantControlPlaneResource;

    if (showYaml) {
      try {
        resource = parseTenantResourceYaml(yamlContent, namespace);
      } catch (parseError) {
        setYamlParseError(parseError instanceof Error ? parseError.message : String(parseError));
        setError("Invalid YAML: fix the errors before creating the tenant.");
        return;
      }
    } else {
      const invalid = validateTenantForm(form);

      if (invalid) {
        setError(invalid);
        return;
      }

      try {
        resource = buildTenantResource(form);
      } catch (buildError) {
        setError(buildError instanceof Error ? buildError.message : String(buildError));
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await store.create({ name: resource.metadata.name, namespace: resource.metadata.namespace }, resource);
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
        setYamlContent(tenantResourceToYaml(buildTenantResource(form)));
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
              {providerProfiles.map((profile) => (
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
                    border:
                      providerProfile === profile
                        ? "1px solid var(--colorInfo, #2196f3)"
                        : "1px solid var(--color-border, #555)",
                    borderRadius: 4,
                    background: providerProfile === profile ? "rgba(33, 150, 243, 0.15)" : "transparent",
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
              placeholder="e.g., v1.37.0"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <SubTitle title="Replicas" />
            <Input value={replicas} onChange={(value) => setReplicas(value)} placeholder="e.g., 1" disabled={loading} />
          </div>

          <div className={styles.field}>
            <SubTitle title="Service Type" />
            <Select
              id="tenant-service-type-input"
              themeName="light"
              value={serviceType}
              options={serviceTypes.map((type) => ({ value: type, label: type }))}
              onChange={(option) => option && setServiceType(option.value)}
              isDisabled={loading}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsAdvancedOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setIsAdvancedOpen((prev) => !prev);
              }}
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
                <SubTitle title="Service CIDRs (one, or two for dual-stack)" />
                <Input
                  value={serviceCidrs}
                  onChange={(value) => setServiceCidrs(value)}
                  placeholder="e.g., 10.96.0.0/16,fd00:10:96::/112"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="Pod CIDRs (one, or two for dual-stack)" />
                <Input
                  value={podCidrs}
                  onChange={(value) => setPodCidrs(value)}
                  placeholder="e.g., 10.244.0.0/16,fd00:10:244::/56"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="DNS Service IPs (empty to compute them from the Service CIDRs)" />
                <Input
                  value={dnsServiceIps}
                  onChange={(value) => setDnsServiceIps(value)}
                  placeholder="e.g., 10.96.0.10"
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="IP Family Policy of the Service" />
                <Select
                  id="tenant-ip-family-policy-input"
                  themeName="light"
                  value={ipFamilyPolicy}
                  options={[
                    { value: "" as const, label: "Default of the cluster" },
                    ...ipFamilyPolicies.map((policy) => ({ value: policy, label: policy })),
                  ]}
                  onChange={(option) => option && setIpFamilyPolicy(option.value)}
                  isDisabled={loading}
                />
              </div>

              <div className={styles.field}>
                <SubTitle title="IP Families of the Service (the primary first)" />
                <Input
                  value={ipFamilies}
                  onChange={(value) => setIpFamilies(value)}
                  placeholder="e.g., IPv4,IPv6"
                  disabled={loading}
                />
                <span className={styles.help}>
                  The policy and the families are those of the Service of the control plane in this cluster, which must
                  serve them; leave them empty for its default. The CIDRs above are those of the tenant cluster.
                </span>
              </div>

              {serviceType === "LoadBalancer" && (
                <div className={styles.field}>
                  <SubTitle title="Allocate Node Ports for the Load Balancer" />
                  <Select
                    id="tenant-allocate-node-ports-input"
                    themeName="light"
                    value={allocateLoadBalancerNodePorts}
                    options={[
                      { value: "" as const, label: "Default of Kubernetes (yes)" },
                      { value: "true" as const, label: "Yes" },
                      { value: "false" as const, label: "No" },
                    ]}
                    onChange={(option) => option && setAllocateLoadBalancerNodePorts(option.value)}
                    isDisabled={loading}
                  />
                </div>
              )}

              {serviceType === "ClusterIP" && (
                <div className={styles.field}>
                  <Checkbox
                    label="Headless Service (needs the API address; it cannot change later)"
                    value={headless}
                    onChange={(value) => setHeadless(value)}
                    disabled={loading}
                  />
                </div>
              )}

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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleToggleYaml();
              }}
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
                style={{
                  ...textAreaStyle,
                  minHeight: 320,
                  fontFamily: "var(--font-monospace, monospace)",
                  fontSize: 12,
                }}
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
