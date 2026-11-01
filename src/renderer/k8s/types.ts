/**
 * The `crd` of a model of this extension: the plural, singular and short names of the CRD and the API versions the
 * host reads, and the title of the list page.
 */
export interface KamajiKubeObjectCRD {
  apiVersions: string[];
  plural: string;
  singular: string;
  shortNames: string[];
  title: string;
}
