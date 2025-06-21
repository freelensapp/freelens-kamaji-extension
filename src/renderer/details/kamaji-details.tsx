import { Renderer } from "@freelensapp/extensions";
import React from "react";
import { Kamaji } from "../k8s/kamaji";

import styleInline from "./kamaji-details.scss?inline";

const {
  Component: { DrawerItem, MarkdownViewer },
} = Renderer;

interface KamajiDetailsState {
  crds: Renderer.K8sApi.CustomResourceDefinition[];
}

export class KamajiDetails extends React.Component<
  Renderer.Component.KubeObjectDetailsProps<Kamaji>,
  KamajiDetailsState
> {
  public readonly state: Readonly<KamajiDetailsState> = {
    crds: [],
  };

  render() {
    const { object } = this.props;

    return (
      <>
        <style>{styleInline}</style>
        <div className="KamajiDetails">
          <DrawerItem name="Description">
            <MarkdownViewer markdown={object.spec.description ?? ""} />
          </DrawerItem>
        </div>
      </>
    );
  }
}
