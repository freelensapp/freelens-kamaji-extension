import { useEffect, useState } from "react";
import { exec} from "child_process";
import { Common, Renderer } from "@freelensapp/extensions";
import { Tenant } from "../../objects/tenant";
import { createTenant } from "../../../factory/tenant-factory";
import useNameSpaceHook from "../../hooks/nameSpaceHook";

const {
  Component: {WithTooltip},
} = Renderer;

const {App} = Common;

const useClusterPageHook = () => {
  const [tenantData, setTenantData] = useState<Tenant[]>([]);
  const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
  const [isLoaded, setIsLoaded] = useState(false);
  const [failedLoading, setFailedLoading] = useState(false);
  const nameSpaceHook = useNameSpaceHook();

  useEffect(() => {
    if (nameSpaceHook.selectedNamespace && "" !== nameSpaceHook.selectedNamespace) {
      loadTenants([nameSpaceHook.selectedNamespace])
        .then();
    }
  }, [nameSpaceHook.selectedNamespace]);

  const tableHeaders = [
    {title: "Name", className: "name", sortBy: "name", id: "name"},
    {title: "Namespace", className: "namespace", sortBy: "namespace", id: "namespace"},
    {title: "Status", className: "status", sortBy: "status", id: "status"},
    {title: "Pods", className: "pods", sortBy: "pods", id: "pods"},
    {title: "Endpoint", className: "endpoint", sortBy: "endpoint", id: "endpoint"},
    {title: "Version", className: "version", sortBy: "version", id: "version"},
    {title: "Datastore", className: "datastore", sortBy: "datastore", id: "datastore"},
    {title: "Age", className: "age", sortBy: "age", id: "age"},
  ]

  const searchFilters = [
    (tenant) => tenant.getId(),
    (tenant) => tenant.getName(),
    (tenant) => tenant.getNamespace(),
    (tenant) => tenant.getStatus(),
    (tenant) => tenant.getPods(),
    (tenant) => tenant.getEndpoint(),
    (tenant) => tenant.getVersion(),
    (tenant) => tenant.getDatastore(),
    (tenant) => tenant.getAge(),
  ]

  const loadTenants = (selectedNamespaces: readonly string[] = []): Promise<void> => {
    setFailedLoading(false);
    setIsLoaded(false);
    setTenantData([]);

    return new Promise((resolve, reject) => {
      let kubeCtlCommand = `${kubectlPath} get tenantcontrolplanes.kamaji.clastix.io -A -o json`;
      if (selectedNamespaces.length > 0) {
        const namespace = selectedNamespaces[0];
        if (namespace && "" !== namespace) {
          kubeCtlCommand = `${kubectlPath} get tenantcontrolplanes.kamaji.clastix.io -n ${namespace} -o json`;
        }
      }

      exec(kubeCtlCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Stderr: ${stderr}`);
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          console.log(parsed);
          const newTenantData = parsed.items.map(tenant => createTenant(tenant))
          setTenantData(newTenantData);
          setIsLoaded(true);
          resolve();
        } catch (e) {
          setFailedLoading(true);
          setIsLoaded(true);
          console.error("Error while parsing JSON:", e);
          reject();
        }
      });
    })
  }

  const renderTableContents = (item) => {
    return [
      <WithTooltip>{item.getName()}</WithTooltip>,
      <WithTooltip>{item.getNamespace()}</WithTooltip>,
      <WithTooltip>{item.getStatus()}</WithTooltip>,
      <WithTooltip>{item.getPods()}</WithTooltip>,
      <WithTooltip>{item.getEndpoint()}</WithTooltip>,
      <WithTooltip>{item.getVersion()}</WithTooltip>,
      <WithTooltip>{item.getDatastore()}</WithTooltip>,
      <WithTooltip>{item.getAge()}</WithTooltip>,
    ]
  }

  const toggleSelection = (item: Tenant) => {
    setTenantData(current =>
      current.map(tenant => {
        if (tenant.getId() === item.getId()) {
          return {...tenant, isSelected: !tenant.isSelected};
        } else {
          return tenant;
        }
      })
    );
  };

  const isAllSelected = () => {
    return tenantData.length > 0 && tenantData.every(tenant => tenant.isSelected);
  };

  const toggleSelectionAll = () => {
    const allSelected = tenantData.length > 0 && tenantData.every(tenant => tenant.isSelected);

    setTenantData(current =>
      current.map(tenant => ({
        ...tenant,
        isSelected: !allSelected,
      }))
    );
  };

  return {
    isLoaded,
    failedLoading,
    tenantData,
    tableHeaders,
    searchFilters,
    loadTenants,
    toggleSelection,
    isAllSelected,
    toggleSelectionAll,
    renderTableContents
  }
}

export default useClusterPageHook;
