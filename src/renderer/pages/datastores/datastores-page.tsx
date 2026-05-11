import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useState } from "react";
import { CreateDatastoreDialog } from "../../dialogs/create-datastore-dialog";
import { KamajiIcon } from "../../icons/kamaji";
import { DataStore, type DataStoreApi } from "../../k8s/datastore-v1alpha1";
import styles from "./datastores-page.module.css";
import styleInline from "./datastores-page.module.css?inline";

const pageInlineStyles = `${styleInline}
.TabLayout > .Tabs {
  display: none;
}

.TabLayout > main {
  margin: 0;
}`;

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
} = Renderer;

const KubeObject = DataStore;
type KubeObject = DataStore;
type KubeObjectApi = DataStoreApi;

const getDriver = (object: KubeObject): string => (object as any).spec?.driver ?? "-";

const getUsedByCount = (object: KubeObject): number => (object as any).status?.usedBy?.length ?? 0;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  driver: (object: KubeObject) => getDriver(object),
  usedBy: (object: KubeObject) => getUsedByCount(object),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name", className: "name" },
  { title: "Driver", sortBy: "driver", className: "driver" },
  { title: "Used By", sortBy: "usedBy", className: "usedBy" },
  { title: "Age", sortBy: "age", className: "age" },
];

export const DatastoresPage = observer(() => {
  let store: Renderer.K8sApi.KubeObjectStore<KubeObject> | null = null;
  let missingKamaji = false;

  try {
    store = (KubeObject as any).getStore() as Renderer.K8sApi.KubeObjectStore<KubeObject>;
  } catch (error) {
    const errorMessage = String(error);

    if (errorMessage.includes("not registered") || errorMessage.includes("getStore")) {
      missingKamaji = true;
    } else {
      throw error;
    }
  }

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (missingKamaji || !store) {
    return (
      <div className={styles.container}>
        <style>{pageInlineStyles}</style>

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
        <style>{pageInlineStyles}</style>
        <KubeObjectListLayout<KubeObject, KubeObjectApi>
          className={styles.datastoresCrds}
          tableId={`${KubeObject.crd.plural}Table`}
          store={store}
          renderHeaderTitle={KubeObject.crd.title}
          addRemoveButtons={{
            onAdd: () => setIsCreateDialogOpen(true),
            addTooltip: "Create new Datastore",
          }}
          sortingCallbacks={sortingCallbacks}
          searchFilters={[
            (object: KubeObject) => [object.getName(), getDriver(object), String(getUsedByCount(object))],
          ]}
          renderTableHeader={renderTableHeader}
          renderTableContents={(object: KubeObject) => [
            <WithTooltip>{object.getName()}</WithTooltip>,
            <WithTooltip>{getDriver(object)}</WithTooltip>,
            <WithTooltip>{String(getUsedByCount(object))}</WithTooltip>,
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
