export interface Customer {
  'Nro de DNI': string;
  'Vendedor': string;
  'Cliente': string;
  'Fec. Vta.': string;
  'Facturado': string;
  'Registro': string;
  'Tramite en registro': string;
  'Fec.Patent': string;
  'patentado': string;
  'Preentregas': string;
  'Pre - entrega': string;
  [key: string]: string; // Index signature for dynamic property access
}
