// types.ts
export interface File {
  id: string;
  name: string;
  type: string;
}

export interface Folder {
  id: string;
  name: string;
  files: File[];
}