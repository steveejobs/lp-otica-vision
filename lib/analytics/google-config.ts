import "server-only";

export type GoogleAnalyticsServerConfig = {
  clientEmail: string;
  measurementApiSecret: string;
  measurementId: string;
  privateKey: string;
  propertyId: string;
};

function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getGoogleAnalyticsServerConfig(): GoogleAnalyticsServerConfig | null {
  const config = {
    clientEmail: value("GA_CLIENT_EMAIL"),
    measurementApiSecret: value("GA_MEASUREMENT_API_SECRET"),
    measurementId: value("NEXT_PUBLIC_GA_MEASUREMENT_ID"),
    privateKey: value("GA_PRIVATE_KEY").replace(/\\n/g, "\n"),
    propertyId: value("GA_PROPERTY_ID"),
  };
  if (!config.clientEmail || !config.privateKey || !config.propertyId) return null;
  return config;
}

function mask(valueToMask: string) {
  if (!valueToMask) return "Não configurado";
  if (valueToMask.length <= 6) return `${valueToMask.slice(0, 1)}•••`;
  return `${valueToMask.slice(0, 3)}••••${valueToMask.slice(-3)}`;
}

export function getGoogleAnalyticsIntegrationStatus() {
  const measurementId = value("NEXT_PUBLIC_GA_MEASUREMENT_ID");
  const propertyId = value("GA_PROPERTY_ID");
  const clientEmail = value("GA_CLIENT_EMAIL");
  const privateKey = value("GA_PRIVATE_KEY");
  const apiSecret = value("GA_MEASUREMENT_API_SECRET");
  return {
    complete: Boolean(measurementId && propertyId && clientEmail && privateKey),
    dataApiConfigured: Boolean(propertyId && clientEmail && privateKey),
    measurementId: mask(measurementId),
    measurementProtocolConfigured: Boolean(measurementId && apiSecret),
    propertyId: mask(propertyId),
    serviceAccountConfigured: Boolean(clientEmail && privateKey),
    serviceAccountEmail: clientEmail ? `${clientEmail.slice(0, 2)}•••@${clientEmail.split("@")[1] ?? "configurada"}` : "Não configurada",
  };
}
