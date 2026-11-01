import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useState } from "react";
import { CreateTenantDialog } from "../../dialogs/create-tenant-dialog";
import { KamajiIcon } from "../../icons/kamaji";
import { TenantControlPlane, type TenantControlPlaneApi } from "../../k8s/tenant-control-plane-v1alpha1";
import styles from "./tenants-page.module.css";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, NamespaceSelectBadge, WithTooltip },
} = Renderer;

type TenantControlPlaneStore = Renderer.K8sApi.KubeObjectStore<TenantControlPlane, TenantControlPlaneApi>;

/** A value of a column, or `-` while Kamaji has not reported it. */
const orDash = (value: string | undefined) => value || "-";

const sortingCallbacks = {
  name: (object: TenantControlPlane) => object.getName(),
  namespace: (object: TenantControlPlane) => object.getNs(),
  status: (object: TenantControlPlane) => TenantControlPlane.getStatus(object),
  pods: (object: TenantControlPlane) => TenantControlPlane.getReadyReplicas(object),
  endpoint: (object: TenantControlPlane) => orDash(TenantControlPlane.getEndpoint(object)),
  version: (object: TenantControlPlane) => orDash(TenantControlPlane.getKubernetesVersion(object)),
  datastore: (object: TenantControlPlane) => orDash(TenantControlPlane.getDataStore(object)),
  age: (object: TenantControlPlane) => object.getCreationTimestamp(),
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

/**
 * The host's store of the Tenant Control Planes, or `undefined` while the cluster serves none: `getStore()` throws then,
 * with a message that says that the API or the store is not registered.
 */
function getTenantControlPlaneStore(): TenantControlPlaneStore | undefined {
  try {
    return TenantControlPlane.getStore<TenantControlPlane, TenantControlPlaneStore>();
  } catch (error) {
    if (String(error).includes("not registered")) {
      return undefined;
    }

    throw error;
  }
}

export const TenantsPage = observer(() => {
  const store = getTenantControlPlaneStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (!store) {
    return (
      <div className={styles.container}>
        <div className={styles.notInstalledState}>
          <div className={styles.notInstalledIcon}>
            <KamajiIcon />
          </div>

          <div className={styles.notInstalledContent}>
            <h2>Kamaji was not detected on this cluster</h2>
            <p>This extension can only be used when Kamaji CRDs are installed on the connected cluster.</p>
            <p>Install Kamaji on the cluster, then reopen this page to view and manage Tenant Control Planes.</p>

            <a className={styles.docsLink} href="https://kamaji.clastix.io" target="_blank" rel="noreferrer">
              Open Kamaji documentation
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <KubeObjectListLayout<TenantControlPlane, TenantControlPlaneApi>
          className={styles.kamajiCrds}
          tableId={`${TenantControlPlane.crd.plural}Table`}
          store={store}
          renderHeaderTitle={TenantControlPlane.crd.title}
          addRemoveButtons={{
            onAdd: () => setIsCreateDialogOpen(true),
            addTooltip: "Create new Tenant",
          }}
          sortingCallbacks={sortingCallbacks}
          searchFilters={[
            (object: TenantControlPlane) => [
              object.getName(),
              object.getNs() ?? "",
              TenantControlPlane.getStatus(object),
              TenantControlPlane.getReadyReplicas(object),
              orDash(TenantControlPlane.getEndpoint(object)),
              orDash(TenantControlPlane.getKubernetesVersion(object)),
              orDash(TenantControlPlane.getDataStore(object)),
            ],
          ]}
          renderTableHeader={renderTableHeader}
          renderTableContents={(object: TenantControlPlane) => [
            <WithTooltip>{object.getName()}</WithTooltip>,
            <NamespaceSelectBadge namespace={object.getNs() ?? ""} />,
            <WithTooltip>{TenantControlPlane.getStatus(object)}</WithTooltip>,
            <WithTooltip>{TenantControlPlane.getReadyReplicas(object)}</WithTooltip>,
            <WithTooltip>{orDash(TenantControlPlane.getEndpoint(object))}</WithTooltip>,
            <WithTooltip>{orDash(TenantControlPlane.getKubernetesVersion(object))}</WithTooltip>,
            <WithTooltip>{orDash(TenantControlPlane.getDataStore(object))}</WithTooltip>,
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
