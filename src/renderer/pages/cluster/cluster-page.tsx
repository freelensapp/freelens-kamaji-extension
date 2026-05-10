import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useState } from "react";
import { CreateTenantDialog } from "../../dialogs/create-tenant-dialog";
import { TenantControlPlane, type TenantControlPlaneApi } from "../../k8s/tenant-control-plane-v1alpha1";
import styles from "./cluster-page.module.css";
import styleInline from "./cluster-page.module.css?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, NamespaceSelectBadge, WithTooltip },
} = Renderer;

const KubeObject = TenantControlPlane;
type KubeObject = TenantControlPlane;
type KubeObjectApi = TenantControlPlaneApi;

const getStatusText = (object: KubeObject): string =>
  (object as any).status?.kubernetesResources?.version?.status ?? "Unknown";

const getPodReplicasText = (object: KubeObject): string => {
  const deployment = (object as any).status?.kubernetesResources?.deployment;
  const total = deployment?.replicas ?? 0;
  const ready = deployment?.availableReplicas ?? deployment?.readyReplicas ?? 0;

  return `${ready}/${total}`;
};

const getEndpoint = (object: KubeObject): string =>
  (object as any).status?.controlPlaneEndpoint ?? "-";

const getKubernetesVersion = (object: KubeObject): string =>
  (object as any).spec?.kubernetes?.version ??
  (object as any).status?.kubernetesResources?.version?.version ??
  "-";

const getDatastoreText = (object: KubeObject): string => {
  const dataStoreName = (object as any).status?.storage?.dataStoreName;
  const driver = (object as any).status?.storage?.driver;

  if (!dataStoreName && !driver) {
    return "-";
  }

  return [dataStoreName, driver].filter(Boolean).join(" ");
};

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  status: (object: KubeObject) => getStatusText(object),
  pods: (object: KubeObject) => getPodReplicasText(object),
  endpoint: (object: KubeObject) => getEndpoint(object),
  version: (object: KubeObject) => getKubernetesVersion(object),
  datastore: (object: KubeObject) => getDatastoreText(object),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name", className: "name" },
  { title: "Namespace", sortBy: "namespace", className: "namespace" },
  { title: "Status", sortBy: "status", className: "status" },
  { title: "Pods", sortBy: "pods", className: "pods" },
  { title: "Endpoint", sortBy: "endpoint", className: "endpoint" },
  { title: "Version", sortBy: "version", className: "version" },
  { title: "Datastore", sortBy: "datastore", className: "datastore" },
  { title: "Age", sortBy: "age", className: "age" },
];

export const ClusterPage = observer(() => {
  const store = (KubeObject as any).getStore() as Renderer.K8sApi.KubeObjectStore<KubeObject>;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <div className={styles.container}>
        <style>{styleInline}</style>
        <KubeObjectListLayout<KubeObject, KubeObjectApi>
          className={styles.kamajiCrds}
          tableId={`${KubeObject.crd.plural}Table`}
          store={store}
          renderHeaderTitle={KubeObject.crd.title}
          addRemoveButtons={{
            onAdd: () => setIsCreateDialogOpen(true),
            addTooltip: "Create new Tenant",
          }}
          sortingCallbacks={sortingCallbacks}
          searchFilters={[
            (object: KubeObject) => [
              object.getName(),
              object.getNs(),
              getStatusText(object),
              getPodReplicasText(object),
              getEndpoint(object),
              getKubernetesVersion(object),
              getDatastoreText(object),
            ],
          ]}
          renderTableHeader={renderTableHeader}
          renderTableContents={(object: KubeObject) => [
            <WithTooltip>{object.getName()}</WithTooltip>,
            <NamespaceSelectBadge namespace={object.getNs() ?? ""} />,
            <WithTooltip>{getStatusText(object)}</WithTooltip>,
            <WithTooltip>{getPodReplicasText(object)}</WithTooltip>,
            <WithTooltip>{getEndpoint(object)}</WithTooltip>,
            <WithTooltip>{getKubernetesVersion(object)}</WithTooltip>,
            <WithTooltip>{getDatastoreText(object)}</WithTooltip>,
            <KubeObjectAge object={object} key="age" />,
          ]}
        />
      </div>
      {isCreateDialogOpen && (
        <CreateTenantDialog
          store={store}
          onClose={() => {
            setIsCreateDialogOpen(false);
            store.loadAll();
          }}
        />
      )}
    </>
  );
});
