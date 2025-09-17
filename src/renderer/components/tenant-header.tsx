import React from "react";
import {Renderer} from "@freelensapp/extensions";

const {
  Component: { NamespaceSelectFilter }
} = Renderer;

interface TenantHeaderProperties {
  title?: React.ReactNode;
  searchProps?: any;
  filters?: React.ReactNode;
  info?: React.ReactNode;
}

const TenantHeader = ({ filters, searchProps, info, ...headerPlaceHolders }: TenantHeaderProperties) => {
  return {
    filters: (
      <>
        {filters}
        <NamespaceSelectFilter id="kube-object-list-layout-namespace-select-input" />
      </>
    ),
    searchProps: {
      ...searchProps,
      placeholder: `Search tenants...`,
    },
    info: <>{info}</>,
    ...headerPlaceHolders,
  };
};

export default TenantHeader;
