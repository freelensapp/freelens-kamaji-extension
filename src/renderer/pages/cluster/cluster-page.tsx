import { Renderer } from "@freelensapp/extensions";
import styles from "./cluster-page.module.css";
import styleInline from "./cluster-page.module.css?inline";
import useClusterPageHook from "./cluster-page-hook";
import TenantHeader from "../../components/tenant-header";
import KamajiMenuItem from "../../components/kamaji-menu-item";


const {
  Component: {ItemListLayout}
} = Renderer;

export const ClusterPage = () => {
  const mainPageHook = useClusterPageHook();

  return (
    <div className={styles.container}>
      <style>{styleInline}</style>
      <ItemListLayout
        className={styles.kamajiCrds}
        renderHeaderTitle="Kamaji"
        // isConfigurable
        tableId={"kamaji-crd-table"}
        customizeHeader={[
          (props) => TenantHeader(props)
        ]}
        renderItemMenu={(item) => <KamajiMenuItem item={item}/>}
        searchFilters={mainPageHook.searchFilters}
        getItems={() => mainPageHook.tenantData}
        sortingCallbacks={{
          "name": (item) => item.getName(),
          "namespace": (item) => item.getNamespace(),
          "status": (item) => item.getStatus(),
          "pods": (item) => item.getPods(),
          "endpoint": (item) => item.getEndpoint(),
          "version": (item) => item.getVersion(),
          "datastore": (item) => item.getDatastore(),
          "age": (item) => item.getAge()
        }}
        store={
          {
            get isLoaded() {
              return mainPageHook.isLoaded;
            },
            failedLoading: mainPageHook.failedLoading,
            getTotalCount: () => mainPageHook.tenantData.length,
            isSelected: (item) => item && item.isSelected,
            toggleSelection: (item) => mainPageHook.toggleSelection(item),
            isSelectedAll: () => mainPageHook.isAllSelected(),
            toggleSelectionAll: () => mainPageHook.toggleSelectionAll(),
            pickOnlySelected: () => ["pickOnlySelected"],
            removeSelectedItems: async () => {
              // TODO: To implement
              console.log("removeSelectedItems");
            },
            removeItems: (selectedItems) => {
              // TODO: To implement
              console.log(selectedItems);
              console.log("removeItems");
              return Promise.resolve();
            },
            loadAll: (selectedNamespaces: readonly string[]) => {
              return mainPageHook.loadTenants(selectedNamespaces);
            }
          }
        }
        renderTableHeader={mainPageHook.tableHeaders}
        renderTableContents={mainPageHook.renderTableContents}
      />
    </div>
  );
};
