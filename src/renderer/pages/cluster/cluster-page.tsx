import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { TenantControlPlane, type TenantControlPlaneApi } from "../../k8s/tenant-control-plane-v1alpha1";
import styles from "./cluster-page.module.css";
import styleInline from "./cluster-page.module.css?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, NamespaceSelectBadge, WithTooltip },
} = Renderer;

const KubeObject = TenantControlPlane;
type KubeObject = TenantControlPlane;
type KubeObjectApi = TenantControlPlaneApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  status: (object: KubeObject) => object.getStatusText(),
  pods: (object: KubeObject) => object.getPodReplicasText(),
  endpoint: (object: KubeObject) => object.getEndpoint(),
  version: (object: KubeObject) => object.getKubernetesVersion(),
  datastore: (object: KubeObject) => object.getDatastoreText(),
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
  const store = (KubeObject as any).getStore?.();

  return (
    <div className={styles.container}>
      <style>{styleInline}</style>
      <KubeObjectListLayout<KubeObject, KubeObjectApi>
        className={styles.kamajiCrds}
        tableId={`${KubeObject.crd.plural}Table`}
        store={store}
        renderHeaderTitle={KubeObject.crd.title}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[
          (object: KubeObject) => [
            object.getName(),
            object.getNs(),
            object.getStatusText(),
            object.getPodReplicasText(),
            object.getEndpoint(),
            object.getKubernetesVersion(),
            object.getDatastoreText(),
          ],
        ]}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: KubeObject) => [
          <WithTooltip>{object.getName()}</WithTooltip>,
          <NamespaceSelectBadge namespace={object.getNs() ?? ""} />,
          <WithTooltip>{object.getStatusText()}</WithTooltip>,
          <WithTooltip>{object.getPodReplicasText()}</WithTooltip>,
          <WithTooltip>{object.getEndpoint()}</WithTooltip>,
          <WithTooltip>{object.getKubernetesVersion()}</WithTooltip>,
          <WithTooltip>{object.getDatastoreText()}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </div>
  );
});
