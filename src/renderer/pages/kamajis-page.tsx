import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import { Kamaji, KamajiStore } from "../k8s/kamaji";

import styleInline from "./kamajis-page.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, Tooltip },
  K8sApi: { namespacesApi },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

enum sortBy {
  name = "name",
  namespace = "namespace",
  title = "title",
  age = "age",
}

@observer
export class KamajisPage extends React.Component<{ extension: Renderer.LensExtension }> {
  render() {
    const exampleApi = Renderer.K8sApi.apiManager.getApi(Kamaji.apiBase);
    const exampleStore = exampleApi && (Renderer.K8sApi.apiManager.getStore(exampleApi) as KamajiStore);
    return (
      exampleStore && (
        <>
          <style>{styleInline}</style>
          <KubeObjectListLayout
            tableId="exampleTable"
            className="Kamajis"
            store={exampleStore}
            sortingCallbacks={{
              [sortBy.name]: (kamaji: Kamaji) => kamaji.getName(),
              [sortBy.namespace]: (kamaji: Kamaji) => kamaji.getNs(),
              [sortBy.title]: (kamaji: Kamaji) => kamaji.spec.title,
              [sortBy.age]: (kamaji: Kamaji) => kamaji.getCreationTimestamp(),
            }}
            searchFilters={[(kamaji: Kamaji) => kamaji.getSearchFields()]}
            renderHeaderTitle="Kamajis"
            renderTableHeader={[
              { title: "Name", className: "name", sortBy: sortBy.name },
              { title: "Namespace", className: "namespace", sortBy: sortBy.namespace },
              { title: "Title", className: "title", sortBy: sortBy.title },
              { title: "Age", className: "age", sortBy: sortBy.age },
            ]}
            renderTableContents={(kamaji: Kamaji) => {
              const tooltipId = `kamaji-${kamaji.getId()}`;

              return [
                <>
                  <span id={`${tooltipId}-name`}>{kamaji.getName()}</span>
                  <Tooltip targetId={`${tooltipId}-name`}>{kamaji.getName()}</Tooltip>
                </>,
                <>
                  <span id={`${tooltipId}-namespace`}>
                    <Link
                      key="link"
                      to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: kamaji.getNs() }))}
                      onClick={stopPropagation}
                    >
                      {kamaji.getNs()}
                    </Link>
                  </span>
                  <Tooltip targetId={`${tooltipId}-namespace`}>{kamaji.getNs()}</Tooltip>
                </>,
                <>
                  <span id={`${tooltipId}-title`}>{kamaji.spec.title}</span>
                  <Tooltip targetId={`${tooltipId}-title`}>{kamaji.spec.title}</Tooltip>
                </>,
                <KubeObjectAge object={kamaji} key="age" />,
              ];
            }}
          />
        </>
      )
    );
  }
}
