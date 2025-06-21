import { Renderer } from "@freelensapp/extensions";
import React from "react";
import { Example } from "../k8s/example";

import styleInline from "./example-details.scss?inline";

const {
  Component: { DrawerItem, MarkdownViewer },
} = Renderer;

interface ExampleDetailsState {
  crds: Renderer.K8sApi.CustomResourceDefinition[];
}

export class ExampleDetails extends React.Component<
  Renderer.Component.KubeObjectDetailsProps<Example>,
  ExampleDetailsState
> {
  public readonly state: Readonly<ExampleDetailsState> = {
    crds: [],
  };

  render() {
    const { object } = this.props;

    return (
      <>
        <style>{styleInline}</style>
        <div className="ExampleDetails">
          <DrawerItem name="Description">
            <MarkdownViewer markdown={object.spec.description ?? ""} />
          </DrawerItem>
        </div>
      </>
    );
  }
}
