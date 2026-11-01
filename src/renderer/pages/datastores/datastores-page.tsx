import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useState } from "react";
import { CreateDatastoreDialog } from "../../dialogs/create-datastore-dialog";
import { KamajiIcon } from "../../icons/kamaji";
import { DataStore, type DataStoreApi } from "../../k8s/datastore-v1alpha1";
import styles from "./datastores-page.module.css";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
} = Renderer;

type DataStoreStore = Renderer.K8sApi.KubeObjectStore<DataStore, DataStoreApi>;

/** Whether Kamaji validated the DataStore, or `-` before it reports. */
const readyText = (object: DataStore) => {
  const ready = DataStore.isReady(object);

  return ready === undefined ? "-" : ready ? "Yes" : "No";
};

const sortingCallbacks = {
  name: (object: DataStore) => object.getName(),
  driver: (object: DataStore) => object.spec.driver,
  endpoints: (object: DataStore) => object.spec.endpoints.join(", "),
  ready: (object: DataStore) => readyText(object),
  usedBy: (object: DataStore) => DataStore.getUsedBy(object).length,
  age: (object: DataStore) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name", className: "name" },
  { title: "Driver", sortBy: "driver", className: "driver" },
  { title: "Endpoints", sortBy: "endpoints", className: "endpoints" },
  { title: "Ready", sortBy: "ready", className: "ready" },
  { title: "Used By", sortBy: "usedBy", className: "usedBy" },
  { title: "Age", sortBy: "age", className: "age" },
];

/**
 * The host's store of the DataStores, or `undefined` while the cluster serves none: `getStore()` throws then, with a
 * message that says that the API or the store is not registered.
 */
function getDataStoreStore(): DataStoreStore | undefined {
  try {
    return DataStore.getStore<DataStore, DataStoreStore>();
  } catch (error) {
    if (String(error).includes("not registered")) {
      return undefined;
    }

    throw error;
  }
}

export const DatastoresPage = observer(() => {
  const store = getDataStoreStore();
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
            <p>Install Kamaji on the cluster, then reopen this page to view and manage Datastores.</p>

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
        <KubeObjectListLayout<DataStore, DataStoreApi>
          className={styles.datastoresCrds}
          tableId={`${DataStore.crd.plural}Table`}
          store={store}
          renderHeaderTitle={DataStore.crd.title}
          addRemoveButtons={{
            onAdd: () => setIsCreateDialogOpen(true),
            addTooltip: "Create new Datastore",
          }}
          sortingCallbacks={sortingCallbacks}
          searchFilters={[
            (object: DataStore) => [
              object.getName(),
              object.spec.driver,
              ...object.spec.endpoints,
              ...DataStore.getUsedBy(object),
            ],
          ]}
          renderTableHeader={renderTableHeader}
          renderTableContents={(object: DataStore) => [
            <WithTooltip>{object.getName()}</WithTooltip>,
            <WithTooltip>{object.spec.driver}</WithTooltip>,
            <WithTooltip>{object.spec.endpoints.join(", ")}</WithTooltip>,
            <WithTooltip>{readyText(object)}</WithTooltip>,
            <WithTooltip>{String(DataStore.getUsedBy(object).length)}</WithTooltip>,
            <KubeObjectAge object={object} key="age" />,
          ]}
        />
      </div>
      {isCreateDialogOpen && (
        <CreateDatastoreDialog
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
