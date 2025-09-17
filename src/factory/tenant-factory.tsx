import { Tenant } from "../renderer/objects/tenant";

export function createTenant(tenantRaw: TenantControlPlaneResponse): Tenant {
  return {
    getId: () => tenantRaw.metadata.name,
    getName: () => tenantRaw.metadata.name,
    getNamespace: () => tenantRaw.metadata.namespace,
    getStatus: () => tenantRaw.status.kubernetesResources.version.status,
    getPods: () => `${tenantRaw.status.kubernetesResources.deployment.replicas}/${tenantRaw.status.kubernetesResources.deployment.readyReplicas}`,
    getEndpoint: () => tenantRaw.status.addons.konnectivity.service.loadBalancer.ingress[0].ip,
    getVersion: () => tenantRaw.status.kubernetesResources.version.version,
    getDatastore: () => `${tenantRaw.status.storage.dataStoreName} ${tenantRaw.status.storage.driver}`,
    getAge: () => tenantRaw.status.kubernetesResources.deployment.lastUpdate,
    isSelected: false,
  };
}
