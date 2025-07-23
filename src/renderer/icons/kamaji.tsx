/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import kamajiPng from "./kamaji.png";
import styleInline from "./kamaji.scss?inline";

export function KamajiIcon() {
  return (
    <>
      <style>{styleInline}</style>
      <img src={kamajiPng} alt="Kamaji" className="kamaji-plugin-icon"/>
    </>
  );
}
