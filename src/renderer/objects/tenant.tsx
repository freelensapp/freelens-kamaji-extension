export interface Tenant {
  getId(): string;
  getName(): string;
  getNamespace(): string;
  getStatus(): string;
  getPods(): string;
  getEndpoint(): string;
  getVersion(): string;
  getDatastore(): string;
  getAge(): string;
  isSelected: boolean;
}
