/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import kamajiPng from "./kamaji.png";
import styles from "./kamaji.module.css";
import styleInline from "./kamaji.module.css?inline";

export function KamajiIcon() {
  return (
    <>
      <style>{styleInline}</style>
      <img src={kamajiPng} alt="Kamaji" className={styles.kamajiIcon}/>
    </>
  );
}
