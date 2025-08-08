import {useEffect, useState} from "react";
import {exec} from "child_process";
import {Common, Renderer} from "@freelensapp/extensions";
import {Tenant} from "../../objects/Tenant";
import {createTenant} from "../../../factory/TenantFactory";

const {
  Component: {WithTooltip},
  K8sApi: {namespaceStore}
} = Renderer;

const {App} = Common;

const useMainPageHook = () => {
  const [tenantData, setTenantData] = useState<Tenant[]>([]);
  const kubectlPath = App.Preferences.getKubectlPath() || "kubectl";
  const [isLoaded, setIsLoaded] = useState(false);
  const [failedLoading, setFailedLoading] = useState(false);

  useEffect(() => {
    // TODO: Get current namespace
    console.log(`namespace: ${namespaceStore}`);
    console.log(`namespace: ${Renderer.K8sApi.namespaceStore}`);
    // console.log(namespaceStore.selectNamespaces());
  }, [namespaceStore]);

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

  const loadTenants = (selectedNamespaces: readonly string[] = []) : Promise<void> => {
    return new Promise((resolve, reject) => {
      let kubeCtlCommand = `${kubectlPath} get tenantcontrolplanes.kamaji.clastix.io -A -o json`;
      if (selectedNamespaces.length > 0) {
        const namespace = selectedNamespaces[0];
        kubeCtlCommand = `${kubectlPath} get tenantcontrolplanes.kamaji.clastix.io -n ${namespace} -o json`;
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

        setFailedLoading(false);
        setIsLoaded(false);
        try {
          const parsed = JSON.parse(stdout);
          const newTenantData = parsed.items.map(tenant => createTenant(tenant))
          setTenantData(newTenantData);
          setIsLoaded(true);
          resolve();
        } catch (e) {
          setFailedLoading(true);
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

export default useMainPageHook;
