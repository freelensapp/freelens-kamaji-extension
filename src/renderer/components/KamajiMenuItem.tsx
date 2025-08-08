import {Renderer} from "@freelensapp/extensions";
import {randomUUID} from "node:crypto";
import {Tenant} from "../objects/Tenant";

const {
  Component: {MenuActions, MenuItem}
} = Renderer;

interface KamajiMenuItemProperties {
  item: Tenant;
}

// @ts-ignore
const KamajiMenuItem = ({ item }: KamajiMenuItemProperties) => {
  return (
    <MenuActions
      id={`menu-actions-test-${randomUUID()}`}
      // className={cssNames("KubeObjectMenu", className)}
      // onOpen={object ? () => this.emitOnContextMenuOpen(object) : undefined}
      // {...menuProps}
    >
      <MenuItem>
        <span>Download kubeconfig</span>
      </MenuItem>
    </MenuActions>
  )
}

export default KamajiMenuItem;
