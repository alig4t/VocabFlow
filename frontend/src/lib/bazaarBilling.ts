import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { SubscriptionPlanId } from "../config/subscription";
import type {
  ClockSample,
  DeveloperGrant,
  VerifiedPurchase,
} from "./entitlement";

export interface BillingConfiguration {
  configured: boolean;
  developerConfigured: boolean;
  products: { plan: SubscriptionPlanId; sku: string }[];
}

export interface BazaarProduct {
  sku: string;
  price: string;
  title: string;
  description: string;
}

interface BazaarBillingPlugin {
  addListener(
    event: "networkChange",
    listener: (status: { online: boolean }) => void,
  ): Promise<PluginListenerHandle>;
  getConfiguration(): Promise<BillingConfiguration>;
  getEnvironment(): Promise<
    ClockSample & { online: boolean; bazaarInstalled: boolean }
  >;
  getSubscribedProducts(): Promise<{
    purchases: VerifiedPurchase[];
    clock: ClockSample;
  }>;
  getProducts(): Promise<{ products: BazaarProduct[] }>;
  subscribe(options: { sku: string }): Promise<void>;
  activateDeveloper(options: { code: string }): Promise<DeveloperGrant>;
}

export const BazaarBilling =
  registerPlugin<BazaarBillingPlugin>("BazaarBilling");
