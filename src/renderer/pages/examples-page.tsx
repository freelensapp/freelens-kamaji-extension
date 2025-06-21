import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import { Example, ExampleStore } from "../k8s/example";

import styleInline from "./examples-page.scss?inline";

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
export class ExamplesPage extends React.Component<{ extension: Renderer.LensExtension }> {
  render() {
    const exampleApi = Renderer.K8sApi.apiManager.getApi(Example.apiBase);
    const exampleStore = exampleApi && (Renderer.K8sApi.apiManager.getStore(exampleApi) as ExampleStore);
    return (
      exampleStore && (
        <>
          <style>{styleInline}</style>
          <KubeObjectListLayout
            tableId="exampleTable"
            className="Examples"
            store={exampleStore}
            sortingCallbacks={{
              [sortBy.name]: (example: Example) => example.getName(),
              [sortBy.namespace]: (example: Example) => example.getNs(),
              [sortBy.title]: (example: Example) => example.spec.title,
              [sortBy.age]: (example: Example) => example.getCreationTimestamp(),
            }}
            searchFilters={[(example: Example) => example.getSearchFields()]}
            renderHeaderTitle="Examples"
            renderTableHeader={[
              { title: "Name", className: "name", sortBy: sortBy.name },
              { title: "Namespace", className: "namespace", sortBy: sortBy.namespace },
              { title: "Title", className: "title", sortBy: sortBy.title },
              { title: "Age", className: "age", sortBy: sortBy.age },
            ]}
            renderTableContents={(example: Example) => {
              const tooltipId = `example-${example.getId()}`;

              return [
                <>
                  <span id={`${tooltipId}-name`}>{example.getName()}</span>
                  <Tooltip targetId={`${tooltipId}-name`}>{example.getName()}</Tooltip>
                </>,
                <>
                  <span id={`${tooltipId}-namespace`}>
                    <Link
                      key="link"
                      to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: example.getNs() }))}
                      onClick={stopPropagation}
                    >
                      {example.getNs()}
                    </Link>
                  </span>
                  <Tooltip targetId={`${tooltipId}-namespace`}>{example.getNs()}</Tooltip>
                </>,
                <>
                  <span id={`${tooltipId}-title`}>{example.spec.title}</span>
                  <Tooltip targetId={`${tooltipId}-title`}>{example.spec.title}</Tooltip>
                </>,
                <KubeObjectAge object={example} key="age" />,
              ];
            }}
          />
        </>
      )
    );
  }
}
