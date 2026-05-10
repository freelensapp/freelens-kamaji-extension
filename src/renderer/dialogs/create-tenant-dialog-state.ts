/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { makeAutoObservable, action } from "mobx";

class CreateTenantDialogState {
  isOpen = false;

  constructor() {
    makeAutoObservable(this);
  }

  @action
  open() {
    this.isOpen = true;
  }

  @action
  close() {
    this.isOpen = false;
  }

  @action
  toggle() {
    this.isOpen = !this.isOpen;
  }
}

export const createTenantDialogState = new CreateTenantDialogState();
