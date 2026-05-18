declare module "*.css" {}

declare module "pdfmake/build/pdfmake" {
  interface PdfMakeInstance {
    addVirtualFileSystem(vfs: Record<string, string>): void;
    createPdf(docDefinition: Record<string, unknown>): {
      download(fileName: string): void;
      getBuffer(): Promise<Buffer>;
    };
  }
  const pdfMake: PdfMakeInstance;
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
